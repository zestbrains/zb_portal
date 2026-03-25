"""Leave models"""
from pydantic import BaseModel
from typing import List, Optional

class LeaveDateInput(BaseModel):
    date: str
    day_type: str = "full"  # full or half

class LeaveApplication(BaseModel):
    from_date: str
    to_date: str
    leave_type: Optional[str] = None  # Optional - Admin/HR will set this during approval
    reason: str
    leave_dates: Optional[List[LeaveDateInput]] = None  # New: support multiple dates with half-day

class LeaveDateType(BaseModel):
    date: str
    leave_type: str  # PL, CL, Half PL, Half CL, PL/2 & CL/2, or "Rejected"
    reject_reason: Optional[str] = ""  # Mandatory if leave_type is "Rejected"

class LeaveApproval(BaseModel):
    status: str  # approved, rejected, or partial (for partial approval/rejection)
    comments: Optional[str] = ""
    reject_reason: Optional[str] = ""
    leave_dates: Optional[List[LeaveDateType]] = []

class LeaveApplicationUpdate(BaseModel):
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    leave_type: Optional[str] = None
    reason: Optional[str] = None
    leave_dates: Optional[List[LeaveDateInput]] = None

class AdminLeaveApplicationUpdate(BaseModel):
    employee_id: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    leave_type: Optional[str] = None
    reason: Optional[str] = None
    leave_dates: Optional[List[LeaveDateInput]] = None

class EncashmentRequest(BaseModel):
    employee_id: str
    amount: float