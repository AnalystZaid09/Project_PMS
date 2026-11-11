from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.audit import log_audit_event
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.role import Role, Permission, role_permissions
from app.schemas.role import (
    PermissionResponse, RoleCreate, RolePermissionUpdate, RoleResponse, RoleUpdate
)

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


@router.get("", response_model=List[RoleResponse])
def list_roles(
    current_user: AuthenticatedUserContext = Depends(require_permission("user_right:view")),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).filter(
        (Role.organization_id == current_user.organization_id) | (Role.organization_id.is_(None))
    ).all()
    return roles


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
def create_role(
    role_in: RoleCreate,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_right:add")),
    db: Session = Depends(get_db)
):
    existing = db.query(Role).filter(
        Role.organization_id == current_user.organization_id,
        Role.slug == role_in.slug
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A role with this slug already exists.")

    role = Role(
        organization_id=current_user.organization_id,
        name=role_in.name,
        slug=role_in.slug,
        description=role_in.description,
        is_system=False,
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    if role_in.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = perms
        db.commit()
        db.refresh(role)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ROLE_CREATED",
        entity_type="role",
        entity_id=role.id,
        changes={"name": role.name, "slug": role.slug}
    )
    return role


@router.put("/{role_id}/permissions", response_model=RoleResponse)
def update_role_permissions(
    role_id: str,
    update_in: RolePermissionUpdate,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_right:update")),
    db: Session = Depends(get_db)
):
    role = db.query(Role).filter(
        Role.id == role_id,
        (Role.organization_id == current_user.organization_id) | (Role.organization_id.is_(None))
    ).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    perms = db.query(Permission).filter(Permission.id.in_(update_in.permission_ids)).all()
    role.permissions = perms
    db.commit()
    db.refresh(role)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="ROLE_PERMISSIONS_UPDATED",
        entity_type="role",
        entity_id=role.id,
        changes={"permission_count": len(perms)}
    )
    return role

