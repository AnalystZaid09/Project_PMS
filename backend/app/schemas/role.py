from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PermissionBase(BaseModel):
    module: str
    action: str
    code: str
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: Optional[List[str]] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[str]] = None


class RoleResponse(RoleBase):
    id: str
    is_system: bool
    permissions: List[PermissionResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RolePermissionUpdate(BaseModel):
    role_id: str
    permission_ids: List[str]
