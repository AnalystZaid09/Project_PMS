from datetime import datetime, timezone, date, time
from decimal import Decimal
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func

from app.core.audit import log_audit_action
from app.core.generators import generate_uhid, generate_case_number
from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import (
    Patient, PatientCategory, Doctor, Department,
    Investigation, InvestigationBranchPrice, OtherChargeType,
    Case, CaseItem, CaseOtherCharge, ClinicalReport, Invoice
)
from app.models.branch import Branch
from app.schemas.patients import (
    CaseCreateWizard,
    CaseUpdate,
    CaseListItemResponse,
    CaseDetailResponse,
    CaseItemResponse,
    CaseOtherChargeResponse,
)

router = APIRouter(prefix="/cases", tags=["Cases"])


def _get_doctor_display_name(doc_id: Optional[str], db: Session) -> Optional[str]:
    if not doc_id:
        return None
    d = db.query(Doctor.full_name).filter(Doctor.id == doc_id).first()
    return f"Dr. {d[0]}" if d else None


def _build_case_detail_response(case: Case, db: Session) -> CaseDetailResponse:
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first()
    branch = db.query(Branch.name).filter(Branch.id == case.branch_id).first()
    department = db.query(Department.name).filter(Department.id == case.department_id).first() if case.department_id else None

    # Items
    items_raw = db.query(CaseItem, Investigation).join(
        Investigation, CaseItem.investigation_id == Investigation.id
    ).filter(CaseItem.case_id == case.id).all()

    items_res: List[CaseItemResponse] = []
    for ci, inv in items_raw:
        items_res.append(CaseItemResponse(
            id=ci.id,
            case_id=ci.case_id,
            investigation_id=ci.investigation_id,
            investigation_code=inv.code,
            investigation_name=inv.name,
            quantity=ci.quantity,
            price=Decimal(str(ci.price)),
            discount_amount=Decimal(str(ci.discount_amount)),
            tax_amount=Decimal(str(ci.tax_amount)),
            final_price=Decimal(str(ci.final_price)),
            status=ci.status,
            created_at=ci.created_at,
        ))

    # Other charges
    charges_raw = db.query(CaseOtherCharge).filter(CaseOtherCharge.case_id == case.id).all()
    charges_res = [
        CaseOtherChargeResponse(
            id=oc.id,
            case_id=oc.case_id,
            charge_type_id=oc.charge_type_id,
            charge_name=oc.charge_name,
            amount=Decimal(str(oc.amount)),
            created_at=oc.created_at,
        )
        for oc in charges_raw
    ]

    return CaseDetailResponse(
        id=case.id,
        organization_id=case.organization_id,
        branch_id=case.branch_id,
        branch_name=branch[0] if branch else None,
        case_number=case.case_number,
        patient_id=case.patient_id,
        patient_uhid=patient.patient_uhid if patient else "UNKNOWN",
        patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
        patient_phone=patient.phone if patient else "",
        patient_gender=patient.gender if patient else "other",
        patient_age=patient.age if patient else None,
        referring_doctor_id=case.referring_doctor_id,
        referring_doctor_name=_get_doctor_display_name(case.referring_doctor_id, db),
        reporting_doctor_id=case.reporting_doctor_id,
        reporting_doctor_name=_get_doctor_display_name(case.reporting_doctor_id, db),
        radiologist_name=_get_doctor_display_name(case.radiologist_id, db),
        pathologist_name=_get_doctor_display_name(case.pathologist_id, db),
        physician_name=_get_doctor_display_name(case.physician_id, db),
        other_doctor_name=_get_doctor_display_name(case.other_doctor_id, db),
        department_id=case.department_id,
        department_name=department[0] if department else None,
        visit_datetime=case.visit_datetime,
        status=case.status,
        priority=case.priority,
        case_category=case.case_category,
        symptoms=case.symptoms,
        clinical_notes=case.clinical_notes,
        total_charges=Decimal(str(case.total_charges or 0)),
        discount_total=Decimal(str(case.discount_total or 0)),
        tax_total=Decimal(str(case.tax_total or 0)),
        net_amount=Decimal(str(case.net_amount or 0)),
        items=items_res,
        other_charges=charges_res,
        created_at=case.created_at,
        updated_at=case.updated_at,
    )


# ------------------------------------------------------------------------------
# 1. SUMMARY STATS (Dashboard / Register counters)
# ------------------------------------------------------------------------------

