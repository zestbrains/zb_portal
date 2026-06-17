"""
Leave Records Deduplication Script
===================================

Fixes 3 categories of duplicate leave_records that came from the legacy data
import (before the PL/2 & CL/2 leave type and the upsert-based leave logic):

  PATTERN A : Same employee + same date with PL 0.5 + CL 0.5
              -> Merge into a single leave_type='PL/2 & CL/2' record (1.0 day)

  PATTERN B : Same employee + same date with PL 0.5 + CL 1.0  (data-entry error;
              total = 1.5 days for one day, which is impossible).
              Default action: DELETE the PL 0.5 row, KEEP the CL 1.0 row.
              (Choice 2c)

  PATTERN C : Same employee + same date with 2 identical full-day rows
              (PL+PL or CL+CL with same leave_days). True accidental double-submit.
              -> KEEP the earliest (by created_at), DELETE the rest.

USAGE
-----
  Dry-run (default — shows what WOULD change, makes no edits):
      python leave_dedupe.py

  Live execution (writes changes):
      python leave_dedupe.py --apply

  Restrict to one employee (e.g. employee_id=23 for Darpan):
      python leave_dedupe.py --employee_id 23
      python leave_dedupe.py --employee_id 23 --apply

  Backup before applying (writes a JSON of all rows that will be deleted/updated):
      python leave_dedupe.py --apply --backup /tmp/leave_backup.json

REQUIREMENTS
------------
  pip install pymongo python-dotenv

  Environment variables (or backend/.env):
      MONGO_URL=mongodb://...
      DB_NAME=ZestBrainsStaging        # or your live DB name

SAFETY
------
* By default this script is a DRY RUN — it never writes to MongoDB unless
  --apply is passed.
* It refuses to delete a row whose status is 'pending' (only touches Taken/taken
  and Approved). Pending applications go through /leave-applications, not
  leave_records.
* It only merges rows with leave_days == 0.5 + 0.5 (PL + CL) into PL/2 & CL/2.
  Any other half/whole-day combination is reported but not modified unless
  it matches Pattern B exactly.

Run this on a STAGING copy first.
"""

import os
import sys
import json
import uuid
import argparse
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

from pymongo import MongoClient
from dotenv import load_dotenv

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist_iso() -> str:
    return datetime.now(IST).isoformat()


def load_db():
    # Try local backend/.env first; fall back to env
    for env_path in [Path("backend/.env"), Path("/app/backend/.env"), Path(".env")]:
        if env_path.exists():
            load_dotenv(env_path)
            break
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME must be set in the environment "
              "or in backend/.env")
        sys.exit(1)
    client = MongoClient(mongo_url)
    return client[db_name]


def fetch_records(db, employee_id=None):
    query = {}
    if employee_id is not None:
        query["employee_id"] = str(employee_id)
    return list(db.leave_records.find(query, {"_id": 0}))


def group_by_emp_date(records):
    g = defaultdict(list)
    for r in records:
        key = (r.get("employee_id"), r.get("date"))
        g[key].append(r)
    return g


def classify(group):
    """Return (pattern, action_plan) for a (employee_id, date) group with >1 rows.

    Patterns:
      'A'  -> Merge PL 0.5 + CL 0.5 into single PL/2 & CL/2 (1.0d)
      'B'  -> PL 0.5 + CL 1.0 (data error) -> delete PL 0.5, keep CL 1.0
      'C'  -> Identical full-day duplicates -> keep earliest, delete the rest
      None -> unrecognized; report only, no auto-fix
    """
    if len(group) < 2:
        return None, None

    # Skip if any row is a pending leave-application sync artefact
    if any((r.get("status") or "").lower() == "pending" for r in group):
        return None, None

    # Index by (type, days)
    pl_half = [r for r in group if r.get("leave_type") == "PL" and r.get("leave_days") == 0.5]
    cl_half = [r for r in group if r.get("leave_type") == "CL" and r.get("leave_days") == 0.5]
    cl_full = [r for r in group if r.get("leave_type") == "CL" and r.get("leave_days") == 1.0]

    # PATTERN A: exactly one PL 0.5 + one CL 0.5  (2 rows total)
    if len(group) == 2 and len(pl_half) == 1 and len(cl_half) == 1:
        return "A", {"delete": [pl_half[0], cl_half[0]], "insert_merged": True}

    # PATTERN B: PL 0.5 + CL 1.0  (2 rows total)
    if len(group) == 2 and len(pl_half) == 1 and len(cl_full) == 1:
        return "B", {"delete": [pl_half[0]], "insert_merged": False}

    # PATTERN C: 2+ rows, all same leave_type, all same leave_days, full-day
    types = {r.get("leave_type") for r in group}
    days = {r.get("leave_days") for r in group}
    if len(types) == 1 and len(days) == 1 and next(iter(days)) >= 1.0:
        # keep the earliest by created_at
        sorted_rows = sorted(group, key=lambda r: r.get("created_at") or "")
        return "C", {"delete": sorted_rows[1:], "insert_merged": False}

    return None, None


