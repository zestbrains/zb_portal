"""
Bank statement PDF parser.
Tuned for ICICI 'Detailed Statement' format which has the column headers:
  Sl No | Tran Id | Value Date | Transaction Date |
  Transaction Posted Date | Cheque no / Ref No | Transaction Remarks |
  Withdrawal (Dr) | Deposit (Cr) | Balance

We dynamically locate the 'Transaction Date' and 'Deposit (Cr)' columns by
header text, so minor layout drift between ICICI statements still works.
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import List, Dict

import pdfplumber


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


def _is_remarks_header(text: str) -> bool:
    t = text.lower()
    return ("remark" in t) or ("narration" in t) or ("description" in t)


def _find_header_indices(row: List[str]) -> tuple[int, int, int] | None:
    """Return (transaction_date_idx, deposit_idx, remarks_idx) if header row.
    remarks_idx may be -1 if not found."""
    tx_idx = -1
    dep_idx = -1
    rem_idx = -1
    for i, cell in enumerate(row or []):
        norm = _normalise(cell)
        if tx_idx == -1 and _is_transaction_date_header(norm):
            tx_idx = i
        elif dep_idx == -1 and _is_deposit_header(norm):
            dep_idx = i
        elif rem_idx == -1 and _is_remarks_header(norm):
            rem_idx = i
    if tx_idx >= 0 and dep_idx >= 0:
        return tx_idx, dep_idx, rem_idx
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


def parse_icici_statement(pdf_bytes: bytes) -> Dict[str, object]:
    """
    Extract credit (deposit) rows from an ICICI Detailed Statement PDF.

    Returns
    -------
    dict with keys:
        rows: list[ {transaction_date: 'YYYY-MM-DD', deposit_amount: float} ]
        total_credit: float
        count: int
        warnings: list[str]
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
                # Try to find header row inside this table
                local_header = None
                start_data_idx = 0
                for ri, row in enumerate(table):
                    found = _find_header_indices(row)
                    if found:
                        local_header = found
                        start_data_idx = ri + 1
                        break

                indices = local_header or header_idx
                if not indices:
                    continue
                if local_header:
                    header_idx = local_header

                tx_idx, dep_idx, rem_idx = indices
                max_idx = max(tx_idx, dep_idx, rem_idx if rem_idx >= 0 else 0)

                for row in table[start_data_idx:]:
                    if not row or len(row) <= max_idx:
                        continue
                    tx_raw = _normalise(row[tx_idx])
                    dep_raw = _normalise(row[dep_idx])
                    if not tx_raw and not dep_raw:
                        continue
                    amount = _parse_amount(dep_raw)
                    if amount is None or amount == 0:
                        continue  # Skip rows with no credit
                    date_iso = _parse_date(tx_raw)
                    remarks = ""
                    if rem_idx >= 0 and rem_idx < len(row):
                        remarks = _normalise(row[rem_idx])
                    rows.append({
                        "transaction_date": date_iso,
                        "deposit_amount": amount,
                        "transaction_remarks": remarks,
                    })

    if header_idx is None:
        warnings.append(
            "Could not locate 'Transaction Date' and 'Deposit (Cr)' columns. "
            "Is this an ICICI Detailed Statement?"
        )

    total = round(sum(r["deposit_amount"] for r in rows), 2)
    return {
        "rows": rows,
        "total_credit": total,
        "count": len(rows),
        "warnings": warnings,
    }
