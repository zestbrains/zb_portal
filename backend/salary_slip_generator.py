"""
Salary Slip PDF generator for Zestbrains HR Portal
Recreates the reference "Form IV B [Rule 26(2)(b)]" layout using fpdf2.
"""
import os
from pathlib import Path
from fpdf import FPDF
from num2words import num2words

STATIC_DIR = Path(__file__).parent / "static"
FONTS_DIR = STATIC_DIR / "fonts"

# Page (A4)
PW = 210.0
PH = 297.0
LM = 8.0
RM = 8.0
CW = PW - LM - RM  # 194mm


def _rupees_in_words(amount):
    try:
        rupees = int(round(float(amount)))
    except (ValueError, TypeError):
        rupees = 0
    words = num2words(rupees, lang="en_IN").replace(",", "").replace("-", " ")
    # Title-case each word
    words = " ".join(w.capitalize() for w in words.split())
    return f"Rupees {words} Only"


def _fmt(n):
    """Format a number to 2-decimal like 15500.00 (blank for None)."""
    if n is None or n == "":
        return ""
    try:
        return f"{float(n):.2f}"
    except (ValueError, TypeError):
        return ""


class SalarySlipPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=False)
        poppins = str(FONTS_DIR / "Poppins-Regular.ttf")
        poppins_b = str(FONTS_DIR / "Poppins-Bold.ttf")
        poppins_i = str(FONTS_DIR / "Poppins-Italic.ttf")
        poppins_bi = str(FONTS_DIR / "Poppins-BoldItalic.ttf")
        if os.path.exists(poppins):
            self.add_font("Poppins", "", poppins, uni=True)
            self.add_font("Poppins", "B", poppins_b, uni=True)
            self.add_font("Poppins", "I", poppins_i, uni=True)
            self.add_font("Poppins", "BI", poppins_bi, uni=True)
            self._ff = "Poppins"
        else:
            self._ff = "Helvetica"

    def f(self, style="", size=9):
        self.set_font(self._ff, style, size)


def _draw_header(pdf, company_name, company_address, month_label):
    # Top strip: company name + Salary Slip title
    pdf.set_xy(LM, 8)
    pdf.f("B", 13)
    pdf.cell(CW / 2, 6, company_name.upper(), 0, 0, "L")
    pdf.f("B", 12)
    pdf.set_xy(LM + CW / 2, 8)
    pdf.cell(CW / 2, 6, "Salary Slip", 0, 1, "R")

    pdf.f("", 8)
    pdf.set_xy(LM, 14)
    pdf.multi_cell(CW / 2, 3.6, company_address or "", 0, "L")
    y_after_addr = pdf.get_y()

    pdf.set_xy(LM + CW / 2, 14)
    pdf.f("", 8)
    pdf.cell(CW / 2, 3.6, "Form IV B [Rule 26(2) (b)]", 0, 1, "R")
    pdf.set_xy(LM + CW / 2, 17.6)
    pdf.f("B", 9)
    pdf.cell(CW / 2, 4.5, f"Salary for the month of :- {month_label}", 0, 1, "R")

    y = max(y_after_addr, 24) + 1
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.4)
    pdf.line(LM, y, PW - RM, y)
    return y + 2


def _draw_employee_block(pdf, y, emp):
    """Two-column grid of employee info fields, 3 rows × 2 cols."""
    rows = [
        [("Emp.Id", emp.get("emp_id", "")), ("Bank", emp.get("bank_name", ""))],
        [("Emp. Name", emp.get("name", "")), ("A/c No", emp.get("account_no", ""))],
        [("Designation", emp.get("designation", "")), ("PAN No", emp.get("pan", ""))],
        [("Department", emp.get("department", "")), ("P.F. No.", emp.get("pf_no", "N/A"))],
        [("Location", emp.get("location", "Ahmedabad")), ("UAN No.", emp.get("uan", ""))],
        [("D.O.J", emp.get("doj", "")), ("ESI No.", emp.get("esi_no", ""))],
    ]
    col_w = CW / 2
    label_w = 26
    row_h = 5.2

    pdf.set_draw_color(180, 180, 180)
    pdf.set_line_width(0.15)
    x0 = LM
    pdf.rect(x0, y, CW, row_h * len(rows))

    for r, row in enumerate(rows):
        ry = y + r * row_h
        # horizontal line between rows
        if r > 0:
            pdf.line(x0, ry, x0 + CW, ry)
        # vertical splitter between columns
        pdf.line(x0 + col_w, ry, x0 + col_w, ry + row_h)
        for c, (lbl, val) in enumerate(row):
            cx = x0 + c * col_w
            pdf.set_xy(cx + 1.5, ry + 0.5)
            pdf.f("B", 8.5)
            pdf.cell(label_w, row_h - 1, f"{lbl}", 0, 0, "L")
            pdf.set_xy(cx + 1.5 + label_w, ry + 0.5)
            pdf.f("", 8.5)
            pdf.cell(col_w - label_w - 3, row_h - 1, str(val or ""), 0, 0, "L")

    return y + row_h * len(rows)


