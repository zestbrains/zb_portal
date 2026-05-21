"""
Invoice PDF generation for Zestbrains.
Modeled after Zoho-style modern invoice with purple branding.
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
LM = 14
RM = 14
CW = PW - LM - RM

# Palette (matching reference: vibrant violet/purple)
PRIMARY = (108, 51, 199)        # vibrant purple #6C33C7
PRIMARY_SOFT = (243, 238, 255)  # lavender wash for billed-by/to box bg
TEXT = (28, 25, 45)             # deep slate
MUTED = (110, 113, 138)
BORDER = (220, 220, 232)
SOFT_BG = (250, 249, 255)


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
        return dt.strftime("%b %d, %Y")
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

    # ----------------- HEADER -----------------
    def draw_header(self, invoice):
        # Big INVOICE title (left)
        self.set_text_color(*PRIMARY)
        self._f("B", 32)
        self.set_xy(LM, 14)
        self.cell(80, 12, "Invoice", new_x="LMARGIN", new_y="NEXT")

        # Logo (right)
        if os.path.exists(LOGO_PATH):
            logo_w = 50
            self.image(LOGO_PATH, x=PW - RM - logo_w, y=14, w=logo_w)

        # Invoice meta (left, under title)
        meta_y = 32
        self.set_text_color(*MUTED)
        self._f("", 9)
        self.set_xy(LM, meta_y)
        self.cell(35, 5, "Invoice No #")
        self.set_text_color(*TEXT)
        self._f("B", 10)
        self.cell(0, 5, invoice.get("invoice_number", ""), new_x="LMARGIN", new_y="NEXT")

        self.set_xy(LM, meta_y + 6)
        self.set_text_color(*MUTED)
        self._f("", 9)
        self.cell(35, 5, "Invoice Date")
        self.set_text_color(*TEXT)
        self._f("B", 10)
        self.cell(0, 5, _fmt_date(invoice.get("invoice_date", "")), new_x="LMARGIN", new_y="NEXT")

        self.set_xy(LM, meta_y + 12)
        self.set_text_color(*MUTED)
        self._f("", 9)
        self.cell(35, 5, "Country Of Origin")
        self.set_text_color(*TEXT)
        self._f("B", 10)
        self.cell(0, 5, invoice.get("country_of_origin", "India"), new_x="LMARGIN", new_y="NEXT")

    # ----------------- PARTIES -----------------
    def draw_parties(self, bank, client, y_start=58):
        gap = 4
        col_w = (CW - gap) / 2

        # ---- Billed By box ----
        x_left = LM
        self._draw_party_box(x_left, y_start, col_w, "Billed By", bank or {}, is_bank=True)

        # ---- Billed To box ----
        x_right = LM + col_w + gap
        self._draw_party_box(x_right, y_start, col_w, "Billed To", client or {}, is_bank=False)

    def _measure_party_height(self, w, data, is_bank):
        # Same logic as draw, but only counts vertical advance
        h = 12  # header band
        # Name line
        h += 6
        # Address lines
        lines = []
        if data.get("address"):
            lines.append(data.get("address"))
        if not is_bank:
            city = data.get("city", "")
            country = data.get("country", "")
            loc = ", ".join([p for p in [city, country] if p])
            if loc:
                lines.append(loc)
        # multi_cell adv estimate
        for ln in lines:
            split = self._split_lines(ln, w - 8, 9)
            h += 4.6 * len(split)
        h += 2
        # PAN / GST
        if data.get("pancard"):
            h += 5.2
        if data.get("gst"):
            h += 5.2
        # Extra params (client)
        if not is_bank:
            for p in (data.get("extra_params") or []):
                k = (p.get("key") or "").strip()
                v = (p.get("value") or "").strip()
                if not k and not v:
                    continue
                split = self._split_lines(v, w - 35, 9)
                h += 4.6 * max(1, len(split))
        h += 4  # bottom padding
        return max(h, 38)

    def _split_lines(self, text, width, size):
        # Use fpdf's measurement helper without writing
        self.set_font(self._font_family, "", size)
        return self.multi_cell(width, 4.5, text, split_only=True) or [""]

    def _draw_party_box(self, x, y, w, title, data, is_bank):
        h = self._measure_party_height(w, data, is_bank)
        # Box background
        self.set_fill_color(*SOFT_BG)
        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        self.rect(x, y, w, h, "DF")

        # Header band
        self.set_fill_color(*PRIMARY_SOFT)
        self.rect(x, y, w, 9, "F")
        self.set_xy(x + 4, y + 1.5)
        self.set_text_color(*PRIMARY)
        self._f("B", 10.5)
        self.cell(w - 8, 6, title)

        # Body
        cur_y = y + 11
        self.set_text_color(*TEXT)
        # Name
        self.set_xy(x + 4, cur_y)
        self._f("B", 11)
        self.cell(w - 8, 5.5, (data.get("name") or "")[:80], new_x="LMARGIN", new_y="NEXT")
        cur_y += 6

        # Address lines
        self._f("", 9)
        if data.get("address"):
            self.set_xy(x + 4, cur_y)
            self.multi_cell(w - 8, 4.5, data.get("address"), align="L")
            cur_y = self.get_y()
        if not is_bank:
            city = data.get("city", "")
            country = data.get("country", "")
            loc = ", ".join([p for p in [city, country] if p])
            if loc:
                self.set_xy(x + 4, cur_y)
                self.multi_cell(w - 8, 4.5, loc, align="L")
                cur_y = self.get_y()

        cur_y += 1
        # PAN / GST
        if data.get("gst"):
            self.set_xy(x + 4, cur_y)
            self._f("B", 9)
            self.set_text_color(*MUTED)
            self.cell(14, 5, "GSTIN:")
            self.set_text_color(*TEXT)
            self._f("", 9)
            self.cell(w - 18, 5, data.get("gst"))
            cur_y += 5
        if data.get("pancard"):
            self.set_xy(x + 4, cur_y)
            self._f("B", 9)
            self.set_text_color(*MUTED)
            self.cell(14, 5, "PAN:")
            self.set_text_color(*TEXT)
            self._f("", 9)
            self.cell(w - 18, 5, data.get("pancard"))
            cur_y += 5

        # Client extra params
        if not is_bank:
            for p in (data.get("extra_params") or []):
                k = (p.get("key") or "").strip()
                v = (p.get("value") or "").strip()
                if not k and not v:
                    continue
                self.set_xy(x + 4, cur_y)
                self._f("B", 9)
                self.set_text_color(*MUTED)
                self.cell(35, 5, f"{k}:")
                self.set_text_color(*TEXT)
                self._f("", 9)
                self.multi_cell(w - 39, 4.5, v, align="L")
                cur_y = self.get_y() + 0.5

    # ----------------- ITEMS TABLE -----------------
    def draw_items_table(self, items, y_start, invoice_type="export"):
        is_gst = invoice_type == "gst"

        # Column widths summing to CW
        if is_gst:
            cols = [
                ("#", 8),
                ("Item & Description", 65),
                ("SAC", 18),
                ("Qty", 14),
                ("Rate", 24),
                ("Tax", 18),
                ("Amount", 35),
            ]
        else:
            cols = [
                ("#", 8),
                ("Item & Description", 78),
                ("SAC", 22),
                ("Qty", 16),
                ("Rate", 28),
                ("Amount", 30),
            ]
        total_w = sum(w for _, w in cols)
        scale = CW / total_w
        cols = [(t, w * scale) for t, w in cols]

        # Header
        self.set_xy(LM, y_start)
        self.set_fill_color(*PRIMARY)
        self.set_text_color(255, 255, 255)
        self._f("B", 9.5)
        for label, w in cols:
            align = "R" if label in ("Qty", "Rate", "Amount", "Tax") else ("C" if label == "#" else "L")
            if align == "L":
                self.cell(w, 9, f"  {label}", border=0, align="L", fill=True)
            elif align == "R":
                self.cell(w, 9, f"{label}  ", border=0, align="R", fill=True)
            else:
                self.cell(w, 9, label, border=0, align="C", fill=True)
        self.ln(9)

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

            # Measure description height
            desc_w = cols[1][1] - 4
            desc_lines = 0
            if desc:
                self._f("", 8.5)
                desc_lines = len(self.multi_cell(desc_w, 4.0, desc, split_only=True) or [])
            row_h = max(11, 6.5 + (desc_lines * 4.0) + 3)

            # Alternating row
            if i % 2 == 0:
                self.set_fill_color(*SOFT_BG)
                self.rect(LM, row_y, CW, row_h, "F")

            # # column
            x = LM
            self.set_xy(x, row_y)
            self._f("", 9)
            self.cell(cols[0][1], row_h, str(i), align="C")
            x += cols[0][1]

            # Item & Description
            self.set_xy(x + 2, row_y + 1.8)
            self._f("B", 9.5)
            self.cell(cols[1][1] - 4, 4.8, item_name[:80])
            if desc:
                self.set_xy(x + 2, row_y + 6.8)
                self._f("", 8.5)
                self.multi_cell(cols[1][1] - 4, 4.0, desc, align="L")
            x += cols[1][1]

            # SAC
            self.set_xy(x, row_y)
            self._f("", 9)
            self.cell(cols[2][1], row_h, (it.get("sac") or "-"), align="C")
            x += cols[2][1]

            # Qty
            self.set_xy(x, row_y)
            self.cell(cols[3][1] - 2, row_h, f"{qty:g}", align="R")
            x += cols[3][1]

            # Rate
            self.set_xy(x, row_y)
            self.cell(cols[4][1] - 2, row_h, f"{currency} {_fmt_amount(rate)}".strip(), align="R")
            x += cols[4][1]

            # GST Tax column
            if is_gst:
                tax_pct = float(it.get("tax_percent", 0) or 0)
                self.set_xy(x, row_y)
                self.cell(cols[5][1] - 2, row_h, f"{tax_pct:g}%", align="R")
                x += cols[5][1]
                tax_amt = line_total * tax_pct / 100
                amount_val = line_total + tax_amt
                amount_idx = 6
            else:
                amount_val = line_total
                amount_idx = 5

            # Amount
            self.set_xy(x, row_y)
            self._f("B", 9.5)
            self.cell(cols[amount_idx][1] - 2, row_h, f"{currency} {_fmt_amount(amount_val)}".strip(), align="R")

            # row separator
            self.set_draw_color(*BORDER)
            self.line(LM, row_y + row_h, LM + CW, row_y + row_h)
            row_y += row_h

        # Outer border around table
        # (Top header already filled; draw left/right/bottom verticals)
        self.set_draw_color(*BORDER)
        self.rect(LM, y_start, CW, row_y - y_start, "D")
        self.set_y(row_y)
        return row_y

    # ----------------- TOTALS -----------------
    def draw_totals(self, invoice, items, y_start, invoice_type="export"):
        is_gst = invoice_type == "gst"
        currency = next((it.get("currency", "") for it in items if it.get("currency")), "")

        subtotal = sum(float(it.get("quantity", 0) or 0) * float(it.get("amount", 0) or 0) for it in items)
        cgst = float(invoice.get("cgst_amount", 0) or 0)
        sgst = float(invoice.get("sgst_amount", 0) or 0)
        igst = float(invoice.get("igst_amount", 0) or 0)

        if is_gst and (cgst + sgst + igst) == 0:
            total_tax = sum(
                float(it.get("quantity", 0) or 0) * float(it.get("amount", 0) or 0) *
                float(it.get("tax_percent", 0) or 0) / 100 for it in items
            )
            if total_tax > 0:
                if invoice.get("tax_mode") == "igst":
                    igst = total_tax
                else:
                    cgst = total_tax / 2
                    sgst = total_tax / 2

        discount = float(invoice.get("discount", 0) or 0)
        grand_total = subtotal + cgst + sgst + igst - discount

        box_w = 80
        x = PW - RM - box_w
        y = y_start + 4
        line_h = 6.5

        self.set_text_color(*TEXT)

        def row(label, value, bold=False):
            nonlocal y
            self.set_xy(x, y)
            self._f("", 9.5)
            self.set_text_color(*MUTED)
            self.cell(box_w / 2, line_h, label)
            self.set_text_color(*TEXT)
            self._f("B" if bold else "", 9.5)
            self.cell(box_w / 2, line_h, value, align="R")
            y += line_h

        if is_gst or discount > 0:
            row("Subtotal", f"{currency} {_fmt_amount(subtotal)}".strip())
            if is_gst:
                if cgst:
                    row("CGST", f"{currency} {_fmt_amount(cgst)}".strip())
                if sgst:
                    row("SGST", f"{currency} {_fmt_amount(sgst)}".strip())
                if igst:
                    row("IGST", f"{currency} {_fmt_amount(igst)}".strip())
            if discount > 0:
                row("Discount", f"- {currency} {_fmt_amount(discount)}".strip())

        # Grand Total
        self.set_xy(x, y + 1)
        self.set_fill_color(*PRIMARY)
        self.set_text_color(255, 255, 255)
        self._f("B", 12)
        label = f"Total ({currency})" if currency else "Total"
        self.cell(box_w / 2, 11, f"  {label}", fill=True)
        self.cell(box_w / 2, 11, f"{currency} {_fmt_amount(grand_total)}  ".strip(), align="R", fill=True)
        self.set_text_color(*TEXT)
        return y + 14

    # ----------------- BANK DETAILS -----------------
    def draw_bank_details(self, bank, y_start):
        if not bank:
            return y_start
        details = []
        if bank.get("account_holder") or bank.get("name"):
            details.append(("Account Name", bank.get("account_holder") or bank.get("name")))
        if bank.get("account_number"):
            details.append(("Account Number", bank.get("account_number")))
        if bank.get("ifsc"):
            details.append(("IFSC", bank.get("ifsc")))
        if bank.get("swift_code"):
            details.append(("SWIFT Code", bank.get("swift_code")))
        if bank.get("bank_name"):
            details.append(("Bank", bank.get("bank_name")))
        if not details:
            return y_start

        # Section title with side accent
        self.set_xy(LM, y_start)
        self.set_fill_color(*PRIMARY)
        self.rect(LM, y_start + 1, 3, 5, "F")
        self.set_xy(LM + 6, y_start)
        self.set_text_color(*PRIMARY)
        self._f("B", 11)
        self.cell(80, 7, "Bank Details", new_x="LMARGIN", new_y="NEXT")

        # Details list
        cur_y = y_start + 9
        self.set_text_color(*TEXT)
        for k, v in details:
            self.set_xy(LM + 6, cur_y)
            self._f("B", 9.5)
            self.set_text_color(*MUTED)
            self.cell(32, 5, f"{k}:")
            self.set_text_color(*TEXT)
            self._f("", 9.5)
            self.cell(0, 5, str(v))
            cur_y += 5.3
        return cur_y + 3

    # ----------------- NOTES -----------------
    def draw_notes(self, notes, y_start):
        if not notes:
            return y_start
        self.set_xy(LM, y_start)
        self.set_fill_color(*PRIMARY)
        self.rect(LM, y_start + 1, 3, 5, "F")
        self.set_xy(LM + 6, y_start)
        self.set_text_color(*PRIMARY)
        self._f("B", 11)
        self.cell(0, 7, "Notes", new_x="LMARGIN", new_y="NEXT")
        self.set_xy(LM + 6, y_start + 9)
        self.set_text_color(*TEXT)
        self._f("", 9.5)
        self.multi_cell(CW - 6, 4.8, notes, align="L")
        return self.get_y() + 3

    # ----------------- FOOTER -----------------
    def draw_footer(self):
        # No accent bar (it was overlapping). Use a clean two-line centered footer.
        footer_y = PH - 18
        self.set_draw_color(*BORDER)
        self.set_line_width(0.2)
        self.line(LM, footer_y, PW - RM, footer_y)

        self.set_xy(LM, footer_y + 2)
        self.set_text_color(*TEXT)
        self._f("", 8.8)
        self.cell(CW, 4.5,
                  "For any enquiry, reach out via email at hello@zestbrains.com, call on +91 72260 62508.",
                  align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_xy(LM, footer_y + 7)
        self.set_text_color(*MUTED)
        self._f("", 8.5)
        self.cell(CW, 4.5,
                  "This is an electronically generated document, no signature is required.",
                  align="C")


def generate_invoice_pdf(invoice, bank, client):
    pdf = InvoicePDF()
    pdf.add_page()

    pdf.draw_header(invoice)
    pdf.draw_parties(bank, client, y_start=58)

    # Compute items table start dynamically based on parties box height
    parties_h_left = pdf._measure_party_height((CW - 4) / 2, bank or {}, is_bank=True)
    parties_h_right = pdf._measure_party_height((CW - 4) / 2, client or {}, is_bank=False)
    items_y = 58 + max(parties_h_left, parties_h_right) + 8

    items = invoice.get("items", []) or []
    end_y = pdf.draw_items_table(items, y_start=items_y, invoice_type=invoice.get("type", "export"))
    end_y = pdf.draw_totals(invoice, items, y_start=end_y + 2, invoice_type=invoice.get("type", "export"))
    end_y = pdf.draw_bank_details(bank, y_start=end_y + 4)
    end_y = pdf.draw_notes(invoice.get("notes", ""), y_start=end_y + 2)
    pdf.draw_footer()
    return bytes(pdf.output())
