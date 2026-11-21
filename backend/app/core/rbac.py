from typing import List, Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserBranchAccess, UserRole
from app.models.role import Role, Permission, role_permissions

security = HTTPBearer(auto_error=False)


class AuthenticatedUserContext:
    def __init__(self, user: User, permissions: List[str], role_slugs: List[str], branch_ids: List[str], active_branch_id: Optional[str] = None):
        self.user = user
        self.id = user.id
        self.user_id = user.id
        self.organization_id = user.organization_id
        self.username = user.username
        self.email = user.email
        self.full_name = user.full_name
        self.is_superadmin = user.is_superadmin
        self.permissions = set(permissions)
        self.role_slugs = set(role_slugs)
        self.branch_ids = set(branch_ids)
        self.active_branch_id = active_branch_id or user.default_branch_id

    def has_permission(self, permission_code: str) -> bool:
        if self.is_superadmin:
            return True
        return permission_code in self.permissions

    def has_role(self, role_slug: str) -> bool:
        if self.is_superadmin:
            return True
        return role_slug in self.role_slugs

    def has_branch_access(self, branch_id: str) -> bool:
        if self.is_superadmin:
            return True
        return branch_id in self.branch_ids


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db)
) -> AuthenticatedUserContext:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        active_branch_id = payload.get("branch_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: subject missing.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive. Please contact your administrator.",
        )

    # Collect user's roles
    user_roles = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == user.id).all()
    role_slugs = [r.slug for r in user_roles]
    role_ids = [r.id for r in user_roles]

    # Collect permissions from all assigned roles
    if role_ids:
        perms = db.query(Permission.code).join(
            role_permissions, role_permissions.c.permission_id == Permission.id
        ).filter(role_permissions.c.role_id.in_(role_ids)).all()
        permission_codes = [p[0] for p in perms]
    else:
        permission_codes = []

    # Collect permitted branch IDs
    branches = db.query(UserBranchAccess.branch_id).filter(UserBranchAccess.user_id == user.id).all()
    branch_ids = [b[0] for b in branches]

    return AuthenticatedUserContext(
        user=user,
        permissions=permission_codes,
        role_slugs=role_slugs,
        branch_ids=branch_ids,
        active_branch_id=active_branch_id
    )


def require_permission(permission_code: str):
    """Dependency factory that enforces a specific permission code on the endpoint."""
    def permission_checker(current_user: AuthenticatedUserContext = Depends(get_current_user)) -> AuthenticatedUserContext:
        if not current_user.has_permission(permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Missing required permission '{permission_code}'.",
            )
        return current_user
    return permission_checker


def require_branch_access(branch_id: str, current_user: AuthenticatedUserContext):
    """Helper to verify that the active user can read or modify the specified branch."""
    if not current_user.has_branch_access(branch_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cross-branch access denied. You are not authorized for branch '{branch_id}'.",
        )

