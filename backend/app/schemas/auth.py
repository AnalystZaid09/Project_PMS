from typing import List, Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    username_or_email: str
    password: str
    branch_id: Optional[str] = None


class UserProfileBranch(BaseModel):
    id: str
    branch_code: str
    name: str
    city: str
    country: str
    is_default: bool


class CurrentUserResponse(BaseModel):
    id: str
    organization_id: str
    organization_name: str
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_superadmin: bool
    roles: List[str]
    permissions: List[str]
    active_branch_id: Optional[str] = None
    active_branch_name: Optional[str] = None
    allowed_branches: List[UserProfileBranch]


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

