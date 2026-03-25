"""Work entry models"""
from pydantic import BaseModel, ConfigDict
from typing import Optional

class WorkEntryCreate(BaseModel):
    project_code: str  # Changed from project_id to project_code
    hours: float
    work_details: str
    date: str

class WorkEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    date: str
    project_code: str  # Changed from project_id to project_code
    hours: float
    work_details: str
    created_at: str

class AdminWorkEntryCreate(BaseModel):
    employee_id: str
    project_code: str
    hours: float
    work_details: str
    date: str

class WorkEntryUpdate(BaseModel):
    project_code: Optional[str] = None
    hours: Optional[float] = None
    work_details: Optional[str] = None
    date: Optional[str] = None