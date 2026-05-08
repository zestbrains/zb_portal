"""Holiday models"""
from pydantic import BaseModel, ConfigDict
from typing import Optional

class HolidayCreate(BaseModel):
    name: str
    date: str
    description: Optional[str] = ""

class Holiday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    date: str
    description: Optional[str] = ""
    created_at: str