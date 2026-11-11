from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit & Activity"])


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(50, ge=1, le=200),
    current_user: AuthenticatedUserContext = Depends(require_permission("audit_logs:view")),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog, User.full_name).outerjoin(
        User, User.id == AuditLog.user_id
    ).filter(AuditLog.organization_id == current_user.organization_id)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    results = query.order_by(AuditLog.created_at.desc()).limit(limit).all()

    return [
        AuditLogResponse(
            id=log.id,
            organization_id=log.organization_id,
            branch_id=log.branch_id,
            user_id=log.user_id,
            user_name=user_name or "System",
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            ip_address=log.ip_address,
            changes_json=log.changes_json,
            created_at=log.created_at,
        ) for log, user_name in results
    ]

