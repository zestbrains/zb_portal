"""
Leave Records Deduplication Script
===================================

Fixes legacy duplicate rows in the `leave_records` collection.

Patterns handled
----------------
  PATTERN A : Same employee + same date with PL 0.5 + CL 0.5
              -> Merge into a single leave_type='PL/2 & CL/2' record (1.0 day)

  PATTERN B : Same employee + same date with PL 0.5 + CL 1.0  (impossible 1.5d)
              -> DELETE the PL 0.5 row, KEEP the CL 1.0 row

  PATTERN C : Same employee + same date with 2+ identical full-day rows
              (PL+PL or CL+CL with same leave_days >= 1.0). True accidental
              double-submit.
              -> KEEP the earliest (by created_at), DELETE the rest

Anything else (mixed half/full combos that don't match the patterns above) is
REPORTED ONLY — never auto-modified.

Usage
-----
  Dry-run (default, never writes):
      python leave_dedupe.py
      python leave_dedupe.py --employee_id 23

  Apply (writes changes; auto-creates a backup if --backup not provided):
      python leave_dedupe.py --employee_id 23 --apply
      python leave_dedupe.py --apply --backup ./full_backup.json

  Show unrecognised duplicate groups in full (manual review):
      python leave_dedupe.py --list-unrecognised

Safety
------
* Dry-run by default. --apply is required to write.
* On --apply for ALL employees (no --employee_id) the script asks you to type
  YES to confirm.
* If --apply is used without --backup, a timestamped backup file is created
  automatically next to the script.
* Pending leave applications are skipped entirely (they live in
  /leave-applications, not in leave_records).
* Reads MONGO_URL + DB_NAME from backend/.env (relative to this script's
  directory) or from environment variables.
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
SCRIPT_DIR = Path(__file__).resolve().parent


def now_ist_iso() -> str:
    return datetime.now(IST).isoformat()


def load_db():
    """Find backend/.env relative to the script, then load DB."""
    candidates = [
        SCRIPT_DIR / "backend" / ".env",
        SCRIPT_DIR.parent / "backend" / ".env",
        SCRIPT_DIR / ".env",
        Path.cwd() / "backend" / ".env",
        Path.cwd() / ".env",
    ]
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path)
            break

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME must be set in the environment "
              "or in backend/.env (searched relative to script).")
        sys.exit(1)
    print(f"Connecting to DB '{db_name}' ...")
    client = MongoClient(mongo_url, serverSelectionTimeoutMS=8000)
    # Force a connection check early so we fail fast
    client.admin.command("ping")
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
    """Return (pattern, action_plan) for a duplicate group, or (None, None)."""
    if len(group) < 2:
        return None, None
    # Skip if any row is a pending leave-application sync artefact
    if any((r.get("status") or "").lower() == "pending" for r in group):
        return None, None

    pl_half = [r for r in group if r.get("leave_type") == "PL" and r.get("leave_days") == 0.5]
    cl_half = [r for r in group if r.get("leave_type") == "CL" and r.get("leave_days") == 0.5]
    cl_full = [r for r in group if r.get("leave_type") == "CL" and r.get("leave_days") == 1.0]

    # A: exactly one PL 0.5 + one CL 0.5
    if len(group) == 2 and len(pl_half) == 1 and len(cl_half) == 1:
        return "A", {"delete": [pl_half[0], cl_half[0]], "insert_merged": True}

    # B: PL 0.5 + CL 1.0
    if len(group) == 2 and len(pl_half) == 1 and len(cl_full) == 1:
        return "B", {"delete": [pl_half[0]], "insert_merged": False}

    # C: all same type, all same full-day amount
    types = {r.get("leave_type") for r in group}
    days = {r.get("leave_days") for r in group}
    if len(types) == 1 and len(days) == 1 and next(iter(days)) >= 1.0:
        sorted_rows = sorted(group, key=lambda r: r.get("created_at") or "")
        return "C", {"delete": sorted_rows[1:], "insert_merged": False}

    return None, None


def build_merged_record(rows_to_replace):
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


def write_backup(actions, path):
    snapshot = []
    for a in actions:
        for r in a["plan"]["delete"]:
            snapshot.append({
                "action": "delete",
                "pattern": a["pattern"],
                "employee_id": a["key"][0],
                "date": a["key"][1],
                "row": r,
            })
    with open(path, "w") as f:
        json.dump(snapshot, f, default=str, indent=2)
    return len(snapshot)


def main():
    ap = argparse.ArgumentParser(description="Dedupe leave_records (legacy fix).")
    ap.add_argument("--apply", action="store_true",
                    help="Actually write changes (default is dry-run).")
    ap.add_argument("--employee_id", default=None,
                    help="Restrict to a single employee_id (e.g. '23').")
    ap.add_argument("--backup", default=None,
                    help="Path for JSON backup. If omitted with --apply, an "
                         "auto-timestamped file is created next to the script.")
    ap.add_argument("--list-unrecognised", action="store_true",
                    help="Print full details of unrecognised duplicate groups.")
    ap.add_argument("--yes", action="store_true",
                    help="Skip the YES confirmation prompt when applying.")
    args = ap.parse_args()

    db = load_db()
    records = fetch_records(db, args.employee_id)
    if not records:
        print("No leave_records found for the given filter.")
        return

    groups = group_by_emp_date(records)
    actions = []
    unrecognised = []
    for key, group in groups.items():
        if len(group) < 2:
            continue
        pattern, plan = classify(group)
        if pattern is None:
            unrecognised.append((key, group))
            continue
        actions.append({"pattern": pattern, "key": key, "plan": plan, "group": group})

    mode = "APPLY" if args.apply else "DRY RUN"
    print(f"\n=== Leave records dedupe ({mode}) ===")
    print(f"Database: {db.name}    Filter employee_id={args.employee_id or 'ALL'}")
    print(f"Records scanned: {len(records)}")
    dup_groups = sum(1 for g in groups.values() if len(g) > 1)
    print(f"Duplicate (employee,date) groups: {dup_groups}")
    print(f"Auto-fixable: {len(actions)}   Unrecognised: {len(unrecognised)}\n")

    pattern_counts = defaultdict(int)
    for a in actions:
        pattern_counts[a["pattern"]] += 1
    for p in sorted(pattern_counts):
        labels = {"A": "PL 0.5 + CL 0.5 -> merge",
                  "B": "PL 0.5 + CL 1.0 -> drop PL 0.5",
                  "C": "identical full-day -> keep earliest"}
        print(f"  Pattern {p}: {pattern_counts[p]} groups  ({labels.get(p, '')})")

    if actions:
        print("\n--- Auto-fix plan ---")
        for a in actions:
            emp, date = a["key"]
            del_ids = ", ".join(r.get("id", "")[:8] for r in a["plan"]["delete"])
            note = "+ insert PL/2 & CL/2 1.0d" if a["plan"]["insert_merged"] else ""
            print(f"  [{a['pattern']}] emp={emp} date={date} -> delete ids=[{del_ids}] {note}")

    if unrecognised:
        print(f"\n--- {len(unrecognised)} unrecognised group(s) (manual review, NOT touched) ---")
        for (emp, date), group in unrecognised:
            details = ", ".join(
                f"{r.get('leave_type')}({r.get('leave_days')}d,{r.get('status')})"
                for r in group
            )
            if args.list_unrecognised:
                print(f"  emp={emp} date={date}: {details}")
                for r in group:
                    print(f"      id={r.get('id','-')[:8]} type={r.get('leave_type')} "
                          f"days={r.get('leave_days')} status={r.get('status')} "
                          f"created={(r.get('created_at') or '-')[:19]} "
                          f"reason={(r.get('reason') or '')[:40]}")
            else:
                print(f"  emp={emp} date={date}: {details}")
        if not args.list_unrecognised:
            print("  (re-run with --list-unrecognised to see full details of each row)")

    if not args.apply:
        print("\nDry run complete. Re-run with --apply to commit changes.")
        return

    if not actions:
        print("\nNothing to apply.")
        return

    # Safety prompt for full-DB apply
    if not args.employee_id and not args.yes:
        print(f"\nYou are about to modify {len(actions)} groups across ALL employees "
              f"in DB '{db.name}'.")
        ans = input("Type YES (uppercase) to proceed: ").strip()
        if ans != "YES":
            print("Aborted by user.")
            return

    # Auto-backup if not specified
    backup_path = args.backup
    if not backup_path:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        suffix = f"_emp{args.employee_id}" if args.employee_id else "_all"
        backup_path = str(SCRIPT_DIR / f"leave_backup{suffix}_{ts}.json")
    rows_saved = write_backup(actions, backup_path)
    print(f"\nBackup written: {backup_path}  ({rows_saved} rows)")

    deleted = 0
    inserted = 0
    for a in actions:
        delete_ids = [r.get("id") for r in a["plan"]["delete"] if r.get("id")]
        if delete_ids:
            res = db.leave_records.delete_many({"id": {"$in": delete_ids}})
            deleted += res.deleted_count
        if a["plan"]["insert_merged"]:
            db.leave_records.insert_one(build_merged_record(a["plan"]["delete"]))
            inserted += 1

    print(f"DONE. Deleted {deleted} rows. Inserted {inserted} merged rows.")

    # Re-scan to confirm
    records_after = fetch_records(db, args.employee_id)
    groups_after = group_by_emp_date(records_after)
    remaining = sum(1 for g in groups_after.values() if len(g) > 1)
    auto_remaining = sum(1 for g in groups_after.values()
                         if len(g) > 1 and classify(g)[0] is not None)
    print(f"Verification: {len(records_after)} records, {remaining} duplicate "
          f"groups remain ({auto_remaining} auto-fixable, "
          f"{remaining - auto_remaining} unrecognised).")
    if auto_remaining == 0:
        print("All auto-fixable duplicates resolved.")
    print(f"\nTo restore from this backup if needed:\n"
          f"  python -c \"import json,os;from pymongo import MongoClient;"
          f"from dotenv import load_dotenv;load_dotenv('backend/.env');"
          f"db=MongoClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']];"
          f"rows=[r['row'] for r in json.load(open('{backup_path}'))];"
          f"db.leave_records.insert_many(rows);print('Restored',len(rows))\"")


if __name__ == "__main__":
    main()
