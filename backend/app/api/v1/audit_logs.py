from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse
from app.schemas.analytics_communication import AuditLogStatsResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit & Activity"])


@router.get("/stats", response_model=AuditLogStatsResponse)
def get_audit_log_stats(
    current_user: AuthenticatedUserContext = Depends(require_permission("audit_logs:view")),
    db: Session = Depends(get_db),
):
    """
    Summary stats of audit events categorized by domain.
    """
    base = db.query(AuditLog).filter(AuditLog.organization_id == current_user.organization_id)

    total_logs = base.count()

    login_events = base.filter(
        (AuditLog.action.ilike("%LOGIN%")) | (AuditLog.action.ilike("%LOGOUT%"))
    ).count()

    clinical_events = base.filter(
        (AuditLog.entity_type.in_(["ClinicalReport", "ReportVersion", "Case", "Patient"])) |
        (AuditLog.action.in_(["REPORT_DRAFTED", "REPORT_SUBMITTED", "REPORT_VERIFIED", "REPORT_FINALIZED", "REPORT_AMENDED"]))
    ).count()

    financial_events = base.filter(
        (AuditLog.entity_type.in_(["Invoice", "Payment", "FinancialRegister"])) |
        (AuditLog.action.in_(["PAYMENT_COLLECTED", "REFUND_ISSUED", "VOUCHER_CREATED"]))
    ).count()

    master_events = base.filter(
        AuditLog.entity_type.in_([
            "Department", "City", "Doctor", "Investigation", "PatientCategory",
            "DoctorCategory", "OtherChargeType", "EmailTemplate", "ReportTemplate", "User", "Branch"
        ])
    ).count()

    return AuditLogStatsResponse(
        total_logs=total_logs,
        login_events=login_events,
        clinical_events=clinical_events,
        financial_events=financial_events,
        master_events=master_events,
    )


@router.get("", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action name"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    user_id: Optional[str] = Query(None, description="Filter by operator user ID"),
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    search: Optional[str] = Query(None, description="Search keyword in changes, entity, or IP"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: AuthenticatedUserContext = Depends(require_permission("audit_logs:view")),
    db: Session = Depends(get_db),
):
    """
    List audit logs matching nineteenth_tab_user_activity.png with advanced domain filters.
    """
    query = db.query(AuditLog, User.full_name).outerjoin(
        User, User.id == AuditLog.user_id
    ).filter(AuditLog.organization_id == current_user.organization_id)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        start_dt = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        query = query.filter(AuditLog.created_at >= start_dt)
    if date_to:
        end_dt = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        query = query.filter(AuditLog.created_at <= end_dt)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (AuditLog.action.ilike(s)) |
            (AuditLog.entity_type.ilike(s)) |
            (AuditLog.entity_id.ilike(s)) |
            (AuditLog.ip_address.ilike(s)) |
            (AuditLog.changes_json.ilike(s))
        )

    results = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

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
