"""Project models"""
from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class ProjectCreate(BaseModel):
    name: str
    type: str
    project_code: str
    start_date: str
    end_date: Optional[str] = ""  # Made optional - not required for late logic
    completed_hours: float = 0.0
    assigned_employees: List[str]
    status: str
    client_username: str
    scope_of_work: str
    timesheet_link: str
    is_late: Optional[bool] = False  # Manual late marking

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    project_code: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    completed_hours: Optional[float] = None
    assigned_employees: Optional[List[str]] = None
    status: Optional[str] = None
    client_username: Optional[str] = None
    scope_of_work: Optional[str] = None
    timesheet_link: Optional[str] = None
    is_late: Optional[bool] = None  # Manual late marking

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    type: str
    project_code: str
    start_date: str
    end_date: Optional[str] = ""
    completed_hours: float
    assigned_employees: List[str]
    status: str
    client_username: str
    scope_of_work: str
    timesheet_link: str
    is_late: bool = False
    created_at: str
    updated_at: str