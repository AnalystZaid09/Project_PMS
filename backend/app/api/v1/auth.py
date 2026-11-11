from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.core.audit import log_audit_event
from app.core.rbac import AuthenticatedUserContext, get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.branch import Branch
from app.models.organization import Organization
from app.models.role import Role, Permission, role_permissions
from app.models.user import User, UserBranchAccess, UserRole
from app.schemas.auth import (
    ChangePasswordRequest, CurrentUserResponse, LoginRequest, TokenResponse, UserProfileBranch
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == login_data.username_or_email) | (User.email == login_data.username_or_email)
    ).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        log_audit_event(
            db=db,
            organization_id=user.organization_id if user else "UNKNOWN",
            action="AUTH_LOGIN_FAILED",
            entity_type="user",
            entity_id=user.id if user else None,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            changes={"attempted_username": login_data.username_or_email}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator.",
        )

    # Resolve allowed branches
    user_branch_records = db.query(Branch, UserBranchAccess.is_default).join(
        UserBranchAccess, UserBranchAccess.branch_id == Branch.id
    ).filter(UserBranchAccess.user_id == user.id, Branch.is_active == True).all()

    # If superadmin, allow all active branches
    if user.is_superadmin and not user_branch_records:
        all_branches = db.query(Branch).filter(Branch.organization_id == user.organization_id, Branch.is_active == True).all()
        allowed_branches = [
            UserProfileBranch(
                id=b.id,
                branch_code=b.branch_code,
                name=b.name,
                city=b.city,
                country=b.country,
                is_default=(b.id == user.default_branch_id)
            ) for b in all_branches
        ]
    else:
        allowed_branches = [
            UserProfileBranch(
                id=b.id,
                branch_code=b.branch_code,
                name=b.name,
                city=b.city,
                country=b.country,
                is_default=is_default
            ) for b, is_default in user_branch_records
        ]

    # Selected branch
    active_branch_id = login_data.branch_id
    if not active_branch_id:
        active_branch_id = user.default_branch_id
        if not active_branch_id and allowed_branches:
            active_branch_id = allowed_branches[0].id

    # Active branch name
    active_branch_name = None
    if active_branch_id:
        b_match = next((b for b in allowed_branches if b.id == active_branch_id), None)
        if b_match:
            active_branch_name = b_match.name
        else:
            b_obj = db.query(Branch).filter(Branch.id == active_branch_id).first()
            if b_obj:
                active_branch_name = b_obj.name

    # Roles and permissions
    user_roles = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == user.id).all()
    role_names = [r.name for r in user_roles]
    role_ids = [r.id for r in user_roles]

    if user.is_superadmin:
        all_perms = db.query(Permission.code).all()
        permission_codes = [p[0] for p in all_perms]
    elif role_ids:
        perms = db.query(Permission.code).join(
            role_permissions, role_permissions.c.permission_id == Permission.id
        ).filter(role_permissions.c.role_id.in_(role_ids)).all()
        permission_codes = [p[0] for p in perms]
    else:
        permission_codes = []

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Create token
    token_claims = {
        "org_id": user.organization_id,
        "branch_id": active_branch_id,
        "roles": role_names,
    }
    access_token = create_access_token(subject=user.id, claims=token_claims)

    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    org_name = org.name if org else "Apex Health Diagnostics"

    # Log successful login audit
    log_audit_event(
        db=db,
        organization_id=user.organization_id,
        branch_id=active_branch_id,
        user_id=user.id,
        action="AUTH_LOGIN_SUCCESS",
        entity_type="user",
        entity_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        changes={"username": user.username}
    )

    current_user_data = CurrentUserResponse(
        id=user.id,
        organization_id=user.organization_id,
        organization_name=org_name,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_superadmin=user.is_superadmin,
        roles=role_names,
        permissions=permission_codes,
        active_branch_id=active_branch_id,
        active_branch_name=active_branch_name,
        allowed_branches=allowed_branches,
    )

    return TokenResponse(access_token=access_token, user=current_user_data)


@router.get("/me", response_model=CurrentUserResponse)
def get_current_user_profile(
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = current_user.user
    org = db.query(Organization).filter(Organization.id == user.organization_id).first()
    org_name = org.name if org else "Apex Health Diagnostics"

    user_branch_records = db.query(Branch, UserBranchAccess.is_default).join(
        UserBranchAccess, UserBranchAccess.branch_id == Branch.id
    ).filter(UserBranchAccess.user_id == user.id, Branch.is_active == True).all()

    if user.is_superadmin and not user_branch_records:
        all_branches = db.query(Branch).filter(Branch.organization_id == user.organization_id, Branch.is_active == True).all()
        allowed_branches = [
            UserProfileBranch(
                id=b.id,
                branch_code=b.branch_code,
                name=b.name,
                city=b.city,
                country=b.country,
                is_default=(b.id == current_user.active_branch_id)
            ) for b in all_branches
        ]
    else:
        allowed_branches = [
            UserProfileBranch(
                id=b.id,
                branch_code=b.branch_code,
                name=b.name,
                city=b.city,
                country=b.country,
                is_default=is_default
            ) for b, is_default in user_branch_records
        ]

    active_branch_name = None
    if current_user.active_branch_id:
        b_match = next((b for b in allowed_branches if b.id == current_user.active_branch_id), None)
        if b_match:
            active_branch_name = b_match.name
        else:
            b_obj = db.query(Branch).filter(Branch.id == current_user.active_branch_id).first()
            if b_obj:
                active_branch_name = b_obj.name

    user_roles = db.query(Role.name).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == user.id).all()
    role_names = [r[0] for r in user_roles]

    return CurrentUserResponse(
        id=user.id,
        organization_id=user.organization_id,
        organization_name=org_name,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        is_superadmin=user.is_superadmin,
        roles=role_names,
        permissions=list(current_user.permissions),
        active_branch_id=current_user.active_branch_id,
        active_branch_name=active_branch_name,
        allowed_branches=allowed_branches,
    )


@router.post("/switch-branch/{branch_id}", response_model=TokenResponse)
def switch_active_branch(
    branch_id: str,
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.is_active == True).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target branch not found or inactive.")

    if not current_user.has_branch_access(branch_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this branch.")

    token_claims = {
        "org_id": current_user.organization_id,
        "branch_id": branch.id,
        "roles": list(current_user.role_slugs),
    }
    new_token = create_access_token(subject=current_user.id, claims=token_claims)

    current_user.active_branch_id = branch.id
    return get_current_user_profile_as_token(current_user, new_token, db)


def get_current_user_profile_as_token(current_user: AuthenticatedUserContext, token: str, db: Session):
    profile = get_current_user_profile(current_user, db)
    return TokenResponse(access_token=token, user=profile)


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = current_user.user
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters.")

    user.password_hash = get_password_hash(data.new_password)
    db.commit()

    log_audit_event(
        db=db,
        organization_id=user.organization_id,
        branch_id=current_user.active_branch_id,
        user_id=user.id,
        action="USER_PASSWORD_CHANGED",
        entity_type="user",
        entity_id=user.id,
        changes={"reason": "Self-service password update"}
    )
    return {"message": "Password changed successfully."}


@router.post("/logout")
def logout(
    current_user: AuthenticatedUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id,
        user_id=current_user.id,
        action="AUTH_LOGOUT",
        entity_type="user",
        entity_id=current_user.id,
    )
    return {"message": "Logged out successfully."}

