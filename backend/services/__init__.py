"""Services module"""
from .auth_service import (
    hash_password, verify_password, create_access_token,
    get_current_user, require_role
)
from .email_service import send_leave_notification_email

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "get_current_user",
    "require_role",
    "send_leave_notification_email"
]