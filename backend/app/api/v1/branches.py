from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.audit import log_audit_event
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.branch import Branch
from app.schemas.branch import BranchCreate, BranchResponse, BranchUpdate

router = APIRouter(prefix="/branches", tags=["Branch Management"])


@router.get("", response_model=List[BranchResponse])
def list_branches(
    search: Optional[str] = Query(None, description="Search by branch name, code, city, or country"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: AuthenticatedUserContext = Depends(require_permission("branch_master:view")),
    db: Session = Depends(get_db)
):
    query = db.query(Branch).filter(Branch.organization_id == current_user.organization_id)
    if is_active is not None:
        query = query.filter(Branch.is_active == is_active)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Branch.name.ilike(pattern),
                Branch.branch_code.ilike(pattern),
                Branch.city.ilike(pattern),
                Branch.country.ilike(pattern),
            )
        )
    return query.order_by(Branch.branch_code.asc()).all()


@router.post("", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
def create_branch(
    branch_in: BranchCreate,
    current_user: AuthenticatedUserContext = Depends(require_permission("branch_master:add")),
    db: Session = Depends(get_db)
):
    # Check if branch code exists in organization
    existing = db.query(Branch).filter(
        Branch.organization_id == current_user.organization_id,
        Branch.branch_code == branch_in.branch_code
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Branch code '{branch_in.branch_code}' already exists.")

    branch = Branch(
        organization_id=current_user.organization_id,
        branch_code=branch_in.branch_code,
        name=branch_in.name,
        country=branch_in.country,
        state=branch_in.state,
        city=branch_in.city,
        address=branch_in.address,
        phone=branch_in.phone,
        email=branch_in.email,
        is_active=True,
    )
    db.add(branch)
    db.commit()
    db.refresh(branch)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=branch.id,
        user_id=current_user.id,
        action="BRANCH_CREATED",
        entity_type="branch",
        entity_id=branch.id,
        changes={"name": branch.name, "code": branch.branch_code}
    )
    return branch


@router.get("/{branch_id}", response_model=BranchResponse)
def get_branch(
    branch_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("branch_master:view")),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.organization_id == current_user.organization_id
    ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")
    return branch


@router.put("/{branch_id}", response_model=BranchResponse)
def update_branch(
    branch_id: str,
    branch_in: BranchUpdate,
    current_user: AuthenticatedUserContext = Depends(require_permission("branch_master:update")),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.organization_id == current_user.organization_id
    ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    update_data = branch_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(branch, field, val)
    db.commit()
    db.refresh(branch)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=branch.id,
        user_id=current_user.id,
        action="BRANCH_UPDATED",
        entity_type="branch",
        entity_id=branch.id,
        changes=update_data
    )
    return branch


@router.patch("/{branch_id}/toggle-status", response_model=BranchResponse)
def toggle_branch_status(
    branch_id: str,
    current_user: AuthenticatedUserContext = Depends(require_permission("branch_master:update")),
    db: Session = Depends(get_db)
):
    branch = db.query(Branch).filter(
        Branch.id == branch_id,
        Branch.organization_id == current_user.organization_id
    ).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found.")

    branch.is_active = not branch.is_active
    db.commit()
    db.refresh(branch)

    log_audit_event(
        db=db,
        organization_id=current_user.organization_id,
        branch_id=branch.id,
        user_id=current_user.id,
        action="BRANCH_STATUS_TOGGLED",
        entity_type="branch",
        entity_id=branch.id,
        changes={"is_active": branch.is_active}
    )
    return branch

