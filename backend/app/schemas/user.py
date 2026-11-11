from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    password: str
    role_ids: List[str] = []
    branch_ids: List[str] = []
    default_branch_id: Optional[str] = None
    is_superadmin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None
    role_ids: Optional[List[str]] = None
    branch_ids: Optional[List[str]] = None
    default_branch_id: Optional[str] = None


class UserBranchInfo(BaseModel):
    id: str
    branch_code: str
    name: str
    city: str
    is_default: bool

    model_config = ConfigDict(from_attributes=True)


class UserRoleInfo(BaseModel):
    id: str
    name: str
    slug: str

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    id: str
    organization_id: str
    is_active: bool
    is_email_verified: bool
    is_superadmin: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    roles: List[UserRoleInfo] = []
    branches: List[UserBranchInfo] = []

    model_config = ConfigDict(from_attributes=True)
