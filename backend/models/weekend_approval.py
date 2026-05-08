"""Weekend approval models"""
from pydantic import BaseModel
from typing import Optional

class WeekendApprovalCreate(BaseModel):
    project_code: str
    hours: float
    work_details: str
    date: str

class WeekendApprovalAction(BaseModel):
    approved_date: Optional[str] = None  # Admin can edit date
    approved_hours: Optional[float] = None  # Admin can edit hours
    rejection_reason: Optional[str] = ""
    is_compensation: Optional[bool] = False  # For future use