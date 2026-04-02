"""
Document/Letter PDF generation for Zestbrains HR Portal
Generates offer letters, experience letters, etc. with company letterhead
"""
import os
import uuid
import base64
from io import BytesIO
from datetime import datetime
from fpdf import FPDF
from pathlib import Path

STATIC_DIR = Path(__file__).parent / "static" / "letterhead"
HEADER_IMG = str(STATIC_DIR / "header.png")
FOOTER_IMG = str(STATIC_DIR / "footer.png")
SIGNATURE_IMG = str(STATIC_DIR / "signature.png")


class LetterPDF(FPDF):
    """Custom PDF class with Zestbrains letterhead"""

    def __init__(self):
        super().__init__(orientation='P', unit='mm', format='A4')
        self.set_auto_page_break(auto=True, margin=45)

    def header(self):
        if os.path.exists(HEADER_IMG):
            self.image(HEADER_IMG, x=0, y=0, w=210)
            self.set_y(40)
        else:
            self.set_y(15)
            self.set_font("Helvetica", "B", 18)
            self.cell(0, 10, "ZESTBRAINS PVT. LTD", align="C", new_x="LMARGIN", new_y="NEXT")
            self.set_y(30)

    def footer(self):
        if os.path.exists(FOOTER_IMG):
            self.image(FOOTER_IMG, x=0, y=262, w=210)

    def add_signature(self):
        """Add authorized signatory at bottom"""
        y_pos = self.get_y() + 10
        if y_pos > 230:
            self.add_page()
            y_pos = self.get_y() + 10
        self.set_y(y_pos)
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, "For ZESTBRAINS PVT. LTD", new_x="LMARGIN", new_y="NEXT")
        if os.path.exists(SIGNATURE_IMG):
            self.image(SIGNATURE_IMG, x=self.get_x(), y=self.get_y() + 2, w=35)
            self.set_y(self.get_y() + 30)
        else:
            self.set_y(self.get_y() + 20)
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 5, "Authorised Signatory", new_x="LMARGIN", new_y="NEXT")

    def write_date_ref(self, date_str, ref_no=""):
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, f"Date: {date_str}", new_x="LMARGIN", new_y="NEXT")
        if ref_no:
            self.cell(0, 6, f"Ref: {ref_no}", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def write_title(self, title):
        self.set_font("Helvetica", "BU", 13)
        self.cell(0, 8, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)

    def write_to(self, name):
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, f"To,", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 6, f"Mr./Ms. {name}", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def write_subject(self, subject):
        self.set_font("Helvetica", "B", 10)
        self.cell(18, 6, "Subject: ")
        self.set_font("Helvetica", "BU", 10)
        self.cell(0, 6, subject, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def write_salutation(self, name):
        self.set_font("Helvetica", "", 10)
        self.cell(0, 6, f"Dear {name},", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def write_body(self, text):
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 6, text)
        self.ln(3)

    def write_body_bold(self, text):
        self.set_font("Helvetica", "B", 10)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def write_bullet(self, text):
        self.set_font("Helvetica", "", 10)
        x = self.get_x()
        self.set_x(x + 5)
        self.multi_cell(0, 6, f"- {text}")
        self.set_x(x)


def _fmt_date(date_str):
    """Format date string to readable format"""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime("%d %B %Y")
    except:
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            return dt.strftime("%d %B %Y")
        except:
            return date_str


def _fmt_salary(amount):
    """Format salary in Indian format"""
    try:
        num = float(amount)
        return f"{num:,.0f}"
    except:
        return str(amount)


def generate_offer_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("OFFER LETTER")
    pdf.write_to(name)
    pdf.write_subject(f"Offer of Employment - {inputs.get('designation', '')}")
    pdf.write_salutation(name)
    pdf.write_body(
        f"We are pleased to offer you the position of {inputs.get('designation', '')} "
        f"at Zestbrains Pvt. Ltd. We were impressed with your background and skills, "
        f"and we believe you will be a valuable addition to our team."
    )
    pdf.write_body(f"The details of your offer are as follows:")
    pdf.write_bullet(f"Position/Designation: {inputs.get('designation', '')}")
    pdf.write_bullet(f"Department: {inputs.get('department', '')}")
    pdf.write_bullet(f"Monthly CTC: Rs. {_fmt_salary(inputs.get('offered_salary', ''))}")
    pdf.write_bullet(f"Date of Joining: {_fmt_date(inputs.get('joining_date', ''))}")
    pdf.write_bullet(f"Probation Period: {inputs.get('probation_period', '6 Months')}")
    pdf.write_bullet(f"Work Location: {inputs.get('work_location', 'Ahmedabad')}")
    pdf.ln(3)
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
    pdf.write_body("Congratulations and welcome to Zestbrains Pvt. Ltd!")
    pdf.add_signature()
    return pdf


def generate_appointment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
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
    pdf.ln(3)
    pdf.write_body(
        "You shall maintain strict confidentiality of all proprietary information, "
        "trade secrets, and intellectual property of the company during and after your employment."
    )
    pdf.write_body(
        "During the probation period, either party may terminate the employment by giving "
        "one month's written notice. After confirmation, a notice period of two months "
        "shall be applicable."
    )
    pdf.write_body(
        "Please sign the duplicate copy of this letter as a token of your acceptance "
        "of the above terms and conditions."
    )
    pdf.write_body("We wish you a successful career with Zestbrains Pvt. Ltd.")
    pdf.add_signature()
    return pdf


def generate_experience_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("EXPERIENCE LETTER")
    pdf.write_body("To Whom It May Concern,")
    pdf.ln(3)
    pdf.write_body(
        f"This is to certify that Mr./Ms. {name} (Employee ID: {employee.get('employee_id', '')}) "
        f"was employed with Zestbrains Pvt. Ltd. as {inputs.get('designation', '')} "
        f"from {_fmt_date(inputs.get('joining_date', ''))} to {_fmt_date(inputs.get('last_working_date', ''))}."
    )
    pdf.write_body(
        f"During the tenure with us, we found Mr./Ms. {name} to be sincere, dedicated, "
        f"and hardworking. {inputs.get('performance_note', 'Their conduct and performance were satisfactory throughout the tenure.')} "
    )
    pdf.write_body(
        f"Mr./Ms. {name} has been relieved from duties on {_fmt_date(inputs.get('last_working_date', ''))} "
        f"and has no dues or liabilities with the company."
    )
    pdf.write_body(
        f"We wish Mr./Ms. {name} all the best in future endeavours."
    )
    pdf.add_signature()
    return pdf


def generate_relieving_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
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
    pdf.write_body(
        f"We appreciate your contributions during your tenure and wish you all the best "
        f"in your future endeavours."
    )
    pdf.add_signature()
    return pdf


def generate_internship_appointment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
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
    pdf.write_bullet(f"Working Hours: {inputs.get('working_hours', '9:30 AM to 6:30 PM, Monday to Friday')}")
    pdf.ln(3)
    pdf.write_body(
        "During the internship, you will be expected to maintain discipline, follow "
        "company policies, and contribute to the projects assigned to you."
    )
    pdf.write_body(
        "The internship may be terminated by either party with a written notice of 7 days."
    )
    pdf.write_body("We look forward to a productive association.")
    pdf.add_signature()
    return pdf


def generate_internship_completion_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
    pdf.write_title("INTERNSHIP COMPLETION CERTIFICATE")
    pdf.write_body("To Whom It May Concern,")
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
    pdf.write_body(
        f"We wish Mr./Ms. {name} all the best in future academic and professional endeavours."
    )
    pdf.add_signature()
    return pdf


def generate_increment_letter(employee, inputs):
    pdf = LetterPDF()
    pdf.add_page()
    name = employee.get("name", "")
    pdf.write_date_ref(_fmt_date(inputs.get("letter_date", "")), inputs.get("ref_no", ""))
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
    new_designation = inputs.get('new_designation', '')
    if new_designation and new_designation != inputs.get('designation', ''):
        pdf.write_bullet(f"New Designation: {new_designation}")
    pdf.write_bullet(f"Previous Monthly CTC: Rs. {_fmt_salary(inputs.get('old_salary', ''))}")
    pdf.write_bullet(f"Revised Monthly CTC: Rs. {_fmt_salary(inputs.get('new_salary', ''))}")
    increment_pct = inputs.get('increment_percentage', '')
    if increment_pct:
        pdf.write_bullet(f"Increment: {increment_pct}%")
    pdf.write_bullet(f"Effective From: {_fmt_date(inputs.get('effective_date', ''))}")
    pdf.ln(3)
    pdf.write_body(
        "We appreciate your hard work and dedication towards the organization. "
        "We hope you will continue to contribute positively and grow with the company."
    )
    pdf.write_body("Congratulations on your well-deserved increment!")
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