@router.get("/stats/summary")
def get_cases_summary(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    query = db.query(Case).filter(Case.organization_id == current_user.organization_id)
    if branch_id:
        query = query.filter(Case.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    now = datetime.now(timezone.utc)
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    today_end = datetime.combine(now.date(), time.max, tzinfo=timezone.utc)

    total_cases = query.count()
    today_cases = query.filter(Case.visit_datetime >= today_start, Case.visit_datetime <= today_end).count()
    emergency_cases = query.filter(or_(Case.priority == "emergency", Case.case_category == "emergency")).count()
    pending_reports = query.filter(Case.status.in_(["registered", "in_progress", "report_pending"])).count()
    completed_cases = query.filter(Case.status == "completed").count()

    today_revenue_res = query.filter(
        Case.visit_datetime >= today_start,
        Case.visit_datetime <= today_end
    ).with_entities(func.sum(Case.net_amount)).scalar()
    today_revenue = Decimal(str(today_revenue_res or 0))

    return {
        "total_cases": total_cases,
        "today_cases": today_cases,
        "emergency_cases": emergency_cases,
        "pending_reports": pending_reports,
        "completed_cases": completed_cases,
        "today_revenue": float(today_revenue),
    }


# ------------------------------------------------------------------------------
# 2. LIST CASES (Patient Record screen)
# ------------------------------------------------------------------------------

@router.get("", response_model=List[CaseListItemResponse])
def list_cases(
    start_date: Optional[date] = Query(None, description="Start date filter"),
    end_date: Optional[date] = Query(None, description="End date filter"),
    branch_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None, description="Filter by referring/reporting doctor"),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    search: Optional[str] = Query(None, description="Search case #, patient UHID/name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    query = db.query(Case, Patient).join(Patient, Case.patient_id == Patient.id).filter(
        Case.organization_id == current_user.organization_id
    )

    if branch_id:
        query = query.filter(Case.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Case.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(Case.visit_datetime <= e_dt)

    if status_filter:
        query = query.filter(Case.status == status_filter)

    if priority_filter:
        query = query.filter(Case.priority == priority_filter)

    if doctor_id:
        query = query.filter(
            or_(
                Case.referring_doctor_id == doctor_id,
                Case.reporting_doctor_id == doctor_id,
                Case.radiologist_id == doctor_id,
                Case.pathologist_id == doctor_id,
                Case.physician_id == doctor_id,
            )
        )

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Case.case_number.ilike(search_term),
                Patient.patient_uhid.ilike(search_term),
                Patient.first_name.ilike(search_term),
                Patient.last_name.ilike(search_term),
                Patient.phone.ilike(search_term),
                (Patient.first_name + " " + Patient.last_name).ilike(search_term)
            )
        )

    results = query.order_by(desc(Case.visit_datetime)).offset(skip).limit(limit).all()

    out: List[CaseListItemResponse] = []
    for c, p in results:
        # Doctor names
        ref_doc_name = _get_doctor_display_name(c.referring_doctor_id, db)
        rep_doc_name = _get_doctor_display_name(c.reporting_doctor_id, db)

        # Investigations summary
        items = db.query(CaseItem, Investigation).join(
            Investigation, CaseItem.investigation_id == Investigation.id
        ).filter(CaseItem.case_id == c.id).all()

        names = [inv.name for _, inv in items]
        inv_summary = ", ".join(names) if names else "No tests"

        has_report = db.query(ClinicalReport.id).join(
            CaseItem, ClinicalReport.case_item_id == CaseItem.id
        ).filter(CaseItem.case_id == c.id).first() is not None

        out.append(CaseListItemResponse(
            id=c.id,
            case_number=c.case_number,
            patient_id=p.id,
            patient_uhid=p.patient_uhid,
            patient_name=f"{p.first_name} {p.last_name}",
            exam_date=c.visit_datetime,
            status=c.status,
            priority=c.priority,
            case_category=c.case_category,
            referring_doctor_name=ref_doc_name,
            reporting_doctor_name=rep_doc_name,
            investigations_summary=inv_summary,
            items_count=len(items),
            total_charges=Decimal(str(c.total_charges or 0)),
            discount_total=Decimal(str(c.discount_total or 0)),
            net_amount=Decimal(str(c.net_amount or 0)),
            has_report=has_report,
        ))

    return out


# ------------------------------------------------------------------------------
# 3. CASE REGISTRATION WIZARD (All 5 Steps processed safely on server)
# ------------------------------------------------------------------------------

@router.post("", response_model=CaseDetailResponse, status_code=status.HTTP_201_CREATED)
def register_case_wizard(
    payload: CaseCreateWizard,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:add")),
):
    target_branch_id = payload.branch_id or current_user.active_branch_id
    if not target_branch_id:
        first_branch = db.query(Branch).filter(Branch.organization_id == current_user.organization_id).first()
        if not first_branch:
            raise HTTPException(status_code=400, detail="No active branch configured")
        target_branch_id = first_branch.id

    # 1. Resolve Patient
    patient = None
    if payload.patient_id:
        patient = db.query(Patient).filter(
            Patient.id == payload.patient_id,
            Patient.organization_id == current_user.organization_id
        ).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Selected patient not found")
    elif payload.new_patient:
        uhid = generate_uhid(db, current_user.organization_id)
        calculated_age = payload.new_patient.age
        if payload.new_patient.dob and not calculated_age:
            today = date.today()
            calculated_age = today.year - payload.new_patient.dob.year - (
                (today.month, today.day) < (payload.new_patient.dob.month, payload.new_patient.dob.day)
            )

        patient = Patient(
            organization_id=current_user.organization_id,
            branch_id=target_branch_id,
            patient_uhid=uhid,
            first_name=payload.new_patient.first_name.strip(),
            last_name=payload.new_patient.last_name.strip(),
            dob=payload.new_patient.dob,
            age=calculated_age,
            gender=payload.new_patient.gender,
            blood_group=payload.new_patient.blood_group,
            national_id=payload.new_patient.national_id,
            phone=payload.new_patient.phone.strip(),
            email=payload.new_patient.email.strip() if payload.new_patient.email else None,
            address=payload.new_patient.address.strip() if payload.new_patient.address else None,
            city=payload.new_patient.city.strip() if payload.new_patient.city else None,
            emergency_contact=payload.new_patient.emergency_contact.strip() if payload.new_patient.emergency_contact else None,
            category_id=payload.new_patient.category_id,
            is_active=payload.new_patient.is_active,
        )
        db.add(patient)
        db.flush()
    else:
        raise HTTPException(
            status_code=400,
            detail="Either an existing patient_id or new_patient details must be provided"
        )

    # 2. Resolve Patient Category & Discount
    category_id = payload.patient_category_id or patient.category_id
    discount_pct = Decimal("0.00")
    if category_id:
        p_cat = db.query(PatientCategory).filter(PatientCategory.id == category_id).first()
        if p_cat and p_cat.discount_percentage:
            discount_pct = Decimal(str(p_cat.discount_percentage))

    # 3. Calculate Item Tariffs & Totals
    calculated_items = []
    subtotal_investigations = Decimal("0.00")
    total_discount = Decimal("0.00")
    total_tax = Decimal("0.00")

    for item_input in payload.investigations:
        inv = db.query(Investigation).filter(
            Investigation.id == item_input.investigation_id,
            Investigation.organization_id == current_user.organization_id,
            Investigation.is_active == True
        ).first()
        if not inv:
            raise HTTPException(status_code=404, detail=f"Investigation not found: {item_input.investigation_id}")

        # Check branch-specific price or investigation default/emergency price
        branch_price = db.query(InvestigationBranchPrice).filter(
            InvestigationBranchPrice.investigation_id == inv.id,
            InvestigationBranchPrice.branch_id == target_branch_id
        ).first()

        if payload.case_category == "emergency":
            base_p = branch_price.emergency_price if branch_price and branch_price.emergency_price > 0 else inv.emergency_price
            if not base_p or base_p == 0:
                base_p = branch_price.price if branch_price else inv.default_price
        else:
            base_p = branch_price.price if branch_price else inv.default_price

        unit_price = Decimal(str(base_p or 0))

        # Check manual override price if provided
        if item_input.override_price is not None:
            unit_price = Decimal(str(item_input.override_price))

        qty = max(1, item_input.quantity)
        line_base = unit_price * qty
        line_discount = round(line_base * (discount_pct / Decimal("100.00")), 2)
        line_tax = Decimal("0.00")  # can be expanded with GST when tax master enabled
        line_final = line_base - line_discount + line_tax

        subtotal_investigations += line_base
        total_discount += line_discount
        total_tax += line_tax

        calculated_items.append({
            "investigation_id": inv.id,
            "quantity": qty,
            "price": unit_price,
            "discount_amount": line_discount,
            "tax_amount": line_tax,
            "final_price": line_final,
        })

    # 4. Other Charges calculation
    other_charges_total = Decimal("0.00")
    calculated_other_charges = []
    if payload.other_charges:
        for oc_input in payload.other_charges:
            oc_amt = Decimal(str(oc_input.amount))
            other_charges_total += oc_amt
            calculated_other_charges.append({
                "charge_type_id": oc_input.charge_type_id,
                "charge_name": oc_input.charge_name,
                "amount": oc_amt,
            })

    total_gross = subtotal_investigations + other_charges_total
    net_total = total_gross - total_discount + total_tax

    # 5. Create Case
    case_number = generate_case_number(db, current_user.organization_id)
    new_case = Case(
        organization_id=current_user.organization_id,
        branch_id=target_branch_id,
        case_number=case_number,
        patient_id=patient.id,
        referring_doctor_id=payload.referring_doctor_id,
        reporting_doctor_id=payload.reporting_doctor_id,
        radiologist_id=payload.radiologist_id,
        pathologist_id=payload.pathologist_id,
        physician_id=payload.physician_id,
        other_doctor_id=payload.other_doctor_id,
        department_id=payload.department_id,
        visit_datetime=datetime.now(timezone.utc),
        status="registered",
        priority=payload.priority,
        case_category=payload.case_category,
        patient_category_id=category_id,
        symptoms=payload.symptoms.strip() if payload.symptoms else None,
        clinical_notes=payload.clinical_notes.strip() if payload.clinical_notes else None,
        total_charges=total_gross,
        discount_total=total_discount,
        tax_total=total_tax,
        net_amount=net_total,
        created_by_id=current_user.id,
    )
    db.add(new_case)
    db.flush()

    # 6. Insert Case Items and draft Clinical Reports
    for c_item in calculated_items:
        case_item = CaseItem(
            case_id=new_case.id,
            investigation_id=c_item["investigation_id"],
            quantity=c_item["quantity"],
            price=c_item["price"],
            discount_amount=c_item["discount_amount"],
            tax_amount=c_item["tax_amount"],
            final_price=c_item["final_price"],
            status="pending",
        )
        db.add(case_item)
        db.flush()

        # Create draft ClinicalReport container for reporting doctor
        draft_report = ClinicalReport(
            case_item_id=case_item.id,
            status="draft",
            current_version=1,
            reporting_doctor_id=payload.reporting_doctor_id or payload.radiologist_id or payload.pathologist_id,
        )
        db.add(draft_report)

    # 7. Insert Other Charges
    for oc in calculated_other_charges:
        case_other = CaseOtherCharge(
            case_id=new_case.id,
            charge_type_id=oc["charge_type_id"],
            charge_name=oc["charge_name"],
            amount=oc["amount"],
        )
        db.add(case_other)

    db.commit()
    db.refresh(new_case)

    log_audit_action(
        db=db,
        user=current_user,
        action="case:create",
        entity_type="case",
        entity_id=new_case.id,
        new_data={
            "case_number": new_case.case_number,
            "patient_uhid": patient.patient_uhid,
            "net_amount": str(new_case.net_amount),
            "items_count": len(calculated_items),
        }
    )

    return _build_case_detail_response(new_case, db)


# ------------------------------------------------------------------------------
# 4. GET CASE DETAIL
# ------------------------------------------------------------------------------

@router.get("/{case_id}", response_model=CaseDetailResponse)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.organization_id == current_user.organization_id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    return _build_case_detail_response(case, db)


# ------------------------------------------------------------------------------
# 5. UPDATE CASE
# ------------------------------------------------------------------------------

@router.put("/{case_id}", response_model=CaseDetailResponse)
def update_case(
    case_id: str,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:update")),
):
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.organization_id == current_user.organization_id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    old_data = {
        "status": case.status,
        "priority": case.priority,
        "reporting_doctor_id": case.reporting_doctor_id,
    }

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None and isinstance(val, str):
            setattr(case, field, val.strip())
        else:
            setattr(case, field, val)

    case.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(case)

    log_audit_action(
        db=db,
        user=current_user,
        action="case:update",
        entity_type="case",
        entity_id=case.id,
        old_data=old_data,
        new_data=update_dict
    )

    return _build_case_detail_response(case, db)


# ------------------------------------------------------------------------------
# 6. CANCEL / DELETE CASE
# ------------------------------------------------------------------------------

@router.delete("/{case_id}")
def delete_or_cancel_case(
    case_id: str,
    reason: Optional[str] = Query(None, description="Reason for cancellation"),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("delete_case:delete")),
):
    case = db.query(Case).filter(
        Case.id == case_id,
        Case.organization_id == current_user.organization_id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Safety check: Cannot cancel if report finalized
    finalized_report = db.query(ClinicalReport.id).join(
        CaseItem, ClinicalReport.case_item_id == CaseItem.id
    ).filter(
        CaseItem.case_id == case.id,
        ClinicalReport.status == "finalized"
    ).first()

    if finalized_report:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel or delete this case: Clinical reports have already been finalized and locked."
        )

    # Check invoices
    invoice = db.query(Invoice).filter(Invoice.case_id == case.id).first()
    if invoice and Decimal(str(invoice.paid_amount or 0)) > 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel or delete this case: Payments have already been recorded against its invoice."
        )

    old_status = case.status
    case.status = "cancelled"
    case.updated_at = datetime.now(timezone.utc)

    # Cancel case items
    db.query(CaseItem).filter(CaseItem.case_id == case.id).update({"status": "cancelled"})

    db.commit()

    log_audit_action(
        db=db,
        user=current_user,
        action="case:cancel",
        entity_type="case",
        entity_id=case.id,
        old_data={"status": old_status},
        new_data={"status": "cancelled", "reason": reason}
    )

    return {
        "success": True,
        "message": f"Case {case.case_number} has been cancelled successfully."
    }
