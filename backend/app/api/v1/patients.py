from datetime import datetime, timezone, date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, func

from app.core.audit import log_audit_action
from app.core.generators import generate_uhid
from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import Patient, PatientCategory, Case, CaseItem, Investigation, ClinicalReport, Invoice
from app.models.branch import Branch
from app.models.user import User
from app.schemas.patients import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    DuplicateMatchItem,
    PatientProfileResponse,
    CaseListItemResponse,
    TimelineEvent,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


def _enrich_patient_response(patient: Patient, db: Session) -> PatientResponse:
    category_name = None
    if patient.category_id:
        cat = db.query(PatientCategory.name).filter(PatientCategory.id == patient.category_id).first()
        if cat:
            category_name = cat[0]

    branch_name = None
    if patient.branch_id:
        br = db.query(Branch.name).filter(Branch.id == patient.branch_id).first()
        if br:
            branch_name = br[0]

    return PatientResponse(
        id=patient.id,
        organization_id=patient.organization_id,
        branch_id=patient.branch_id,
        patient_uhid=patient.patient_uhid,
        first_name=patient.first_name,
        last_name=patient.last_name,
        dob=patient.dob,
        age=patient.age,
        gender=patient.gender,
        blood_group=patient.blood_group,
        national_id=patient.national_id,
        phone=patient.phone,
        email=patient.email,
        address=patient.address,
        city=patient.city,
        emergency_contact=patient.emergency_contact,
        category_id=patient.category_id,
        category_name=category_name,
        branch_name=branch_name,
        is_active=patient.is_active,
        created_at=patient.created_at,
        updated_at=patient.updated_at,
    )


# ------------------------------------------------------------------------------
# 1. DUPLICATE DETECTION CHECK
# ------------------------------------------------------------------------------

