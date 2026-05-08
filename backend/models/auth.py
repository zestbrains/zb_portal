"""Authentication models"""
from pydantic import BaseModel

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "admin"  # admin or hr