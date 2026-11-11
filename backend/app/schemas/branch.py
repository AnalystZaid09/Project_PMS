from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class BranchBase(BaseModel):
    branch_code: str
    name: str
    country: str
    state: str
    city: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class BranchCreate(BranchBase):
    organization_id: Optional[str] = None


class BranchUpdate(BaseModel):
    branch_code: Optional[str] = None
    name: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None


class BranchResponse(BranchBase):
    id: str
    organization_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