@router.post("/check-duplicates", response_model=DuplicateCheckResponse)
def check_duplicate_patients(
    payload: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    """
    Search for potential duplicate patient records matching phone number,
    full name, or date of birth. Returns duplicate warnings without silently merging.
    """
    matches: List[DuplicateMatchItem] = []
    seen_ids = set()

    # 1. Check exact phone match
    phone_clean = payload.phone.strip()
    phone_query = db.query(Patient).filter(
        Patient.organization_id == current_user.organization_id,
        Patient.phone == phone_clean
    ).limit(10).all()

    for p in phone_query:
        if p.id not in seen_ids:
            seen_ids.add(p.id)
            reasons = ["Matching mobile phone number"]
            if payload.first_name and p.first_name.lower() == payload.first_name.strip().lower():
                reasons.append("Matching first name")
            if payload.last_name and p.last_name.lower() == payload.last_name.strip().lower():
                reasons.append("Matching last name")
            if payload.dob and p.dob == payload.dob:
                reasons.append("Matching date of birth")

            matches.append(DuplicateMatchItem(
                id=p.id,
                patient_uhid=p.patient_uhid,
                full_name=f"{p.first_name} {p.last_name}",
                phone=p.phone,
                gender=p.gender,
                dob=p.dob,
                age=p.age,
                city=p.city,
                match_reasons=reasons,
            ))

    # 2. Check full name match if provided
    if payload.first_name and payload.last_name:
        fn = payload.first_name.strip().lower()
        ln = payload.last_name.strip().lower()
        name_query = db.query(Patient).filter(
            Patient.organization_id == current_user.organization_id,
            func.lower(Patient.first_name) == fn,
            func.lower(Patient.last_name) == ln
        ).limit(10).all()

        for p in name_query:
            if p.id not in seen_ids:
                seen_ids.add(p.id)
                reasons = ["Matching first and last name"]
                if payload.dob and p.dob == payload.dob:
                    reasons.append("Matching date of birth")
                matches.append(DuplicateMatchItem(
                    id=p.id,
                    patient_uhid=p.patient_uhid,
                    full_name=f"{p.first_name} {p.last_name}",
                    phone=p.phone,
                    gender=p.gender,
                    dob=p.dob,
                    age=p.age,
                    city=p.city,
                    match_reasons=reasons,
                ))

    # 3. Check DOB match if provided
    if payload.dob:
        dob_query = db.query(Patient).filter(
            Patient.organization_id == current_user.organization_id,
            Patient.dob == payload.dob
        ).limit(10).all()

        for p in dob_query:
            if p.id not in seen_ids:
                # only flag if at least partial name or phone matches
                same_fn = payload.first_name and p.first_name.lower() == payload.first_name.strip().lower()
                same_ln = payload.last_name and p.last_name.lower() == payload.last_name.strip().lower()
                if same_fn or same_ln:
                    seen_ids.add(p.id)
                    reasons = ["Matching date of birth and partial name"]
                    matches.append(DuplicateMatchItem(
                        id=p.id,
                        patient_uhid=p.patient_uhid,
                        full_name=f"{p.first_name} {p.last_name}",
                        phone=p.phone,
                        gender=p.gender,
                        dob=p.dob,
                        age=p.age,
                        city=p.city,
                        match_reasons=reasons,
                    ))

    return DuplicateCheckResponse(
        has_duplicates=len(matches) > 0,
        possible_matches=matches
    )


# ------------------------------------------------------------------------------
# 2. PATIENT CRUD & SEARCH
# ------------------------------------------------------------------------------

@router.get("", response_model=List[PatientResponse])
def list_patients(
    search: Optional[str] = Query(None, description="Search by UHID, name, or phone"),
    branch_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    query = db.query(Patient).filter(Patient.organization_id == current_user.organization_id)

    if branch_id:
        query = query.filter(Patient.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Patient.branch_id.in_(current_user.branch_ids))

    if active_only:
        query = query.filter(Patient.is_active == True)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.patient_uhid.ilike(search_term),
                Patient.first_name.ilike(search_term),
                Patient.last_name.ilike(search_term),
                Patient.phone.ilike(search_term),
                Patient.city.ilike(search_term),
                (Patient.first_name + " " + Patient.last_name).ilike(search_term)
            )
        )

    patients = query.order_by(desc(Patient.created_at)).offset(skip).limit(limit).all()
    return [_enrich_patient_response(p, db) for p in patients]


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:add")),
):
    target_branch_id = payload.branch_id or current_user.active_branch_id
    if not target_branch_id:
        # Fallback to first branch in org
        first_branch = db.query(Branch).filter(Branch.organization_id == current_user.organization_id).first()
        if not first_branch:
            raise HTTPException(status_code=400, detail="No active branch found for patient registration")
        target_branch_id = first_branch.id

    uhid = generate_uhid(db, current_user.organization_id)

    # Compute age if DOB provided and age not provided
    calculated_age = payload.age
    if payload.dob and not calculated_age:
        today = date.today()
        calculated_age = today.year - payload.dob.year - ((today.month, today.day) < (payload.dob.month, payload.dob.day))

    patient = Patient(
        organization_id=current_user.organization_id,
        branch_id=target_branch_id,
        patient_uhid=uhid,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        dob=payload.dob,
        age=calculated_age,
        gender=payload.gender,
        blood_group=payload.blood_group,
        national_id=payload.national_id,
        phone=payload.phone.strip(),
        email=payload.email.strip() if payload.email else None,
        address=payload.address.strip() if payload.address else None,
        city=payload.city.strip() if payload.city else None,
        emergency_contact=payload.emergency_contact.strip() if payload.emergency_contact else None,
        category_id=payload.category_id,
        is_active=payload.is_active,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    log_audit_action(
        db=db,
        user=current_user,
        action="patient:create",
        entity_type="patient",
        entity_id=patient.id,
        new_data={
            "uhid": patient.patient_uhid,
            "name": f"{patient.first_name} {patient.last_name}",
            "phone": patient.phone,
        }
    )

    return _enrich_patient_response(patient, db)


@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:view")),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.organization_id == current_user.organization_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _enrich_patient_response(patient, db)


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_registration:update")),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.organization_id == current_user.organization_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    old_data = {
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "phone": patient.phone,
        "email": patient.email,
        "category_id": patient.category_id,
    }

    update_dict = payload.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        if val is not None and isinstance(val, str):
            setattr(patient, field, val.strip())
        else:
            setattr(patient, field, val)

    # Recalculate age if DOB changed
    if payload.dob is not None and payload.age is None:
        today = date.today()
        patient.age = today.year - payload.dob.year - ((today.month, today.day) < (payload.dob.month, payload.dob.day))

    patient.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(patient)

    log_audit_action(
        db=db,
        user=current_user,
        action="patient:update",
        entity_type="patient",
        entity_id=patient.id,
        old_data=old_data,
        new_data=update_dict
    )

    return _enrich_patient_response(patient, db)


