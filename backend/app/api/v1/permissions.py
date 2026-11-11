from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.role import Permission
from app.schemas.role import PermissionResponse

router = APIRouter(prefix="/permissions", tags=["Roles & Permissions"])


@router.get("", response_model=List[PermissionResponse])
def list_all_permissions(
    current_user: AuthenticatedUserContext = Depends(require_permission("user_right:view")),
    db: Session = Depends(get_db)
):
    return db.query(Permission).order_by(Permission.module.asc(), Permission.action.asc()).all()