def _draw_main_tables(pdf, y, working, earnings, deductions, totals):
    """
    Three side-by-side tables: WORKING (30%) | EARNINGS (40%) | DEDUCTIONS (30%).
    """
    x0 = LM
    w_working = CW * 0.28
    w_earnings = CW * 0.42
    w_deductions = CW - w_working - w_earnings

    # ----- Header row -----
    hh = 6
    pdf.set_fill_color(230, 230, 230)
    pdf.set_draw_color(120, 120, 120)
    pdf.set_line_width(0.2)
    pdf.f("B", 8.5)

    pdf.set_xy(x0, y)
    pdf.cell(w_working, hh, "WORKING DETAILS", 1, 0, "C", fill=True)
    pdf.cell(w_earnings, hh, "EARNINGS DETAILS", 1, 0, "C", fill=True)
    pdf.cell(w_deductions, hh, "DEDUCTION DETAILS", 1, 1, "C", fill=True)

    # ----- Sub-header for earnings (Earnings | Actual | Payable) and deductions (Deduction | Amount) -----
    sh = 5
    sub_y = y + hh
    pdf.set_xy(x0, sub_y)
    pdf.f("B", 7.5)
    # Working: single column "Item | Value" — use inline within rows
    pdf.cell(w_working * 0.6, sh, "Item", 1, 0, "L", fill=True)
    pdf.cell(w_working * 0.4, sh, "Days", 1, 0, "C", fill=True)
    # Earnings
    e_lbl_w = w_earnings * 0.44
    e_act_w = w_earnings * 0.28
    e_pay_w = w_earnings - e_lbl_w - e_act_w
    pdf.cell(e_lbl_w, sh, "Earnings", 1, 0, "L", fill=True)
    pdf.cell(e_act_w, sh, "Actual", 1, 0, "C", fill=True)
    pdf.cell(e_pay_w, sh, "Payable", 1, 0, "C", fill=True)
    # Deductions
    d_lbl_w = w_deductions * 0.6
    d_amt_w = w_deductions - d_lbl_w
    pdf.cell(d_lbl_w, sh, "Deduction", 1, 0, "L", fill=True)
    pdf.cell(d_amt_w, sh, "Amount", 1, 1, "C", fill=True)

    # ----- Rows -----
    max_rows = max(len(working), len(earnings), len(deductions))
    row_h = 4.6
    body_y = sub_y + sh
    pdf.f("", 8)

    for i in range(max_rows):
        ry = body_y + i * row_h
        pdf.set_xy(x0, ry)

        # Working column
        if i < len(working):
            wl, wv = working[i]
        else:
            wl, wv = "", ""
        pdf.cell(w_working * 0.6, row_h, f" {wl}", 1, 0, "L")
        pdf.cell(w_working * 0.4, row_h, _fmt(wv) if isinstance(wv, (int, float)) else str(wv), 1, 0, "R")

        # Earnings column
        if i < len(earnings):
            el, ea, ep = earnings[i]
        else:
            el, ea, ep = "", "", ""
        pdf.cell(e_lbl_w, row_h, f" {el}", 1, 0, "L")
        pdf.cell(e_act_w, row_h, _fmt(ea), 1, 0, "R")
        pdf.cell(e_pay_w, row_h, _fmt(ep), 1, 0, "R")

        # Deductions column
        if i < len(deductions):
            dl, dv = deductions[i]
        else:
            dl, dv = "", ""
        pdf.cell(d_lbl_w, row_h, f" {dl}", 1, 0, "L")
        pdf.cell(d_amt_w, row_h, _fmt(dv), 1, 1, "R")

    body_end_y = body_y + max_rows * row_h

    # ----- Totals row -----
    pdf.set_xy(x0, body_end_y)
    pdf.f("B", 8.5)
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(w_working * 0.6, 6, " TOTAL", 1, 0, "L", fill=True)
    pdf.cell(w_working * 0.4, 6, _fmt(totals.get("working_total", "")), 1, 0, "R", fill=True)
    pdf.cell(e_lbl_w, 6, " Gross Income", 1, 0, "L", fill=True)
    pdf.cell(e_act_w + e_pay_w, 6, _fmt(totals["gross_income"]), 1, 0, "R", fill=True)
    pdf.cell(d_lbl_w, 6, " Total Deduction", 1, 0, "L", fill=True)
    pdf.cell(d_amt_w, 6, _fmt(totals["total_deduction"]), 1, 1, "R", fill=True)

    return body_end_y + 6


def _draw_footer(pdf, y, net_amount):
    pdf.set_xy(LM, y + 3)
    pdf.f("B", 10)
    pdf.set_fill_color(210, 240, 220)
    pdf.cell(CW, 8, f"Net Amount: Rs. {_fmt(net_amount)}", 1, 1, "R", fill=True)

    y += 12
    pdf.set_xy(LM, y)
    pdf.f("BI", 8.5)
    pdf.multi_cell(CW, 4.5, f"In Words: {_rupees_in_words(net_amount)}", 0, "L")

    y = pdf.get_y() + 3
    pdf.set_xy(LM, y)
    pdf.f("I", 7.5)
    pdf.set_text_color(90, 90, 90)
    pdf.multi_cell(CW, 3.6,
                   "This is a computer generated statement hence does not require a signature.",
                   0, "C")
    pdf.set_text_color(0, 0, 0)


def generate_salary_slip_pdf(company, employee, working, earnings, deductions, totals, month_label):
    """
    Public API to produce salary slip bytes.
    Args:
      company: dict with keys name, address
      employee: dict with keys emp_id, name, designation, department, location, doj, bank_name, account_no, pan, pf_no, uan, esi_no
      working: list[(label, value)]
      earnings: list[(label, actual, payable)]
      deductions: list[(label, amount)]
      totals: dict with keys gross_income, total_deduction, net_amount, working_total (optional)
      month_label: "Mar-2026"
    """
    pdf = SalarySlipPDF()
    pdf.add_page()

    y = _draw_header(pdf, company["name"], company.get("address", ""), month_label)
    y = _draw_employee_block(pdf, y + 1, employee) + 3
    y = _draw_main_tables(pdf, y, working, earnings, deductions, totals) + 1
    _draw_footer(pdf, y, totals["net_amount"])

    return bytes(pdf.output(dest="S"))
