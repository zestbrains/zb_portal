"""
Bank statement PDF parser.
Tuned for ICICI 'Detailed Statement' format which has the column headers:
  Sl No | Tran Id | Value Date | Transaction Date |
  Transaction Posted Date | Cheque no / Ref No | Transaction Remarks |
  Withdrawal (Dr) | Deposit (Cr) | Balance

We dynamically locate the 'Transaction Date' and 'Deposit (Cr)' columns by
header text, so minor layout drift between ICICI statements still works.

Each deposit row is enriched with the INR -> USD FX rate on the transaction
date (Frankfurter API) so the caller can create invoices in USD.
"""
from __future__ import annotations

import re
import urllib.request
import urllib.parse
import json
import logging
from datetime import datetime
from typing import List, Dict

import pdfplumber

logger = logging.getLogger(__name__)

# In-process FX rate cache: { (date_iso, from_ccy, to_ccy): rate_float }
_FX_CACHE: Dict[tuple, float] = {}
FX_API_BASE = "https://api.frankfurter.dev/v1"


def _fetch_fx_rate(date_iso: str, from_ccy: str = "INR", to_ccy: str = "USD") -> float | None:
    """Return rate so that  amount_to = amount_from * rate.
    Falls back to nearest available business day. Returns None if unavailable."""
    if not date_iso:
        return None
    key = (date_iso, from_ccy, to_ccy)
    if key in _FX_CACHE:
        return _FX_CACHE[key]
    try:
        url = f"{FX_API_BASE}/{date_iso}?from={from_ccy}&to={to_ccy}"
        req = urllib.request.Request(url, headers={"User-Agent": "Zestbrains-HR/1.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        rate = float(data.get("rates", {}).get(to_ccy))
        _FX_CACHE[key] = rate
        return rate
    except Exception as e:
        logger.warning("FX fetch failed for %s %s->%s: %s", date_iso, from_ccy, to_ccy, e)
        return None


def _normalise(cell: str) -> str:
    if cell is None:
        return ""
    return re.sub(r"\s+", " ", str(cell)).strip()


def _is_transaction_date_header(text: str) -> bool:
    t = text.lower()
    # Must say "transaction date" but NOT "posted"
    return "transaction" in t and "date" in t and "posted" not in t


def _is_deposit_header(text: str) -> bool:
    t = text.lower().replace(" ", "")
    # ICICI: "Deposit(Cr)" / "Deposit (Cr)"
    return "deposit" in t and ("cr" in t or "credit" in t)


def _is_withdrawal_header(text: str) -> bool:
    t = text.lower().replace(" ", "")
    # ICICI: "Withdrawal(Dr)" / "Withdrawal (Dr)"
    return "withdraw" in t and ("dr" in t or "debit" in t)


def _is_remarks_header(text: str) -> bool:
    t = text.lower()
    return ("remark" in t) or ("narration" in t) or ("description" in t)


def _find_header_indices(row: List[str], amount_kind: str = "deposit") -> tuple[int, int, int] | None:
    """Return (transaction_date_idx, amount_idx, remarks_idx) if header row.
    amount_kind: 'deposit' | 'withdrawal'
    remarks_idx may be -1 if not found."""
    tx_idx = -1
    amount_idx = -1
    rem_idx = -1
    amount_pred = _is_deposit_header if amount_kind == "deposit" else _is_withdrawal_header
    for i, cell in enumerate(row or []):
        norm = _normalise(cell)
        if tx_idx == -1 and _is_transaction_date_header(norm):
            tx_idx = i
        elif amount_idx == -1 and amount_pred(norm):
            amount_idx = i
        elif rem_idx == -1 and _is_remarks_header(norm):
            rem_idx = i
    if tx_idx >= 0 and amount_idx >= 0:
        return tx_idx, amount_idx, rem_idx
    return None


def _parse_date(raw: str) -> str:
    """Convert '01/May/2026' or '01/05/2026' to ISO 'YYYY-MM-DD'. Returns '' on failure."""
    if not raw:
        return ""
    raw = _normalise(raw).split(" ")[0]  # strip any time suffix
    for fmt in ("%d/%b/%Y", "%d/%m/%Y", "%d-%b-%Y", "%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return raw  # return as-is if unparseable


def _parse_amount(raw: str) -> float | None:
    """Parse amounts that may contain newlines (PDF line-wrap), commas, ₹ sign, spaces."""
    if not raw:
        return None
    # Strip ALL whitespace (incl. newlines) so "2,34,705.\n17" -> "234705.17"
    cleaned = re.sub(r"\s+", "", str(raw)).replace(",", "").replace("\u20b9", "")
    if not cleaned or cleaned in ("-", "."):
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_icici_statement(pdf_bytes: bytes, mode: str = "deposit") -> Dict[str, object]:
    """
    Extract rows from an ICICI Detailed Statement PDF.

    Parameters
    ----------
    mode : 'deposit' (default) extracts credit/deposit rows;
           'withdrawal' extracts debit/withdrawal rows. The amount field is
           always returned as `amount` (and `deposit_amount` for legacy).
    """
    rows: List[Dict[str, object]] = []
    warnings: List[str] = []
    header_idx: tuple[int, int, int] | None = None

    import io
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page_no, page in enumerate(pdf.pages, start=1):
            try:
                tables = page.extract_tables() or []
            except Exception as e:
                warnings.append(f"Page {page_no}: extract_tables error: {e}")
                continue

            for table in tables:
                if not table:
                    continue
                local_header = None
                start_data_idx = 0
                for ri, row in enumerate(table):
                    found = _find_header_indices(row, amount_kind=mode)
                    if found:
                        local_header = found
                        start_data_idx = ri + 1
                        break

                indices = local_header or header_idx
                if not indices:
                    continue
                if local_header:
                    header_idx = local_header

                tx_idx, amt_idx, rem_idx = indices
                max_idx = max(tx_idx, amt_idx, rem_idx if rem_idx >= 0 else 0)

                for row in table[start_data_idx:]:
                    if not row or len(row) <= max_idx:
                        continue
                    tx_raw = _normalise(row[tx_idx])
                    amt_raw = _normalise(row[amt_idx])
                    if not tx_raw and not amt_raw:
                        continue
                    amount = _parse_amount(amt_raw)
                    if amount is None or amount == 0:
                        continue  # Skip rows with no value in this column
                    date_iso = _parse_date(tx_raw)
                    remarks = ""
                    if rem_idx >= 0 and rem_idx < len(row):
                        remarks = _normalise(row[rem_idx])
                    # FX rate only needed for deposit/invoice mode
                    fx_rate = _fetch_fx_rate(date_iso, "INR", "USD") if (date_iso and mode == "deposit") else None
                    usd_amount = round(amount * fx_rate, 2) if fx_rate else None
                    rows.append({
                        "transaction_date": date_iso,
                        "inr_amount": amount,
                        "amount": amount,
                        "deposit_amount": amount,  # backward-compat
                        "fx_rate": fx_rate,
                        "usd_amount": usd_amount,
                        "transaction_remarks": remarks,
                    })

    if header_idx is None:
        column_label = "Deposit (Cr)" if mode == "deposit" else "Withdrawal (Dr)"
        warnings.append(
            f"Could not locate 'Transaction Date' and '{column_label}' columns. "
            "Is this an ICICI Detailed Statement?"
        )

    total = round(sum(r["amount"] for r in rows), 2)
    total_usd = round(sum(r["usd_amount"] for r in rows if r.get("usd_amount")), 2)
    fx_failures = sum(1 for r in rows if mode == "deposit" and r.get("usd_amount") is None)
    if fx_failures:
        warnings.append(f"Could not fetch FX rate for {fx_failures} row(s); USD amount missing.")
    return {
        "rows": rows,
        "total_credit": total,
        "total_credit_usd": total_usd,
        "count": len(rows),
        "warnings": warnings,
        "mode": mode,
    }
