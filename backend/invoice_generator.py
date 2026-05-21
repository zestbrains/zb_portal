"""
Invoice PDF generation for Zestbrains.
Generates Export and GST invoices with Zestbrains branding.
"""
import os
from fpdf import FPDF
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
STATIC_DIR = ROOT_DIR / "static"
FONTS_DIR = STATIC_DIR / "fonts"
LOGO_PATH = str(ROOT_DIR / "zestbrains_logo.png")

# A4 page
PW = 210
PH = 297
LM = 12
RM = 12
CW = PW - LM - RM

PRIMARY = (37, 99, 235)         # blue-600
PRIMARY_DARK = (30, 58, 138)    # blue-900
ACCENT = (251, 191, 36)         # amber-400
TEXT = (15, 23, 42)             # slate-900
MUTED = (100, 116, 139)         # slate-500
BORDER = (203, 213, 225)        # slate-300
LIGHT_BG = (241, 245, 249)      # slate-100


def _fmt_amount(value):
    try:
        return f"{float(value):,.2f}"
    except Exception:
        return str(value)


def _fmt_date(date_str):
    if not date_str:
        return ""
    try:
        dt = datetime.strptime(date_str.split("T")[0], "%Y-%m-%d")
        return dt.strftime("%d %b %Y")
    except Exception:
        return date_str


class InvoicePDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=False)
        poppins = str(FONTS_DIR / "Poppins-Regular.ttf")
        poppins_b = str(FONTS_DIR / "Poppins-Bold.ttf")
        if os.path.exists(poppins):
            self.add_font("Poppins", "", poppins, uni=True)
            self.add_font("Poppins", "B", poppins_b, uni=True)
            self._font_family = "Poppins"
        else:
            self._font_family = "Helvetica"

    def _f(self, style="", size=10):
        self.set_font(self._font_family, style, size)

    # ---------- Sections ----------
    def draw_header(self, invoice, bank):
        # Top accent bar
        self.set_fill_color(*PRIMARY)
        self.rect(0, 0, PW, 6, "F")

        # Logo
        if os.path.exists(LOGO_PATH):
            self.image(LOGO_PATH, x=LM, y=12, w=55)

        # Invoice meta block (right)
        self.set_text_color(*PRIMARY_DARK)
        self._f("B", 22)
        self.set_xy(PW - RM - 70, 12)
        self.cell(70, 9, "INVOICE", align="R", new_x="LMARGIN", new_y="NEXT")

        self.set_text_color(*TEXT)
        self._f("", 9)
        meta_y = 23
        self.set_xy(PW - RM - 70, meta_y)
        self.cell(35, 5, "Invoice No:", align="R")
        self._f("B", 9)
        self.cell(35, 5, invoice.get("invoice_number", ""), align="R", new_x="LMARGIN", new_y="NEXT")

        self.set_xy(PW - RM - 70, meta_y + 5)
        self._f("", 9)
        self.cell(35, 5, "Invoice Date:", align="R")
        self._f("B", 9)
        self.cell(35, 5, _fmt_date(invoice.get("invoice_date", "")), align="R", new_x="LMARGIN", new_y="NEXT")

        self.set_xy(PW - RM - 70, meta_y + 10)
        self._f("", 9)
        self.cell(35, 5, "Country of Origin:", align="R")
        self._f("B", 9)
        self.cell(35, 5, invoice.get("country_of_origin", ""), align="R", new_x="LMARGIN", new_y="NEXT")

        # Divider
        self.set_draw_color(*BORDER)
        self.set_line_width(0.3)
        self.line(LM, 42, PW - RM, 42)

    def draw_parties(self, bank, client, y_start=46):
        col_w = (CW - 4) / 2
        x_left = LM
        x_right = LM + col_w + 4

        # Headers
        self.set_fill_color(*LIGHT_BG)
        self.set_text_color(*PRIMARY_DARK)
        self._f("B", 9)
        self.set_xy(x_left, y_start)
        self.cell(col_w, 7, "  BILLED BY", fill=True)
        self.set_xy(x_right, y_start)
        self.cell(col_w, 7, "  BILLED TO", fill=True)

        # Content
        body_y = y_start + 9
        self.set_text_color(*TEXT)
        self._draw_party(x_left, body_y, col_w, bank or {}, is_bank=True)
        self._draw_party(x_right, body_y, col_w, client or {}, is_bank=False)

    def _draw_party(self, x, y, w, data, is_bank=False):
        self.set_xy(x, y)
        self._f("B", 11)
        name = data.get("name", "") if not is_bank else data.get("name", "")
        self.multi_cell(w, 5, name)
        self.set_x(x)
        self._f("", 9)

        lines = []
        addr = data.get("address", "")
        if addr:
            lines.append(addr)
        if not is_bank:
            city = data.get("city", "")
            country = data.get("country", "")
            loc_parts = [p for p in [city, country] if p]
            if loc_parts:
                lines.append(", ".join(loc_parts))
        for line in lines:
            self.set_x(x)
            self.multi_cell(w, 4.5, line)

        # Codes
        self.ln(1)
        pan = data.get("pancard", "")
        gst = data.get("gst", "")
        if pan:
            self.set_x(x)
            self._f("", 9)
            self.cell(15, 4.5, "PAN:")
            self._f("B", 9)
            self.cell(0, 4.5, pan, new_x="LMARGIN", new_y="NEXT")
        if gst:
            self.set_x(x)
            self._f("", 9)
            self.cell(15, 4.5, "GST:")
            self._f("B", 9)
            self.cell(0, 4.5, gst, new_x="LMARGIN", new_y="NEXT")

        # Extra params for client
        if not is_bank:
            extras = data.get("extra_params", []) or []
            for p in extras:
                k = (p.get("key") or "").strip()
                v = (p.get("value") or "").strip()
                if not k and not v:
                    continue
                self.set_x(x)
                self._f("", 9)
                self.cell(35, 4.5, f"{k}:")
                self._f("B", 9)
                self.multi_cell(w - 35, 4.5, v)

    def draw_items_table(self, items, y_start, invoice_type="export"):
        is_gst = invoice_type == "gst"
        # Column widths
        if is_gst:
            cols = [
                ("#", 8),
                ("Item & Description", 60),
                ("SAC", 18),
                ("Qty", 12),
                ("Rate", 22),
                ("Tax", 22),
                ("Amount", 44),
            ]
        else:
            cols = [
                ("#", 8),
                ("Item & Description", 78),
                ("SAC", 22),
                ("Qty", 14),
                ("Rate", 28),
                ("Amount", 36),
            ]

        total_w = sum(w for _, w in cols)
        # Scale to fit content width
        scale = CW / total_w
        cols = [(t, w * scale) for t, w in cols]

        # Header row
        self.set_xy(LM, y_start)
        self.set_fill_color(*PRIMARY_DARK)
        self.set_text_color(255, 255, 255)
        self._f("B", 9)
        for label, w in cols:
            align = "R" if label in ("Qty", "Rate", "Amount", "Tax") else "L"
            self.cell(w, 8, f"  {label}" if align == "L" else f"{label}  ", border=0, align=align, fill=True)
        self.ln(8)

        # Body
        self.set_text_color(*TEXT)
        self.set_draw_color(*BORDER)
        self._f("", 9)
        row_y = self.get_y()
        for i, it in enumerate(items, start=1):
            qty = float(it.get("quantity", 0) or 0)
            rate = float(it.get("amount", 0) or 0)
            line_total = qty * rate
            currency = (it.get("currency", "") or "").strip()
            desc = it.get("description", "") or ""
            item_name = it.get("item", "") or ""

            # Compute row height based on description
            self.set_xy(LM, row_y)
            # Measure description
            desc_w = cols[1][1] - 4
            self._f("B", 9)
            name_h = 5
            self._f("", 8.5)
            # Save and measure with multi_cell dry-run
            # Use simple line count estimation
            desc_lines = max(1, len(self.multi_cell(desc_w, 4.2, desc, split_only=True))) if desc else 0
            row_h = max(9, name_h + (desc_lines * 4.2) + 2)

            # Alternating row bg
            if i % 2 == 0:
                self.set_fill_color(248, 250, 252)
                self.rect(LM, row_y, CW, row_h, "F")

            # # column
            x = LM
            self.set_xy(x, row_y)
            self._f("", 9)
            self.cell(cols[0][1], row_h, str(i), align="C")
            x += cols[0][1]

            # Item & Description
            self.set_xy(x + 2, row_y + 1.5)
            self._f("B", 9.5)
            self.cell(cols[1][1] - 4, 4.8, item_name[:60])
            if desc:
                self.set_xy(x + 2, row_y + 6.5)
                self._f("", 8.5)
                self.multi_cell(cols[1][1] - 4, 4.2, desc)
            x += cols[1][1]

            # SAC
            self.set_xy(x, row_y)
            self._f("", 9)
            self.cell(cols[2][1], row_h, it.get("sac", "") or "-", align="C")
            x += cols[2][1]

            # Qty
            self.set_xy(x, row_y)
            self.cell(cols[3][1], row_h, f"{qty:g}", align="R")
            x += cols[3][1]

            # Rate
            self.set_xy(x, row_y)
            rate_str = f"{currency} {_fmt_amount(rate)}".strip()
            self.cell(cols[4][1] - 2, row_h, rate_str, align="R")
            x += cols[4][1]

            # GST: tax column
            if is_gst:
                tax_pct = float(it.get("tax_percent", 0) or 0)
                self.set_xy(x, row_y)
                self.cell(cols[5][1] - 2, row_h, f"{tax_pct:g}%", align="R")
                x += cols[5][1]
                amt_idx = 6
                tax_amount = line_total * tax_pct / 100
                amount_str = f"{currency} {_fmt_amount(line_total + tax_amount)}".strip()
            else:
                amt_idx = 5
                amount_str = f"{currency} {_fmt_amount(line_total)}".strip()

            # Amount
            self.set_xy(x, row_y)
            self._f("B", 9)
            self.cell(cols[amt_idx][1] - 2, row_h, amount_str, align="R")

            # Bottom border line
            self.set_draw_color(*BORDER)
            self.line(LM, row_y + row_h, LM + CW, row_y + row_h)

            row_y += row_h

        self.set_y(row_y)
        return row_y

    def draw_totals(self, invoice, items, y_start, invoice_type="export"):
        is_gst = invoice_type == "gst"
        currency = ""
        for it in items:
            c = (it.get("currency", "") or "").strip()
            if c:
                currency = c
                break

        subtotal = sum(float(it.get("quantity", 0) or 0) * float(it.get("amount", 0) or 0) for it in items)
        total_tax = 0.0
        if is_gst:
            total_tax = sum(
                float(it.get("quantity", 0) or 0) * float(it.get("amount", 0) or 0) *
                float(it.get("tax_percent", 0) or 0) / 100
                for it in items
            )

        cgst = float(invoice.get("cgst_amount", 0) or 0)
        sgst = float(invoice.get("sgst_amount", 0) or 0)
        igst = float(invoice.get("igst_amount", 0) or 0)
        # If not explicitly set on invoice, derive from per-item tax (GST only)
        if is_gst and (cgst + sgst + igst) == 0 and total_tax > 0:
            # Default: split tax 50/50 cgst+sgst when intra-state, else igst
            if invoice.get("tax_mode") == "igst":
                igst = total_tax
            else:
                cgst = total_tax / 2
                sgst = total_tax / 2

        discount = float(invoice.get("discount", 0) or 0)
        grand_total = subtotal + cgst + sgst + igst - discount

        box_w = 75
        x = PW - RM - box_w
        y = y_start + 4
        line_h = 7

        def row(label, value, bold_val=False, bold_label=False, divider=False):
            nonlocal y
            self.set_xy(x, y)
            self._f("B" if bold_label else "", 9.5)
            self.cell(box_w / 2, line_h, label)
            self._f("B" if bold_val else "", 9.5)
            self.cell(box_w / 2, line_h, value, align="R")
            y += line_h
            if divider:
                self.set_draw_color(*BORDER)
                self.line(x, y, x + box_w, y)

        self.set_text_color(*TEXT)
        row("Subtotal", f"{currency} {_fmt_amount(subtotal)}".strip(), bold_val=True)
        if is_gst:
            if cgst:
                row("CGST", f"{currency} {_fmt_amount(cgst)}".strip())
            if sgst:
                row("SGST", f"{currency} {_fmt_amount(sgst)}".strip())
            if igst:
                row("IGST", f"{currency} {_fmt_amount(igst)}".strip())
        if discount:
            row("Discount", f"- {currency} {_fmt_amount(discount)}".strip())

        # Grand total bar
        self.set_xy(x, y + 1)
        self.set_fill_color(*PRIMARY_DARK)
        self.set_text_color(255, 255, 255)
        self._f("B", 11)
        self.cell(box_w / 2, 9, "  Total", fill=True)
        self.cell(box_w / 2, 9, f"{currency} {_fmt_amount(grand_total)}  ".strip(), align="R", fill=True)
        self.set_text_color(*TEXT)
        return y + 12

    def draw_bank_details(self, bank, y_start):
        if not bank:
            return y_start
        details = []
        if bank.get("account_holder"):
            details.append(("A/c Holder", bank.get("account_holder")))
        if bank.get("bank_name"):
            details.append(("Bank Name", bank.get("bank_name")))
        if bank.get("account_number"):
            details.append(("A/c Number", bank.get("account_number")))
        if bank.get("ifsc"):
            details.append(("IFSC", bank.get("ifsc")))
        if bank.get("swift_code"):
            details.append(("Swift", bank.get("swift_code")))
        if not details:
            return y_start

        self.set_xy(LM, y_start)
        self.set_fill_color(*LIGHT_BG)
        self.set_text_color(*PRIMARY_DARK)
        self._f("B", 10)
        self.cell(CW, 7, "  Bank Details", fill=True, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*TEXT)
        self._f("", 9)
        col_w = CW / 2
        self.set_xy(LM, y_start + 9)
        for i, (k, v) in enumerate(details):
            col = i % 2
            row = i // 2
            cx = LM + col * col_w
            cy = y_start + 9 + row * 5.5
            self.set_xy(cx, cy)
            self._f("", 9)
            self.cell(25, 5, f"{k}:")
            self._f("B", 9)
            self.cell(col_w - 25, 5, str(v))
        rows = (len(details) + 1) // 2
        return y_start + 9 + rows * 5.5 + 3

    def draw_notes(self, notes, y_start):
        if not notes:
            return y_start
        self.set_xy(LM, y_start)
        self.set_text_color(*MUTED)
        self._f("B", 9)
        self.cell(CW, 5, "Notes", new_x="LMARGIN", new_y="NEXT")
        self.set_x(LM)
        self.set_text_color(*TEXT)
        self._f("", 9)
        self.multi_cell(CW, 4.5, notes)
        return self.get_y() + 3

    def draw_footer(self):
        y = PH - 22
        self.set_draw_color(*BORDER)
        self.line(LM, y, PW - RM, y)
        self.set_xy(LM, y + 2)
        self.set_text_color(*MUTED)
        self._f("", 8.5)
        footer_text = (
            "For any enquiry, reach out via email at hello@zestbrains.com, "
            "call on +91 72260 62508. This is an electronically generated document, "
            "no signature is required."
        )
        self.multi_cell(CW, 4, footer_text, align="C")
        # Bottom accent
        self.set_fill_color(*PRIMARY)
        self.rect(0, PH - 3, PW, 3, "F")


def generate_invoice_pdf(invoice, bank, client):
    """
    invoice: dict with invoice_number, invoice_date, country_of_origin,
             items[], notes, type ('export'|'gst'), tax_mode, discount, etc.
    bank: dict (Billed By)
    client: dict (Billed To)
    """
    pdf = InvoicePDF()
    pdf.add_page()
    pdf.draw_header(invoice, bank)
    pdf.draw_parties(bank, client, y_start=46)

    # Estimate parties section height
    items_y = 100
    items = invoice.get("items", []) or []
    end_y = pdf.draw_items_table(items, y_start=items_y, invoice_type=invoice.get("type", "export"))

    end_y = pdf.draw_totals(invoice, items, y_start=end_y + 2, invoice_type=invoice.get("type", "export"))
    end_y = pdf.draw_bank_details(bank, y_start=end_y + 4)
    end_y = pdf.draw_notes(invoice.get("notes", ""), y_start=end_y + 2)
    pdf.draw_footer()
    return bytes(pdf.output())
