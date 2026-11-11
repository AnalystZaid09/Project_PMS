from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.audit import log_audit_event
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.branch import Branch
from app.models.role import Role
from app.models.user import User, UserBranchAccess, UserRole
from app.schemas.user import UserBranchInfo, UserCreate, UserResponse, UserRoleInfo, UserUpdate

router = APIRouter(prefix="/users", tags=["User Administration"])


def format_user_response(user: User, db: Session) -> UserResponse:
    # Query roles
    user_roles = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == user.id).all()
    roles_info = [UserRoleInfo(id=r.id, name=r.name, slug=r.slug) for r in user_roles]

    # Query branches
    user_branches = db.query(Branch, UserBranchAccess.is_default).join(
        UserBranchAccess, UserBranchAccess.branch_id == Branch.id
    ).filter(UserBranchAccess.user_id == user.id).all()
    branches_info = [
        UserBranchInfo(
            id=b.id,
            branch_code=b.branch_code,
            name=b.name,
            city=b.city,
            is_default=is_def
        ) for b, is_def in user_branches
    ]

    return UserResponse(
        id=user.id,
        organization_id=user.organization_id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_active=user.is_active,
        is_email_verified=user.is_email_verified,
        is_superadmin=user.is_superadmin,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
        roles=roles_info,
        branches=branches_info,
    )


@router.get("", response_model=List[UserResponse])
def list_users(
    search: Optional[str] = Query(None, description="Search by username, full name, or email"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: AuthenticatedUserContext = Depends(require_permission("user_master:view")),
    db: Session = Depends(get_db)
):
    query = db.query(User).filter(User.organization_id == current_user.organization_id)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.username.ilike(pattern),
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    users = query.order_by(User.created_at.desc()).all()
    return [format_user_response(u, db) for u in users]


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_master:add")),
    db: Session = Depends(get_db)
):
    # Check duplicate username or email
    existing = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that username or email already exists."
        )

    user = User(
        organization_id=current_user.organization_id,
        default_branch_id=user_in.default_branch_id,
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=get_password_hash(user_in.password),
        phone=user_in.phone,
        avatar_url=user_in.avatar_url,
        is_active=True,
        is_email_verified=True,
        is_superadmin=user_in.is_superadmin and current_user.is_superadmin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Assign roles
    for role_id in user_in.role_ids:
        r = db.query(Role).filter(Role.id == role_id).first()
        if r:
            db.add(UserRole(user_id=user.id, role_id=r.id))

    # Assign branches
    for branch_id in user_in.branch_ids:
        b = db.query(Branch).filter(Branch.id == branch_id).first()
        if b:
            is_def = (b.id == user_in.default_branch_id)
            db.add(UserBranchAccess(user_id=user.id, branch_id=b.id, is_default=is_def))

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=user.default_branch_id,
        user_id=current_user.id,
        action="USER_CREATED",
        entity_type="user",
        entity_id=user.id,
        changes={"username": user.username, "full_name": user.full_name, "email": user.email}
    )

    return format_user_response(user, db)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_master:view")),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return format_user_response(user, db)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    user_in: UserUpdate,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_master:update")),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.phone is not None:
        user.phone = user_in.phone
    if user_in.is_active is not None:
        user.is_active = user_in.is_active
    if user_in.is_email_verified is not None:
        user.is_email_verified = user_in.is_email_verified
    if user_in.default_branch_id is not None:
        user.default_branch_id = user_in.default_branch_id
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)

    # Update roles if provided
    if user_in.role_ids is not None:
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        for r_id in user_in.role_ids:
            db.add(UserRole(user_id=user.id, role_id=r_id))

    # Update branches if provided
    if user_in.branch_ids is not None:
        db.query(UserBranchAccess).filter(UserBranchAccess.user_id == user.id).delete()
        for b_id in user_in.branch_ids:
            db.add(UserBranchAccess(user_id=user.id, branch_id=b_id, is_default=(b_id == user.default_branch_id)))

    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=user.default_branch_id,
        user_id=current_user.id,
        action="USER_UPDATED",
        entity_type="user",
        entity_id=user.id,
        changes={"username": user.username}
    )

    return format_user_response(user, db)


@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    user_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("user_master:update")),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own user account.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=user.default_branch_id,
        user_id=current_user.id,
        action="USER_STATUS_TOGGLED",
        entity_type="user",
        entity_id=user.id,
        changes={"is_active": user.is_active}
    )
    return format_user_response(user, db)
