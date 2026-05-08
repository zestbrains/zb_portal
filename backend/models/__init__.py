"""Pydantic models for the application"""
from .auth import UserLogin, Token, AdminUserCreate
from .department import DepartmentCreate, Department
from .employee import EmployeeCreate, EmployeeUpdate, Employee
from .project import ProjectCreate, ProjectUpdate, Project
from .work_entry import WorkEntryCreate, WorkEntry, AdminWorkEntryCreate, WorkEntryUpdate
from .holiday import HolidayCreate, Holiday
from .weekend_approval import WeekendApprovalCreate, WeekendApprovalAction
from .leave import (
    LeaveDateInput, LeaveApplication, LeaveDateType, 
    LeaveApproval, LeaveApplicationUpdate, AdminLeaveApplicationUpdate,
    EncashmentRequest
)
from .email_config import EmailConfigUpdate

__all__ = [
    "UserLogin", "Token", "AdminUserCreate",
    "DepartmentCreate", "Department",
    "EmployeeCreate", "EmployeeUpdate", "Employee",
    "ProjectCreate", "ProjectUpdate", "Project",
    "WorkEntryCreate", "WorkEntry", "AdminWorkEntryCreate", "WorkEntryUpdate",
    "HolidayCreate", "Holiday",
    "WeekendApprovalCreate", "WeekendApprovalAction",
    "LeaveDateInput", "LeaveApplication", "LeaveDateType",
    "LeaveApproval", "LeaveApplicationUpdate", "AdminLeaveApplicationUpdate",
    "EncashmentRequest",
    "EmailConfigUpdate"
]