# ------------------------------------------------------------------------------
# 3. PATIENT PROFILE & TIMELINE
# ------------------------------------------------------------------------------

@router.get("/{patient_id}/profile", response_model=PatientProfileResponse)
def get_patient_profile(
    patient_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("view_patient_history:view")),
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.organization_id == current_user.organization_id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch patient cases
    cases = db.query(Case).filter(
        Case.patient_id == patient.id,
        Case.organization_id == current_user.organization_id
    ).order_by(desc(Case.visit_datetime)).all()

    case_items_summary: List[CaseListItemResponse] = []
    timeline_events: List[TimelineEvent] = []
    total_billed = Decimal("0.00")

    # Patient registered event
    timeline_events.append(TimelineEvent(
        id=f"reg-{patient.id}",
        event_type="patient_registration",
        title="Patient Registered",
        description=f"UHID {patient.patient_uhid} assigned at registration.",
        timestamp=patient.created_at,
        actor_name=None,
    ))

    from app.models.schema_all import Doctor

    for c in cases:
        total_billed += Decimal(str(c.net_amount or 0.00))

        # Referring Doctor Name
        ref_doc_name = None
        if c.referring_doctor_id:
            d = db.query(Doctor).filter(Doctor.id == c.referring_doctor_id).first()
            if d:
                ref_doc_name = f"Dr. {d.full_name}"

        # Reporting Doctor Name
        rep_doc_name = None
        if c.reporting_doctor_id:
            d = db.query(Doctor).filter(Doctor.id == c.reporting_doctor_id).first()
            if d:
                rep_doc_name = f"Dr. {d.full_name}"

        # Items summary
        items = db.query(CaseItem, Investigation).join(
            Investigation, CaseItem.investigation_id == Investigation.id
        ).filter(CaseItem.case_id == c.id).all()

        names = [inv.name for _, inv in items]
        investigations_summary = ", ".join(names) if names else "No tests"

        # Check if report exists
        has_report = db.query(ClinicalReport.id).join(
            CaseItem, ClinicalReport.case_item_id == CaseItem.id
        ).filter(CaseItem.case_id == c.id).first() is not None

        case_items_summary.append(CaseListItemResponse(
            id=c.id,
            case_number=c.case_number,
            patient_id=patient.id,
            patient_uhid=patient.patient_uhid,
            patient_name=f"{patient.first_name} {patient.last_name}",
            exam_date=c.visit_datetime,
            status=c.status,
            priority=c.priority,
            case_category=c.case_category,
            referring_doctor_name=ref_doc_name,
            reporting_doctor_name=rep_doc_name,
            investigations_summary=investigations_summary,
            items_count=len(items),
            total_charges=Decimal(str(c.total_charges or 0)),
            discount_total=Decimal(str(c.discount_total or 0)),
            net_amount=Decimal(str(c.net_amount or 0)),
            has_report=has_report,
        ))

        # Add case created event to timeline
        timeline_events.append(TimelineEvent(
            id=f"case-{c.id}",
            event_type="case_booked",
            title=f"Case Registered ({c.case_number})",
            description=f"Booked for: {investigations_summary}. Total: Rs. {c.net_amount}",
            timestamp=c.visit_datetime,
            actor_name=ref_doc_name,
        ))

    # Sort timeline in descending order of time
    timeline_events.sort(key=lambda x: x.timestamp, reverse=True)

    return PatientProfileResponse(
        patient=_enrich_patient_response(patient, db),
        cases=case_items_summary,
        timeline=timeline_events,
        total_visits=len(cases),
        total_billed=total_billed,
    )
