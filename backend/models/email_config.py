"""Email configuration model"""
from pydantic import BaseModel

class EmailConfigUpdate(BaseModel):
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_email: str = "hr.zestbrains@gmail.com"
    smtp_password: str = ""
    enable_ssl: bool = True
    cc_emails: str = ""  # Comma-separated emails
    is_enabled: bool = False