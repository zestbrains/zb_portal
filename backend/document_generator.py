"""
Document/Letter PDF generation for Zestbrains HR Portal
Generates offer letters, experience letters, etc. with company letterhead
All letters are designed to fit on a single US Letter page.
"""
import os
from fpdf import FPDF
from pathlib import Path

STATIC_DIR = Path(__file__).parent / "static"
LETTERHEAD_DIR = STATIC_DIR / "letterhead"
FONTS_DIR = STATIC_DIR / "fonts"

HEADER_IMG = str(LETTERHEAD_DIR / "header.png")
FOOTER_IMG = str(LETTERHEAD_DIR / "footer.png")
SIGNATURE_IMG = str(LETTERHEAD_DIR / "signature.png")

# Page dimensions (US Letter)
PW = 215.9  # page width mm
PH = 279.4  # page height mm
CONTENT_TOP = 52  # content starts after header (header is ~47mm)
FOOTER_Y = 225  # footer image Y start (footer is ~54mm tall)
LM = 18  # left margin
RM = 18  # right margin
CW = PW - LM - RM  # content width
LH = 5.5  # line height for body text
FONT_BODY = 10  # body font size
FONT_TITLE = 13  # title font size
FONT_SMALL = 9  # small text size


class LetterPDF(FPDF):

    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='Letter')
        self.set_auto_page_break(auto=False)
        # Register Poppins font
        poppins = str(FONTS_DIR / "Poppins-Regular.ttf")
        poppins_b = str(FONTS_DIR / "Poppins-Bold.ttf")
        poppins_i = str(FONTS_DIR / "Poppins-Italic.ttf")
        poppins_bi = str(FONTS_DIR / "Poppins-BoldItalic.ttf")
        if os.path.exists(poppins):
            self.add_font("Poppins", "", poppins, uni=True)
            self.add_font("Poppins", "B", poppins_b, uni=True)
            self.add_font("Poppins", "I", poppins_i, uni=True)
            self.add_font("Poppins", "BI", poppins_bi, uni=True)
            self._font_family = "Poppins"
        else:
            self._font_family = "Helvetica"

    def _f(self, style="", size=None):
        self.set_font(self._font_family, style, size or FONT_BODY)

    def header(self):
        if os.path.exists(HEADER_IMG):
            self.image(HEADER_IMG, x=0, y=0, w=PW)
        self.set_y(CONTENT_TOP)
        self.set_left_margin(LM)
        self.set_right_margin(RM)

    def footer(self):
        if os.path.exists(FOOTER_IMG):
            self.image(FOOTER_IMG, x=0, y=FOOTER_Y, w=PW)

    def add_signature(self):
        y = self.get_y() + 6
        self.set_y(y)
        self._f("B", FONT_BODY)
        self.cell(0, LH, "For ZESTBRAINS PVT. LTD", new_x="LMARGIN", new_y="NEXT")
        if os.path.exists(SIGNATURE_IMG):
            self.image(SIGNATURE_IMG, x=LM, y=self.get_y() + 1, w=25)
            self.set_y(self.get_y() + 20)
        else:
            self.set_y(self.get_y() + 12)
        self._f("B", FONT_BODY)
        self.cell(0, LH, "Authorised Signatory", new_x="LMARGIN", new_y="NEXT")

    def write_date(self, date_str, ref_no=""):
        self._f("", FONT_SMALL)
        self.cell(0, LH, f"Date: {date_str}", new_x="LMARGIN", new_y="NEXT")
        if ref_no:
            self.cell(0, LH, f"Ref: {ref_no}", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def write_title(self, title):
        self._f("B", FONT_TITLE)
        self.cell(0, 7, title, align="C", new_x="LMARGIN", new_y="NEXT")
        tw = self.get_string_width(title)
        cx = (PW - tw) / 2
        self.line(cx, self.get_y(), cx + tw, self.get_y())
        self.ln(5)

    def write_to(self, name):
        self._f("", FONT_BODY)
        self.cell(0, LH, "To,", new_x="LMARGIN", new_y="NEXT")
        self._f("B", FONT_BODY)
        self.cell(0, LH, f"Mr./Ms. {name}", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def write_subject(self, subject):
        self._f("B", FONT_BODY)
        self.cell(16, LH, "Subject: ")
        self.set_font(self._font_family, "BU", FONT_BODY)
        self.cell(0, LH, subject, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def write_salutation(self, name):
        self._f("", FONT_BODY)
        self.cell(0, LH, f"Dear {name},", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def write_body(self, text):
        self._f("", FONT_BODY)
        self.multi_cell(CW, LH, text)
        self.ln(2)

    def write_bullet(self, text):
        self._f("", FONT_BODY)
        self.set_x(LM + 6)
        self.multi_cell(CW - 6, LH, f"\u2022  {text}")
        self.set_x(LM)

    def write_closing(self, text):
        self._f("", FONT_BODY)
        self.multi_cell(CW, LH, text)
        self.ln(1.5)


def _fmt_date(date_str):
    if not date_str:
        return ""
    try:
        from datetime import datetime
        dt = datetime.strptime(date_str.split('T')[0], "%Y-%m-%d")
        return dt.strftime("%d %B %Y")
    except:
        return date_str


def _fmt_salary(amount):
    try:
        return f"{float(amount):,.0f}"
    except:
        return str(amount)


def generate_offer_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("OFFER LETTER")
    pdf.write_to(name)
    pdf.write_subject(f"Offer of Employment - {inputs.get('designation', '')}")
    pdf.write_salutation(name)
    pdf.write_body(
        f"We are pleased to offer you the position of {inputs.get('designation', '')} "
        f"at Zestbrains Pvt. Ltd. We were impressed with your background and skills, "
        f"and we believe you will be a valuable addition to our team."
    )
    pdf.write_body("The details of your offer are as follows:")
    pdf.write_bullet(f"Position/Designation: {inputs.get('designation', '')}")
    pdf.write_bullet(f"Department: {inputs.get('department', '')}")
    pdf.write_bullet(f"Monthly CTC: Rs. {_fmt_salary(inputs.get('offered_salary', ''))}")
    pdf.write_bullet(f"Date of Joining: {_fmt_date(inputs.get('joining_date', ''))}")
    pdf.write_bullet(f"Probation Period: {inputs.get('probation_period', '6 Months')}")
    pdf.write_bullet(f"Work Location: {inputs.get('work_location', 'Ahmedabad')}")
    pdf.ln(1.5)
    pdf.write_body(
        "During the probation period, either party may terminate the employment "
        "by giving one month's written notice or one month's salary in lieu thereof."
    )
    pdf.write_body(
        "This offer is contingent upon successful verification of your educational "
        "qualifications and previous employment records."
    )
    pdf.write_body(
        "Please sign and return a copy of this letter as acceptance of the offer. "
        "We look forward to having you on our team."
    )
    pdf.write_closing("Congratulations and welcome to Zestbrains Pvt. Ltd!")
    pdf.add_signature()
    return pdf


def generate_appointment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("APPOINTMENT LETTER")
    pdf.write_to(name)
    pdf.write_subject(f"Appointment as {inputs.get('designation', '')}")
    pdf.write_salutation(name)
    pdf.write_body(
        f"With reference to your application and subsequent interview, we are pleased to "
        f"appoint you as {inputs.get('designation', '')} in our organization with effect "
        f"from {_fmt_date(inputs.get('joining_date', ''))}."
    )
    pdf.write_body("The terms and conditions of your appointment are as follows:")
    pdf.write_bullet(f"Designation: {inputs.get('designation', '')}")
    pdf.write_bullet(f"Department: {inputs.get('department', '')}")
    pdf.write_bullet(f"Monthly CTC: Rs. {_fmt_salary(inputs.get('salary', ''))}")
    pdf.write_bullet(f"Probation Period: {inputs.get('probation_period', '6 Months')}")
    pdf.write_bullet(f"Work Location: {inputs.get('work_location', 'Ahmedabad')}")
    pdf.write_bullet(f"Working Hours: {inputs.get('working_hours', '9:30 AM to 6:30 PM, Monday to Friday')}")
    pdf.ln(1.5)
    pdf.write_body(
        "You shall maintain strict confidentiality of all proprietary information, "
        "trade secrets, and intellectual property of the company during and after your employment."
    )
    pdf.write_body(
        "During probation, either party may terminate with one month's notice. "
        "After confirmation, a notice period of two months shall be applicable."
    )
    pdf.write_body(
        "Please sign the duplicate copy of this letter as acceptance of the above terms. "
        "We wish you a successful career with Zestbrains Pvt. Ltd."
    )
    pdf.add_signature()
    return pdf


def generate_experience_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("EXPERIENCE LETTER")
    pdf._f("", 9)
    pdf.cell(0, 4.5, "To Whom It May Concern,", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.write_body(
        f"This is to certify that Mr./Ms. {name} (Employee ID: {employee.get('employee_id', '')}) "
        f"was employed with Zestbrains Pvt. Ltd. as {inputs.get('designation', '')} "
        f"from {_fmt_date(inputs.get('joining_date', ''))} to {_fmt_date(inputs.get('last_working_date', ''))}."
    )
    perf = inputs.get('performance_note', 'Their conduct and performance were satisfactory throughout the tenure.')
    pdf.write_body(
        f"During the tenure with us, we found Mr./Ms. {name} to be sincere, dedicated, "
        f"and hardworking. {perf}"
    )
    pdf.write_body(
        f"Mr./Ms. {name} has been relieved from duties on {_fmt_date(inputs.get('last_working_date', ''))} "
        f"and has no dues or liabilities with the company."
    )
    pdf.write_closing(f"We wish Mr./Ms. {name} all the best in future endeavours.")
    pdf.add_signature()
    return pdf


def generate_relieving_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("RELIEVING LETTER")
    pdf.write_to(name)
    pdf.write_subject("Relieving from Services")
    pdf.write_salutation(name)
    pdf.write_body(
        f"This is to inform you that your resignation has been accepted and you are "
        f"being relieved from your duties as {inputs.get('designation', '')} at "
        f"Zestbrains Pvt. Ltd. with effect from {_fmt_date(inputs.get('last_working_date', ''))}."
    )
    pdf.write_body(
        f"You were associated with our organization from {_fmt_date(inputs.get('joining_date', ''))} "
        f"to {_fmt_date(inputs.get('last_working_date', ''))}."
    )
    pdf.write_body(
        "We confirm that all company properties, documents, and assets in your possession "
        "have been returned and your full and final settlement has been processed."
    )
    pdf.write_closing(
        "We appreciate your contributions during your tenure and wish you all the best "
        "in your future endeavours."
    )
    pdf.add_signature()
    return pdf


def generate_internship_appointment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("INTERNSHIP APPOINTMENT LETTER")
    pdf.write_to(name)
    pdf.write_subject("Internship Appointment")
    pdf.write_salutation(name)
    pdf.write_body(
        f"We are pleased to offer you an internship position at Zestbrains Pvt. Ltd. "
        f"in the {inputs.get('department', '')} department."
    )
    pdf.write_body("The details of your internship are as follows:")
    pdf.write_bullet(f"Duration: {inputs.get('internship_duration', '')}")
    pdf.write_bullet(f"Start Date: {_fmt_date(inputs.get('start_date', ''))}")
    pdf.write_bullet(f"End Date: {_fmt_date(inputs.get('end_date', ''))}")
    pdf.write_bullet(f"Department: {inputs.get('department', '')}")
    pdf.write_bullet(f"Monthly Stipend: Rs. {_fmt_salary(inputs.get('stipend', '0'))}")
    pdf.write_bullet(f"Work Location: {inputs.get('work_location', 'Ahmedabad')}")
    pdf.ln(1.5)
    pdf.write_body(
        "During the internship, you will be expected to maintain discipline, follow "
        "company policies, and contribute to the projects assigned to you. "
        "The internship may be terminated by either party with a written notice of 7 days."
    )
    pdf.write_closing("We look forward to a productive association.")
    pdf.add_signature()
    return pdf


def generate_internship_completion_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("INTERNSHIP COMPLETION CERTIFICATE")
    pdf._f("", 9)
    pdf.cell(0, 4.5, "To Whom It May Concern,", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.write_body(
        f"This is to certify that Mr./Ms. {name} has successfully completed an internship "
        f"at Zestbrains Pvt. Ltd. in the {inputs.get('department', '')} department."
    )
    pdf.write_body(
        f"The internship period was from {_fmt_date(inputs.get('start_date', ''))} "
        f"to {_fmt_date(inputs.get('end_date', ''))}."
    )
    pdf.write_body(
        f"During the internship, Mr./Ms. {name} worked on {inputs.get('project_details', 'various projects')} "
        f"and demonstrated {inputs.get('performance_note', 'good technical skills and a keen ability to learn')}."
    )
    pdf.write_closing(f"We wish Mr./Ms. {name} all the best in future academic and professional endeavours.")
    pdf.add_signature()
    return pdf


def generate_increment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("INCREMENT LETTER")
    pdf.write_to(name)
    pdf.write_subject("Revision of Salary")
    pdf.write_salutation(name)
    pdf.write_body(
        f"We are pleased to inform you that based on your performance and contribution "
        f"to the organization, the management has decided to revise your salary with "
        f"effect from {_fmt_date(inputs.get('effective_date', ''))}."
    )
    pdf.write_body("The revised details are as follows:")
    pdf.write_bullet(f"Current Designation: {inputs.get('designation', '')}")
    new_des = inputs.get('new_designation', '')
    if new_des and new_des != inputs.get('designation', ''):
        pdf.write_bullet(f"New Designation: {new_des}")
    pdf.write_bullet(f"Previous Monthly CTC: Rs. {_fmt_salary(inputs.get('old_salary', ''))}")
    pdf.write_bullet(f"Revised Monthly CTC: Rs. {_fmt_salary(inputs.get('new_salary', ''))}")
    pct = inputs.get('increment_percentage', '')
    if pct:
        pdf.write_bullet(f"Increment: {pct}%")
    pdf.write_bullet(f"Effective From: {_fmt_date(inputs.get('effective_date', ''))}")
    pdf.ln(1.5)
    pdf.write_body(
        "We appreciate your hard work and dedication towards the organization. "
        "We hope you will continue to contribute positively and grow with the company."
    )
    pdf.write_closing("Congratulations on your well-deserved increment!")
    pdf.add_signature()
    return pdf


LETTER_GENERATORS = {
    "offer_letter": generate_offer_letter,
    "appointment_letter": generate_appointment_letter,
    "experience_letter": generate_experience_letter,
    "relieving_letter": generate_relieving_letter,
    "internship_appointment": generate_internship_appointment_letter,
    "internship_completion": generate_internship_completion_letter,
    "increment_letter": generate_increment_letter,
}

LETTER_TITLES = {
    "offer_letter": "Offer Letter",
    "appointment_letter": "Appointment Letter",
    "experience_letter": "Experience Letter",
    "relieving_letter": "Relieving Letter",
    "internship_appointment": "Internship Appointment Letter",
    "internship_completion": "Internship Completion Certificate",
    "increment_letter": "Increment Letter",
}


def generate_letter_pdf(letter_type, employee, inputs):
    """Generate PDF and return bytes"""
    generator = LETTER_GENERATORS.get(letter_type)
    if not generator:
        raise ValueError(f"Unknown letter type: {letter_type}")
    pdf = generator(employee, inputs)
    return pdf.output()
