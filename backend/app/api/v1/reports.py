from datetime import datetime, timezone, date, time
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import (
    Case, CaseItem, CaseOtherCharge, Patient, Investigation,
    Department, DoctorCategory, Doctor, OtherChargeType
)
from app.schemas.billing import ChargesReportItem, OtherChargesReportItem

router = APIRouter(prefix="/reports", tags=["Clinical & Charge Reports"])


@router.get("/charges", response_model=List[ChargesReportItem])
def get_charges_report(
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    faculty_id: Optional[str] = Query(None, description="Doctor Category / Faculty"),
    department_id: Optional[str] = Query(None),
    is_misc: bool = Query(False),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("charges_report:view")),
):
    """
    Charges report corresponding to PMS/Second_Tab/Charges_Report.png
    """
    query = db.query(CaseItem, Case, Patient, Investigation).join(
        Case, CaseItem.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).filter(
        Case.organization_id == current_user.organization_id,
        Case.status != "cancelled"
    )

    if branch_id:
        query = query.filter(Case.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    if date_from:
        s_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime >= s_dt)

    if date_to:
        e_dt = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime <= e_dt)

    if department_id:
        query = query.filter(Investigation.department_id == department_id)

    results = query.order_by(desc(Case.visit_datetime)).limit(500).all()

    items: List[ChargesReportItem] = []
    for ci, c, p, inv in results:
        dept = db.query(Department.name).filter(Department.id == inv.department_id).first() if inv.department_id else None
        
        doc_name = None
        faculty_name = None
        if c.referring_doctor_id:
            d = db.query(Doctor).filter(Doctor.id == c.referring_doctor_id).first()
            if d:
                doc_name = f"Dr. {d.full_name}"
                if d.category_id:
                    cat = db.query(DoctorCategory.name).filter(DoctorCategory.id == d.category_id).first()
                    faculty_name = cat[0] if cat else None

        if faculty_id and c.referring_doctor_id:
            d = db.query(Doctor.category_id).filter(Doctor.id == c.referring_doctor_id).first()
            if not d or d[0] != faculty_id:
                continue

        items.append(ChargesReportItem(
            id=ci.id,
            case_number=c.case_number,
            date=c.visit_datetime,
            patient_name=f"{p.first_name} {p.last_name}",
            patient_uhid=p.patient_uhid,
            department_name=dept[0] if dept else None,
            faculty_name=faculty_name,
            doctor_name=doc_name,
            investigation_code=inv.code,
            investigation_name=inv.name,
            amount=Decimal(str(ci.final_price)),
            category=c.case_category,
        ))

    return items


@router.get("/other-charges", response_model=List[OtherChargesReportItem])
def get_other_charges_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    charge_category_id: Optional[str] = Query(None, alias="category_id"),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("other_charges_report:view")),
):
    """
    Other Charges report corresponding to PMS/Second_Tab/Other_Charges_Report.png
    """
    query = db.query(CaseOtherCharge, Case, Patient, OtherChargeType).join(
        Case, CaseOtherCharge.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        OtherChargeType, CaseOtherCharge.charge_type_id == OtherChargeType.id
    ).filter(
        Case.organization_id == current_user.organization_id,
        Case.status != "cancelled"
    )

    if branch_id:
        query = query.filter(Case.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    if date_from:
        s_dt = datetime.combine(date_from, time.min, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime >= s_dt)

    if date_to:
        e_dt = datetime.combine(date_to, time.max, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime <= e_dt)

    if charge_category_id:
        query = query.filter(CaseOtherCharge.charge_type_id == charge_category_id)

    results = query.order_by(desc(Case.visit_datetime)).limit(500).all()

    items: List[OtherChargesReportItem] = []
    for coc, c, p, ct in results:
        items.append(OtherChargesReportItem(
            id=coc.id,
            case_number=c.case_number,
            date=c.visit_datetime,
            patient_name=f"{p.first_name} {p.last_name}",
            patient_uhid=p.patient_uhid,
            charge_category=ct.name,
            charge_name=coc.charge_name,
            amount=Decimal(str(coc.amount)),
        ))

    return items

