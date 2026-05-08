"""Employee models"""
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional

class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    phone: str
    department_ids: List[str]  # Changed to support multiple departments
    experience: str
    password: str
    joining_date: str
    birth_date: Optional[str] = None  # New field
    team_leader_ids: Optional[List[str]] = []  # Assigned team leaders

class EmployeeUpdate(BaseModel):
    employee_id: Optional[str] = None  # Now editable
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_ids: Optional[List[str]] = None  # Changed to support multiple departments
    experience: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[str] = None  # New field
    joining_date: Optional[str] = None  # Now editable
    team_leader_ids: Optional[List[str]] = None  # Assigned team leaders

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    name: str
    email: str
    phone: str
    department_ids: List[str] = []  # Changed to support multiple departments
    department_id: Optional[str] = ""  # Keep for backward compatibility
    role: str
    experience: Optional[str] = ""
    joining_date: str
    birth_date: Optional[str] = None  # New field
    team_leader_ids: List[str] = []  # Assigned team leaders
    status: str
    probation_end_date: str
    annual_pl_allocation: int
    pl_taken: float
    cl_taken: float
    created_at: str
    updated_at: str