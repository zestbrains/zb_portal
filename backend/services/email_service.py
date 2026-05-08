"""Email service for sending notifications"""
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List

from database import get_database
from utils.date_utils import get_ist_now

db = get_database()

async def send_leave_notification_email(
    employee_email: str,
    employee_name: str,
    leave_type: str,
    applied_dates: List[str],
    approved_dates: List[dict],  # [{date, type}]
    rejected_dates: List[dict],  # [{date, reason}]
    status: str,  # approved, rejected, partial
    approved_by: str,
    comments: str = ""
):
    """Send leave approval/rejection email to employee"""
    try:
        # Get email configuration from database
        email_config = await db.email_config.find_one({}, {"_id": 0})
        if not email_config or not email_config.get("is_enabled"):
            logging.info("Email notifications disabled or not configured")
            return False
        
        smtp_host = email_config.get("smtp_host", "smtp.gmail.com")
        smtp_port = email_config.get("smtp_port", 587)
        smtp_email = email_config.get("smtp_email", "hr.zestbrains@gmail.com")
        smtp_password = email_config.get("smtp_password", "")
        enable_ssl = email_config.get("enable_ssl", True)
        cc_emails = email_config.get("cc_emails", "")
        
        if not smtp_password:
            logging.warning("SMTP password not configured")
            return False
        
        # Build email content
        now_ist = get_ist_now().strftime("%d %b %Y, %I:%M %p IST")
        
        subject = f"Leave Application {status.upper()} - {employee_name}"
        
        # Build HTML email body
        approved_dates_html = ""
        if approved_dates:
            approved_dates_html = "<h3 style='color: #16a34a;'>✓ Approved Dates:</h3><ul>"
            for d in approved_dates:
                approved_dates_html += f"<li>{d['date']} - {d['type']}</li>"
            approved_dates_html += "</ul>"
        
        rejected_dates_html = ""
        if rejected_dates:
            rejected_dates_html = "<h3 style='color: #dc2626;'>✗ Rejected Dates:</h3><ul>"
            for d in rejected_dates:
                rejected_dates_html += f"<li>{d['date']} - Reason: {d['reason']}</li>"
            rejected_dates_html += "</ul>"
        
        status_color = "#16a34a" if status == "approved" else "#dc2626" if status == "rejected" else "#d97706"
        status_text = "APPROVED" if status == "approved" else "REJECTED" if status == "rejected" else "PARTIALLY APPROVED"
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4f46e5;">Zestbrains - Leave Application Update</h2>
                <hr style="border: 1px solid #e5e7eb;">
                
                <p>Dear <strong>{employee_name}</strong>,</p>
                
                <p>Your leave application has been <span style="color: {status_color}; font-weight: bold;">{status_text}</span>.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Employee Name</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">{employee_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Leave Type</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">{leave_type or 'As per dates below'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Applied Dates</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">{', '.join(applied_dates)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Approved By</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">{approved_by}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;"><strong>Date of Action</strong></td>
                        <td style="padding: 8px; border: 1px solid #e5e7eb;">{now_ist}</td>
                    </tr>
                </table>
                
                {approved_dates_html}
                {rejected_dates_html}
                
                {"<p><strong>Comments:</strong> " + comments + "</p>" if comments else ""}
                
                <hr style="border: 1px solid #e5e7eb; margin-top: 30px;">
                <p style="color: #6b7280; font-size: 12px;">
                    This is an automated email from Zestbrains HR Portal. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_email
        msg['To'] = employee_email
        
        # Add CC if configured
        cc_list = [e.strip() for e in cc_emails.split(',') if e.strip()]
        if cc_list:
            msg['Cc'] = ', '.join(cc_list)
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        all_recipients = [employee_email] + cc_list
        
        if enable_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls(context=context)
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, all_recipients, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, all_recipients, msg.as_string())
        
        logging.info(f"Leave notification email sent to {employee_email}")
        return True
        
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False