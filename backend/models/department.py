"""Department models"""
from pydantic import BaseModel, ConfigDict
from typing import Optional

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class Department(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: str
    updated_at: str