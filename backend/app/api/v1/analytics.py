from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.rbac import AuthenticatedUserContext, require_permission
from app.db.session import get_db
from app.models.organization import Organization
from app.models.branch import Branch
from app.models.schema_all import (
    Patient, Case, CaseItem, Investigation, Department,
    ClinicalReport, Invoice, Payment
)
from app.schemas.analytics_communication import (
    DashboardAnalyticsResponse, DashboardKpiSummary,
    RevenueTrendItem, DepartmentDistributionItem, PriorityBreakdownItem,
    TopInvestigationItem, EmergencyQueueItem, PendingVerificationQueueItem
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Dashboard"])


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    period: str = Query("today", description="Time period filter: today, week, month, year, all"),
    branch_id: Optional[str] = Query(None, description="Optional branch context filter"),
    current_user: AuthenticatedUserContext = Depends(require_permission("analytics:view")),
    db: Session = Depends(get_db),
):
    """
    Real-time executive operational KPIs, revenue trends, and departmental diagnostics breakdown
    corresponding to PMS_Dashboard.png and graph.png.
    """
    now = datetime.now(timezone.utc)
    today_dt = now.date()

    target_branch = branch_id or current_user.active_branch_id

    # Base filters
    def apply_scoping(q, model):
        q = q.filter(model.organization_id == current_user.organization_id)
        if target_branch:
            q = q.filter(model.branch_id == target_branch)
        return q

    # 1. Total Patients
    if target_branch:
        total_patients = db.query(func.count(func.distinct(Case.patient_id))).filter(
            Case.organization_id == current_user.organization_id,
            Case.branch_id == target_branch
        ).scalar() or 0
    else:
        total_patients = db.query(func.count(Patient.id)).filter(
            Patient.organization_id == current_user.organization_id
        ).scalar() or 0

    # 2. Cases counts
    c_base = apply_scoping(db.query(Case), Case)
    today_start = datetime.combine(today_dt, datetime.min.time(), tzinfo=timezone.utc)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    today_cases = c_base.filter(Case.visit_datetime >= today_start).count()
    week_cases = c_base.filter(Case.visit_datetime >= week_start).count()
    month_cases = c_base.filter(Case.visit_datetime >= month_start).count()
    emergency_cases = c_base.filter(
        (Case.priority == "emergency") | (Case.case_category == "emergency")
    ).count()

    # 3. Clinical Reports status breakdown
    rep_query = db.query(ClinicalReport).join(Case, ClinicalReport.case_id == Case.id).filter(
        Case.organization_id == current_user.organization_id
    )
    if target_branch:
        rep_query = rep_query.filter(Case.branch_id == target_branch)

    draft_reports = rep_query.filter(ClinicalReport.status == "draft").count()
    pending_verification_reports = rep_query.filter(ClinicalReport.status == "submitted").count()
    finalized_reports = rep_query.filter(ClinicalReport.status.in_(["verified", "finalized"])).count()

    # 4. Financial KPIs
    inv_base = apply_scoping(db.query(Invoice), Invoice)
    today_rev = inv_base.filter(Invoice.created_at >= today_start).with_entities(func.sum(Invoice.grand_total)).scalar() or Decimal("0.00")
    month_rev = inv_base.filter(Invoice.created_at >= month_start).with_entities(func.sum(Invoice.grand_total)).scalar() or Decimal("0.00")
    total_rev = inv_base.with_entities(func.sum(Invoice.grand_total)).scalar() or Decimal("0.00")
    outstanding_dues = inv_base.with_entities(func.sum(Invoice.outstanding_balance)).scalar() or Decimal("0.00")

    # 5. Revenue Trends (Past 14 Days)
    revenue_trends: List[RevenueTrendItem] = []
    for d_offset in range(13, -1, -1):
        target_day = today_dt - timedelta(days=d_offset)
        day_start = datetime.combine(target_day, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(target_day, datetime.max.time(), tzinfo=timezone.utc)

        day_inv = apply_scoping(db.query(func.sum(Invoice.grand_total)), Invoice).filter(
            Invoice.created_at >= day_start, Invoice.created_at <= day_end
        ).scalar() or Decimal("0.00")

        day_coll = apply_scoping(db.query(func.sum(Payment.amount)), Payment).filter(
            Payment.created_at >= day_start, Payment.created_at <= day_end, Payment.is_refund == False
        ).scalar() or Decimal("0.00")

        revenue_trends.append(RevenueTrendItem(
            date=target_day.strftime("%d %b"),
            revenue=Decimal(str(day_inv)).quantize(Decimal("0.01")),
            collections=Decimal(str(day_coll)).quantize(Decimal("0.01")),
        ))

    # 6. Department Distribution
    dept_query = db.query(
        Department.id,
        Department.name,
        func.count(Case.id).label("case_cnt"),
        func.coalesce(func.sum(Case.net_amount), 0).label("tot_rev")
    ).join(
        Case, Case.department_id == Department.id
    ).filter(
        Department.organization_id == current_user.organization_id
    )
    if target_branch:
        dept_query = dept_query.filter(Case.branch_id == target_branch)

    dept_rows = dept_query.group_by(Department.id, Department.name).all()
    department_distribution = [
        DepartmentDistributionItem(
            department_id=row[0],
            department_name=row[1],
            case_count=row[2],
            revenue=Decimal(str(row[3])).quantize(Decimal("0.01")),
        )
        for row in dept_rows
    ]

    # If no department cases yet, provide catalogue departments with zero values
    if not department_distribution:
        all_depts = db.query(Department).filter(Department.organization_id == current_user.organization_id).limit(5).all()
        department_distribution = [
            DepartmentDistributionItem(
                department_id=d.id,
                department_name=d.name,
                case_count=0,
                revenue=Decimal("0.00"),
            )
            for d in all_depts
        ]

    # 7. Priority Breakdown
    pri_rows = apply_scoping(db.query(Case.priority, func.count(Case.id)), Case).group_by(Case.priority).all()
    pri_map = {row[0].lower(): row[1] for row in pri_rows if row[0]}
    priority_breakdown = [
        PriorityBreakdownItem(priority="normal", count=pri_map.get("normal", 0)),
        PriorityBreakdownItem(priority="urgent", count=pri_map.get("urgent", 0)),
        PriorityBreakdownItem(priority="emergency", count=pri_map.get("emergency", 0)),
    ]

    # 8. Top Investigations Volume
    inv_rows = db.query(
        Investigation.id,
        Investigation.code,
        Investigation.name,
        func.count(CaseItem.id).label("cnt"),
        func.coalesce(func.sum(CaseItem.final_price), 0).label("billed")
    ).join(
        CaseItem, CaseItem.investigation_id == Investigation.id
    ).join(
        Case, CaseItem.case_id == Case.id
    ).filter(
        Investigation.organization_id == current_user.organization_id
    )
    if target_branch:
        inv_rows = inv_rows.filter(Case.branch_id == target_branch)

    top_inv_rows = inv_rows.group_by(Investigation.id, Investigation.code, Investigation.name).order_by(func.count(CaseItem.id).desc()).limit(6).all()
    top_investigations = [
        TopInvestigationItem(
            investigation_id=row[0],
            investigation_code=row[1],
            investigation_name=row[2],
            count=row[3],
            total_billed=Decimal(str(row[4])).quantize(Decimal("0.01")),
        )
        for row in top_inv_rows
    ]

    # 9. Emergency Queue (Open cases requiring immediate response)
    emg_cases = apply_scoping(
        db.query(Case, Patient, Department).join(
            Patient, Case.patient_id == Patient.id
        ).outerjoin(
            Department, Case.department_id == Department.id
        ),
        Case
    ).filter(
        (Case.priority == "emergency") | (Case.case_category == "emergency"),
        Case.status != "completed"
    ).order_by(Case.visit_datetime.desc()).limit(5).all()

    emergency_queue = [
        EmergencyQueueItem(
            id=c.id,
            case_number=c.case_number,
            patient_uhid=p.patient_uhid,
            patient_name=f"{p.first_name} {p.last_name}",
            priority=c.priority,
            status=c.status,
            visit_datetime=c.visit_datetime,
            department_name=dep.name if dep else None,
        )
        for c, p, dep in emg_cases
    ]

    # 10. Pending Doctor Verifications (Submitted reports waiting for doctor verification)
    pending_reps_query = db.query(ClinicalReport, Case, Patient, Investigation).join(
        Case, ClinicalReport.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        CaseItem, ClinicalReport.case_item_id == CaseItem.id
    ).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).filter(
        Case.organization_id == current_user.organization_id,
        ClinicalReport.status == "submitted"
    )
    if target_branch:
        pending_reps_query = pending_reps_query.filter(Case.branch_id == target_branch)

    pending_reps = pending_reps_query.order_by(ClinicalReport.created_at.desc()).limit(5).all()

    pending_verifications = [
        PendingVerificationQueueItem(
            id=rep.id,
            report_number=rep.report_number,
            case_number=c.case_number,
            patient_name=f"{p.first_name} {p.last_name}",
            investigation_name=inv.name,
            status=rep.status,
            submitted_at=rep.updated_at or rep.created_at,
        )
        for rep, c, p, inv in pending_reps
    ]

    return DashboardAnalyticsResponse(
        kpis=DashboardKpiSummary(
            total_patients=total_patients,
            today_cases=today_cases,
            week_cases=week_cases,
            month_cases=month_cases,
            emergency_cases=emergency_cases,
            draft_reports=draft_reports,
            pending_verification_reports=pending_verification_reports,
            finalized_reports=finalized_reports,
            today_revenue=Decimal(str(today_rev)).quantize(Decimal("0.01")),
            month_revenue=Decimal(str(month_rev)).quantize(Decimal("0.01")),
            total_revenue=Decimal(str(total_rev)).quantize(Decimal("0.01")),
            outstanding_dues=Decimal(str(outstanding_dues)).quantize(Decimal("0.01")),
        ),
        revenue_trends=revenue_trends,
        department_distribution=department_distribution,
        priority_breakdown=priority_breakdown,
        top_investigations=top_investigations,
        emergency_queue=emergency_queue,
        pending_verifications=pending_verifications,
    )
