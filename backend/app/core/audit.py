import json
import logging
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog

logger = logging.getLogger("pms.audit")


def log_audit_event(
    db: Session,
    organization_id: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    changes: Optional[Dict[str, Any]] = None,
) -> Optional[AuditLog]:
    try:
        changes_str = json.dumps(changes) if changes else None
        audit = AuditLog(
            organization_id=organization_id,
            branch_id=branch_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            user_agent=user_agent,
            changes_json=changes_str,
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        return audit
    except Exception as e:
        logger.error(f"Failed to record audit log for action {action}: {e}")
        db.rollback()
        return None


def log_audit_action(
    db: Session,
    user: Any,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    old_data: Optional[Dict[str, Any]] = None,
    new_data: Optional[Dict[str, Any]] = None,
) -> Optional[AuditLog]:
    changes = {}
    if old_data:
        changes["before"] = old_data
    if new_data:
        changes["after"] = new_data
    return log_audit_event(
        db=db,
        organization_id=getattr(user, "organization_id", None),
        branch_id=getattr(user, "default_branch_id", None),
        user_id=getattr(user, "id", None),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes or None,
    )