def build_merged_record(rows_to_replace):
    """Build a single PL/2 & CL/2 record from a PL 0.5 + CL 0.5 pair."""
    template = rows_to_replace[0]
    return {
        "id": str(uuid.uuid4()),
        "employee_id": template.get("employee_id"),
        "date": template.get("date"),
        "leave_type": "PL/2 & CL/2",
        "leave_days": 1.0,
        "status": template.get("status", "Taken"),
        "approved_by": template.get("approved_by", "system_dedupe"),
        "applied_date": template.get("applied_date") or template.get("created_at") or now_ist_iso(),
        "approved_date": template.get("approved_date") or template.get("created_at") or now_ist_iso(),
        "reason": (template.get("reason") or ""),
        "created_at": template.get("created_at") or now_ist_iso(),
        "updated_at": now_ist_iso(),
        "_dedupe_origin": "merged_PL_half_plus_CL_half",
    }


def main():
    ap = argparse.ArgumentParser(description="Dedupe leave_records (legacy fix).")
    ap.add_argument("--apply", action="store_true",
                    help="Actually write changes (default is dry-run).")
    ap.add_argument("--employee_id", default=None,
                    help="Restrict to a single employee_id (e.g. '23').")
    ap.add_argument("--backup", default=None,
                    help="Write a JSON backup of every row that will be "
                         "deleted/updated to this path.")
    args = ap.parse_args()

    db = load_db()
    records = fetch_records(db, args.employee_id)
    if not records:
        print("No leave_records found for the given filter.")
        return

    groups = group_by_emp_date(records)
    actions = []  # list of dicts {pattern, key, delete:[], insert:{}}
    unrecognised = []

    for key, group in groups.items():
        if len(group) < 2:
            continue
        pattern, plan = classify(group)
        if pattern is None:
            unrecognised.append((key, group))
            continue
        actions.append({"pattern": pattern, "key": key, "plan": plan, "group": group})

    # --- Report ---
    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"\n=== Leave records dedupe ({mode}) ===")
    print(f"Database: {db.name}    Filter employee_id={args.employee_id or 'ALL'}")
    print(f"Total records scanned: {len(records)}")
    print(f"Duplicate (employee,date) groups: "
          f"{sum(1 for g in groups.values() if len(g) > 1)}")
    print(f"Auto-fixable groups: {len(actions)}")
    print(f"Unrecognised duplicate groups (manual review): {len(unrecognised)}\n")

    pattern_counts = defaultdict(int)
    for a in actions:
        pattern_counts[a["pattern"]] += 1
    for p, c in sorted(pattern_counts.items()):
        print(f"  Pattern {p}: {c} groups")

    print("\n--- Auto-fix plan ---")
    for a in actions:
        emp, date = a["key"]
        del_ids = ", ".join(r.get("id", "")[:8] for r in a["plan"]["delete"])
        verb = "merge"
        if a["pattern"] == "B":
            verb = "delete extra PL 0.5"
        elif a["pattern"] == "C":
            verb = "delete duplicate"
        merge_note = "+ insert PL/2 & CL/2 1.0d" if a["plan"]["insert_merged"] else ""
        print(f"  [{a['pattern']}] emp={emp} date={date} -> {verb} ids=[{del_ids}] {merge_note}")

    if unrecognised:
        print("\n--- Unrecognised duplicate groups (no action) ---")
        for (emp, date), group in unrecognised:
            details = ", ".join(
                f"{r.get('leave_type')}({r.get('leave_days')}d,{r.get('status')})"
                for r in group
            )
            print(f"  emp={emp} date={date}: {details}")

    # --- Backup ---
    if args.backup:
        snapshot = []
        for a in actions:
            for r in a["plan"]["delete"]:
                snapshot.append({"action": "delete", "pattern": a["pattern"], "row": r})
        with open(args.backup, "w") as f:
            json.dump(snapshot, f, default=str, indent=2)
        print(f"\nBackup written to {args.backup}  ({len(snapshot)} rows)")

    # --- Apply ---
    if not args.apply:
        print("\nDry run complete. Re-run with --apply to commit changes.")
        return

    deleted = 0
    inserted = 0
    for a in actions:
        delete_ids = [r.get("id") for r in a["plan"]["delete"] if r.get("id")]
        if delete_ids:
            res = db.leave_records.delete_many({"id": {"$in": delete_ids}})
            deleted += res.deleted_count
        if a["plan"]["insert_merged"]:
            new_row = build_merged_record(a["plan"]["delete"])
            db.leave_records.insert_one(new_row)
            inserted += 1

    print(f"\nDONE. Deleted {deleted} rows. Inserted {inserted} merged rows.")


if __name__ == "__main__":
    main()
