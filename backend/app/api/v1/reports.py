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



# ------------------------------------------------------------------------------
# 3. REFERRING DOCTOR REPORT (PMS/Fifth_Tab/refering_doctor_report.png)
# ------------------------------------------------------------------------------

from app.models.schema_all import DoctorInvestigationRate, ClinicalReport
from app.schemas.reports import (
    ReferringDoctorReportItem, ReferringDoctorReportResponse,
    ReportingDoctorReportItem, ReportingDoctorReportResponse
)


@router.get("/referring-doctor", response_model=ReferringDoctorReportResponse)
def get_referring_doctor_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    doctor_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("charges_report:view")),
):
    """
    Referring Doctor commission report corresponding to PMS/Fifth_Tab/refering_doctor_report.png
    """
    query = db.query(CaseItem, Case, Patient, Investigation, Doctor).join(
        Case, CaseItem.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).join(
        Doctor, Case.referring_doctor_id == Doctor.id
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

    if doctor_id:
        query = query.filter(Doctor.id == doctor_id)

    if category_id:
        query = query.filter(Doctor.category_id == category_id)

    if department_id:
        query = query.filter(Investigation.department_id == department_id)

    results = query.order_by(desc(Case.visit_datetime)).limit(500).all()

    items: List[ReferringDoctorReportItem] = []
    total_charges = Decimal("0.00")
    total_commission = Decimal("0.00")

    for ci, c, p, inv, doc in results:
        dept = db.query(Department.name).filter(Department.id == inv.department_id).first() if inv.department_id else None
        doc_cat = db.query(DoctorCategory.name).filter(DoctorCategory.id == doc.category_id).first() if doc.category_id else None

        # Check investigation specific tariff
        rate_entry = db.query(DoctorInvestigationRate).filter(
            DoctorInvestigationRate.doctor_id == doc.id,
            DoctorInvestigationRate.investigation_id == inv.id,
            DoctorInvestigationRate.rate_type == "referral"
        ).first()

        item_price = Decimal(str(ci.final_price))
        is_emg = (c.case_category == "emergency")

        comm_type = "percentage"
        comm_rate = Decimal(str(doc.commission_rate or 10.0))
        comm_amount = Decimal("0.00")

        if rate_entry:
            if is_emg:
                if rate_entry.emergency_fixed and rate_entry.emergency_fixed > 0:
                    comm_type = "fixed"
                    comm_rate = Decimal(str(rate_entry.emergency_fixed))
                    comm_amount = comm_rate
                elif rate_entry.emergency_percentage and rate_entry.emergency_percentage > 0:
                    comm_type = "percentage"
                    comm_rate = Decimal(str(rate_entry.emergency_percentage))
                    comm_amount = (item_price * comm_rate / Decimal("100.00")).quantize(Decimal("0.01"))
            else:
                if rate_entry.regular_fixed and rate_entry.regular_fixed > 0:
                    comm_type = "fixed"
                    comm_rate = Decimal(str(rate_entry.regular_fixed))
                    comm_amount = comm_rate
                elif rate_entry.regular_percentage and rate_entry.regular_percentage > 0:
                    comm_type = "percentage"
                    comm_rate = Decimal(str(rate_entry.regular_percentage))
                    comm_amount = (item_price * comm_rate / Decimal("100.00")).quantize(Decimal("0.01"))
        else:
            comm_amount = (item_price * comm_rate / Decimal("100.00")).quantize(Decimal("0.01"))

        total_charges += item_price
        total_commission += comm_amount

        items.append(ReferringDoctorReportItem(
            id=ci.id,
            date=c.visit_datetime,
            case_number=c.case_number,
            patient_uhid=p.patient_uhid,
            patient_name=f"{p.first_name} {p.last_name}",
            doctor_id=doc.id,
            doctor_name=f"Dr. {doc.full_name}",
            doctor_category=doc_cat[0] if doc_cat else None,
            department_name=dept[0] if dept else None,
            investigation_code=inv.code,
            investigation_name=inv.name,
            charge_amount=item_price,
            commission_rate=comm_rate,
            commission_type=comm_type,
            commission_amount=comm_amount,
        ))

    return ReferringDoctorReportResponse(
        items=items,
        total_cases=len(items),
        total_charges=total_charges,
        total_commission=total_commission,
    )


# ------------------------------------------------------------------------------
# 4. REPORTING DOCTOR REPORT (PMS/Fifth_Tab/report_doctor_report.png)
# ------------------------------------------------------------------------------

@router.get("/reporting-doctor", response_model=ReportingDoctorReportResponse)
def get_reporting_doctor_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    doctor_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("charges_report:view")),
):
    """
    Reporting Doctor tariff and reading fees report corresponding to PMS/Fifth_Tab/report_doctor_report.png
    """
    query = db.query(CaseItem, Case, Patient, Investigation, Doctor).join(
        Case, CaseItem.case_id == Case.id
    ).join(
        Patient, Case.patient_id == Patient.id
    ).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).join(
        Doctor, Case.reporting_doctor_id == Doctor.id
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

    if doctor_id:
        query = query.filter(Doctor.id == doctor_id)

    if category_id:
        query = query.filter(Doctor.category_id == category_id)

    if department_id:
        query = query.filter(Investigation.department_id == department_id)

    results = query.order_by(desc(Case.visit_datetime)).limit(500).all()

    items: List[ReportingDoctorReportItem] = []
    total_charges = Decimal("0.00")
    total_fees = Decimal("0.00")

    for ci, c, p, inv, doc in results:
        dept = db.query(Department.name).filter(Department.id == inv.department_id).first() if inv.department_id else None
        doc_cat = db.query(DoctorCategory.name).filter(DoctorCategory.id == doc.category_id).first() if doc.category_id else None

        # Check report status
        cr = db.query(ClinicalReport).filter(ClinicalReport.case_item_id == ci.id).first()
        rep_status = cr.status if cr else "pending"

        # Check tariff rate
        rate_entry = db.query(DoctorInvestigationRate).filter(
            DoctorInvestigationRate.doctor_id == doc.id,
            DoctorInvestigationRate.investigation_id == inv.id,
            DoctorInvestigationRate.rate_type == "reporting"
        ).first()

        item_price = Decimal(str(ci.final_price))
        is_emg = (c.case_category == "emergency")
        rate_amount = Decimal("0.00")

        if rate_entry:
            if is_emg:
                if rate_entry.emergency_fixed and rate_entry.emergency_fixed > 0:
                    rate_amount = Decimal(str(rate_entry.emergency_fixed))
                elif rate_entry.emergency_percentage and rate_entry.emergency_percentage > 0:
                    rate_amount = (item_price * Decimal(str(rate_entry.emergency_percentage)) / Decimal("100.00")).quantize(Decimal("0.01"))
            else:
                if rate_entry.regular_fixed and rate_entry.regular_fixed > 0:
                    rate_amount = Decimal(str(rate_entry.regular_fixed))
                elif rate_entry.regular_percentage and rate_entry.regular_percentage > 0:
                    rate_amount = (item_price * Decimal(str(rate_entry.regular_percentage)) / Decimal("100.00")).quantize(Decimal("0.01"))
        else:
            comm = Decimal(str(doc.commission_rate or 15.0))
            rate_amount = (item_price * comm / Decimal("100.00")).quantize(Decimal("0.01"))

        total_charges += item_price
        total_fees += rate_amount

        items.append(ReportingDoctorReportItem(
            id=ci.id,
            date=c.visit_datetime,
            case_number=c.case_number,
            patient_uhid=p.patient_uhid,
            patient_name=f"{p.first_name} {p.last_name}",
            doctor_id=doc.id,
            doctor_name=f"Dr. {doc.full_name}",
            doctor_category=doc_cat[0] if doc_cat else None,
            department_name=dept[0] if dept else None,
            investigation_code=inv.code,
            investigation_name=inv.name,
            charge_amount=item_price,
            rate_amount=rate_amount,
            report_status=rep_status,
        ))

    return ReportingDoctorReportResponse(
        items=items,
        total_cases=len(items),
        total_charges=total_charges,
        total_fees=total_fees,
    )
