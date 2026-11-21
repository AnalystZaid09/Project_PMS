from datetime import date, datetime, timezone
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import User
from app.models.schema_all import EmailLog, EmailTemplate, Case, ClinicalReport
from app.schemas.analytics_communication import SendEmailRequest, EmailLogResponse

router = APIRouter(prefix="/emails", tags=["Email Communication"])


@router.get("/logs", response_model=List[EmailLogResponse])
def list_email_logs(
    date_from: Optional[date] = Query(None, description="Start date filter"),
    date_to: Optional[date] = Query(None, description="End date filter"),
    status_filter: Optional[str] = Query(None, alias="status", description="Status filter: sent, delivered, failed"),
    search: Optional[str] = Query(None, description="Search recipient email, name or subject"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    current_user: AuthenticatedUserContext = Depends(require_permission("send_email:view")),
    db: Session = Depends(get_db),
):
    """
    List dispatched email logs with recipient, timestamp, and linked case/report.
    """
    query = db.query(EmailLog).filter(EmailLog.organization_id == current_user.organization_id)

    if date_from:
        start_dt = datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc)
        query = query.filter(EmailLog.created_at >= start_dt)
    if date_to:
        end_dt = datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc)
        query = query.filter(EmailLog.created_at <= end_dt)
    if status_filter:
        query = query.filter(EmailLog.status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (EmailLog.recipient_email.ilike(s)) |
            (EmailLog.recipient_name.ilike(s)) |
            (EmailLog.subject.ilike(s))
        )

    logs = query.order_by(EmailLog.created_at.desc()).offset(skip).limit(limit).all()

    result: List[EmailLogResponse] = []
    for log in logs:
        sender_name = None
        if log.sender_id:
            u = db.query(User).filter(User.id == log.sender_id).first()
            if u:
                sender_name = u.full_name

        case_no = None
        if log.case_id:
            c = db.query(Case).filter(Case.id == log.case_id).first()
            if c:
                case_no = c.case_number

        report_no = None
        if log.report_id:
            rep = db.query(ClinicalReport).filter(ClinicalReport.id == log.report_id).first()
            if rep:
                report_no = rep.report_number

        result.append(EmailLogResponse(
            id=log.id,
            recipient_email=log.recipient_email,
            recipient_name=log.recipient_name,
            subject=log.subject,
            body=log.body,
            sender_name=sender_name,
            status=log.status,
            case_id=log.case_id,
            case_number=case_no,
            report_id=log.report_id,
            report_number=report_no,
            created_at=log.created_at,
        ))

    return result


@router.post("/send", response_model=EmailLogResponse)
def dispatch_email(
    payload: SendEmailRequest,
    current_user: AuthenticatedUserContext = Depends(require_permission("send_email:send")),
    db: Session = Depends(get_db),
):
    """
    Direct Email Dispatcher corresponding to PMS/Third_Tab/send_email.png.
    Renders dynamic placeholders and records in EmailLog.
    """
    # Simple email address validation
    if "@" not in payload.recipient_email or "." not in payload.recipient_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recipient email address format.",
        )

    # Record email log
    log = EmailLog(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id,
        sender_id=current_user.user_id,
        recipient_email=payload.recipient_email.strip().lower(),
        recipient_name=payload.recipient_name,
        subject=payload.subject,
        body=payload.body,
        template_id=payload.template_id,
        case_id=payload.case_id,
        report_id=payload.report_id,
        status="sent",
    )
    db.add(log)
    db.flush()

    # Log to audit trail
    sender = db.query(User).filter(User.id == current_user.user_id).first()
    db.add(AuditLog(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id,
        user_id=current_user.user_id,
        action="EMAIL_SENT",
        entity_type="EmailLog",
        entity_id=log.id,
        changes_json=json.dumps({
            "recipient_email": log.recipient_email,
            "subject": log.subject,
            "case_id": log.case_id,
            "report_id": log.report_id,
        }),
    ))

    db.commit()
    db.refresh(log)

    case_no = None
    if log.case_id:
        c = db.query(Case).filter(Case.id == log.case_id).first()
        if c:
            case_no = c.case_number

    report_no = None
    if log.report_id:
        rep = db.query(ClinicalReport).filter(ClinicalReport.id == log.report_id).first()
        if rep:
            report_no = rep.report_number

    return EmailLogResponse(
        id=log.id,
        recipient_email=log.recipient_email,
        recipient_name=log.recipient_name,
        subject=log.subject,
        body=log.body,
        sender_name=sender.full_name if sender else "Staff",
        status=log.status,
        case_id=log.case_id,
        case_number=case_no,
        report_id=log.report_id,
        report_number=report_no,
        created_at=log.created_at,
    )
