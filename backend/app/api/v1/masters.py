from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.audit import log_audit_action
from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import (
    Department, City, PatientCategory, DoctorCategory, Doctor, DoctorInvestigationRate,
    InvestigationCategory, Investigation, InvestigationBranchPrice,
    OtherChargeType, EmailTemplate, ReportTemplate,
    Patient, Case, CaseItem, ClinicalReport
)
from app.models.branch import Branch
from app.models.user import User
from app.schemas.masters import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    CityCreate, CityUpdate, CityResponse,
    PatientCategoryCreate, PatientCategoryUpdate, PatientCategoryResponse,
    DoctorCategoryCreate, DoctorCategoryUpdate, DoctorCategoryResponse,
    DoctorCreate, DoctorUpdate, DoctorResponse,
    DoctorInvestigationRateCreate, DoctorInvestigationRateUpdate, DoctorInvestigationRateResponse,
    InvestigationCategoryCreate, InvestigationCategoryUpdate, InvestigationCategoryResponse,
    InvestigationCreate, InvestigationUpdate, InvestigationResponse,
    InvestigationBranchPriceCreate, InvestigationBranchPriceUpdate, InvestigationBranchPriceResponse,
    OtherChargeTypeCreate, OtherChargeTypeUpdate, OtherChargeTypeResponse,
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    ReportTemplateCreate, ReportTemplateUpdate, ReportTemplateResponse,
)

router = APIRouter(tags=["Master Data"])


# ==============================================================================
# 1. DEPARTMENTS
# ==============================================================================

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("department_master:view")),
):
    query = db.query(Department).filter(Department.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(Department.is_active == True)
    if search:
        query = query.filter(
            or_(
                Department.name.ilike(f"%{search}%"),
                Department.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(Department.name.asc()).offset(skip).limit(limit).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("department_master:add")),
):
    existing = db.query(Department).filter(
        Department.organization_id == current_user.organization_id,
        or_(Department.code == payload.code.upper(), Department.name.ilike(payload.name))
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name or code already exists")

    dept = Department(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    log_audit_action(db, current_user, "create", "departments", dept.id, None, payload.model_dump())
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: str,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("department_master:update")),
):
    dept = db.query(Department).filter(
        Department.id == dept_id,
        Department.organization_id == current_user.organization_id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    old_data = {"name": dept.name, "code": dept.code, "is_active": dept.is_active}
    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.code is not None:
        dept.code = payload.code.strip().upper()
    if payload.description is not None:
        dept.description = payload.description
    if payload.is_active is not None:
        dept.is_active = payload.is_active

    db.commit()
    db.refresh(dept)
    log_audit_action(db, current_user, "update", "departments", dept.id, old_data, payload.model_dump(exclude_unset=True))
    return dept


@router.patch("/departments/{dept_id}/toggle-status", response_model=DepartmentResponse)
def toggle_department_status(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("department_master:update")),
):
    dept = db.query(Department).filter(
        Department.id == dept_id,
        Department.organization_id == current_user.organization_id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept.is_active = not dept.is_active
    db.commit()
    db.refresh(dept)
    log_audit_action(db, current_user, "toggle_status", "departments", dept.id, None, {"is_active": dept.is_active})
    return dept


@router.delete("/departments/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    dept_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("department_master:delete")),
):
    dept = db.query(Department).filter(
        Department.id == dept_id,
        Department.organization_id == current_user.organization_id
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Safety checks
    has_doctors = db.query(Doctor).filter(Doctor.department_id == dept_id).first()
    has_investigations = db.query(Investigation).filter(Investigation.department_id == dept_id).first()
    has_cases = db.query(Case).filter(Case.department_id == dept_id).first()
    if has_doctors or has_investigations or has_cases:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete department referenced by doctors, investigations, or clinical cases. Deactivate instead."
        )

    db.delete(dept)
    db.commit()
    log_audit_action(db, current_user, "delete", "departments", dept_id, {"name": dept.name}, None)
    return None


# ==============================================================================
# 2. CITIES / LOCATIONS
# ==============================================================================

@router.get("/cities", response_model=List[CityResponse])
def list_cities(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(City)
    if active_only:
        query = query.filter(City.is_active == True)
    if search:
        query = query.filter(
            or_(
                City.name.ilike(f"%{search}%"),
                City.state.ilike(f"%{search}%"),
                City.country.ilike(f"%{search}%")
            )
        )
    return query.order_by(City.name.asc()).offset(skip).limit(limit).all()


@router.post("/cities", response_model=CityResponse, status_code=status.HTTP_201_CREATED)
def create_city(
    payload: CityCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("city_master:add")),
):
    existing = db.query(City).filter(
        City.name.ilike(payload.name.strip()),
        City.country.ilike(payload.country.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="City already exists in this country")

    city = City(
        name=payload.name.strip(),
        state=payload.state.strip(),
        country=payload.country.strip(),
        is_active=payload.is_active,
    )
    db.add(city)
    db.commit()
    db.refresh(city)
    log_audit_action(db, current_user, "create", "cities", city.id, None, payload.model_dump())
    return city


@router.put("/cities/{city_id}", response_model=CityResponse)
def update_city(
    city_id: str,
    payload: CityUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("city_master:update")),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    old_data = {"name": city.name, "state": city.state, "country": city.country, "is_active": city.is_active}
    if payload.name is not None:
        city.name = payload.name.strip()
    if payload.state is not None:
        city.state = payload.state.strip()
    if payload.country is not None:
        city.country = payload.country.strip()
    if payload.is_active is not None:
        city.is_active = payload.is_active

    db.commit()
    db.refresh(city)
    log_audit_action(db, current_user, "update", "cities", city.id, old_data, payload.model_dump(exclude_unset=True))
    return city


@router.patch("/cities/{city_id}/toggle-status", response_model=CityResponse)
def toggle_city_status(
    city_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("city_master:update")),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    city.is_active = not city.is_active
    db.commit()
    db.refresh(city)
    log_audit_action(db, current_user, "toggle_status", "cities", city.id, None, {"is_active": city.is_active})
    return city


@router.delete("/cities/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_city(
    city_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("city_master:delete")),
):
    city = db.query(City).filter(City.id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    db.delete(city)
    db.commit()
    log_audit_action(db, current_user, "delete", "cities", city_id, {"name": city.name}, None)
    return None


# ==============================================================================
# 3. PATIENT CATEGORIES
# ==============================================================================

@router.get("/patient-categories", response_model=List[PatientCategoryResponse])
def list_patient_categories(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(PatientCategory).filter(PatientCategory.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(PatientCategory.is_active == True)
    if search:
        query = query.filter(PatientCategory.name.ilike(f"%{search}%"))
    return query.order_by(PatientCategory.name.asc()).all()


@router.post("/patient-categories", response_model=PatientCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_patient_category(
    payload: PatientCategoryCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_category_master:add")),
):
    existing = db.query(PatientCategory).filter(
        PatientCategory.organization_id == current_user.organization_id,
        PatientCategory.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient category already exists")

    cat = PatientCategory(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        discount_percentage=payload.discount_percentage,
        is_active=payload.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_audit_action(db, current_user, "create", "patient_categories", cat.id, None, payload.model_dump())
    return cat


@router.put("/patient-categories/{cat_id}", response_model=PatientCategoryResponse)
def update_patient_category(
    cat_id: str,
    payload: PatientCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_category_master:update")),
):
    cat = db.query(PatientCategory).filter(
        PatientCategory.id == cat_id,
        PatientCategory.organization_id == current_user.organization_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Patient category not found")

    old_data = {"name": cat.name, "discount_percentage": cat.discount_percentage, "is_active": cat.is_active}
    if payload.name is not None:
        cat.name = payload.name.strip()
    if payload.discount_percentage is not None:
        cat.discount_percentage = payload.discount_percentage
    if payload.is_active is not None:
        cat.is_active = payload.is_active

    db.commit()
    db.refresh(cat)
    log_audit_action(db, current_user, "update", "patient_categories", cat.id, old_data, payload.model_dump(exclude_unset=True))
    return cat


@router.patch("/patient-categories/{cat_id}/toggle-status", response_model=PatientCategoryResponse)
def toggle_patient_category_status(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_category_master:update")),
):
    cat = db.query(PatientCategory).filter(
        PatientCategory.id == cat_id,
        PatientCategory.organization_id == current_user.organization_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Patient category not found")

    cat.is_active = not cat.is_active
    db.commit()
    db.refresh(cat)
    log_audit_action(db, current_user, "toggle_status", "patient_categories", cat.id, None, {"is_active": cat.is_active})
    return cat


@router.delete("/patient-categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("patient_category_master:delete")),
):
    cat = db.query(PatientCategory).filter(
        PatientCategory.id == cat_id,
        PatientCategory.organization_id == current_user.organization_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Patient category not found")

    has_patients = db.query(Patient).filter(Patient.category_id == cat_id).first()
    if has_patients:
        raise HTTPException(status_code=400, detail="Cannot delete category referenced by registered patients. Deactivate instead.")

    db.delete(cat)
    db.commit()
    log_audit_action(db, current_user, "delete", "patient_categories", cat_id, {"name": cat.name}, None)
    return None


# ==============================================================================
# 4. DOCTOR CATEGORIES
# ==============================================================================

@router.get("/doctor-categories", response_model=List[DoctorCategoryResponse])
def list_doctor_categories(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(DoctorCategory).filter(DoctorCategory.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(DoctorCategory.is_active == True)
    if search:
        query = query.filter(DoctorCategory.name.ilike(f"%{search}%"))
    return query.order_by(DoctorCategory.name.asc()).all()


@router.post("/doctor-categories", response_model=DoctorCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_doctor_category(
    payload: DoctorCategoryCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_category_master:add")),
):
    existing = db.query(DoctorCategory).filter(
        DoctorCategory.organization_id == current_user.organization_id,
        DoctorCategory.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Doctor category already exists")

    doc_cat = DoctorCategory(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        is_active=payload.is_active,
    )
    db.add(doc_cat)
    db.commit()
    db.refresh(doc_cat)
    log_audit_action(db, current_user, "create", "doctor_categories", doc_cat.id, None, payload.model_dump())
    return doc_cat


@router.put("/doctor-categories/{cat_id}", response_model=DoctorCategoryResponse)
def update_doctor_category(
    cat_id: str,
    payload: DoctorCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_category_master:update")),
):
    doc_cat = db.query(DoctorCategory).filter(
        DoctorCategory.id == cat_id,
        DoctorCategory.organization_id == current_user.organization_id
    ).first()
    if not doc_cat:
        raise HTTPException(status_code=404, detail="Doctor category not found")

    old_data = {"name": doc_cat.name, "is_active": doc_cat.is_active}
    if payload.name is not None:
        doc_cat.name = payload.name.strip()
    if payload.is_active is not None:
        doc_cat.is_active = payload.is_active

    db.commit()
    db.refresh(doc_cat)
    log_audit_action(db, current_user, "update", "doctor_categories", doc_cat.id, old_data, payload.model_dump(exclude_unset=True))
    return doc_cat


@router.patch("/doctor-categories/{cat_id}/toggle-status", response_model=DoctorCategoryResponse)
def toggle_doctor_category_status(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_category_master:update")),
):
    doc_cat = db.query(DoctorCategory).filter(
        DoctorCategory.id == cat_id,
        DoctorCategory.organization_id == current_user.organization_id
    ).first()
    if not doc_cat:
        raise HTTPException(status_code=404, detail="Doctor category not found")

    doc_cat.is_active = not doc_cat.is_active
    db.commit()
    db.refresh(doc_cat)
    log_audit_action(db, current_user, "toggle_status", "doctor_categories", doc_cat.id, None, {"is_active": doc_cat.is_active})
    return doc_cat


@router.delete("/doctor-categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_category_master:delete")),
):
    doc_cat = db.query(DoctorCategory).filter(
        DoctorCategory.id == cat_id,
        DoctorCategory.organization_id == current_user.organization_id
    ).first()
    if not doc_cat:
        raise HTTPException(status_code=404, detail="Doctor category not found")

    has_doctors = db.query(Doctor).filter(Doctor.category_id == cat_id).first()
    if has_doctors:
        raise HTTPException(status_code=400, detail="Cannot delete category referenced by existing doctors. Deactivate instead.")

    db.delete(doc_cat)
    db.commit()
    log_audit_action(db, current_user, "delete", "doctor_categories", cat_id, {"name": doc_cat.name}, None)
    return None


# ==============================================================================
# 5. DOCTORS (Referring & Reporting)
# ==============================================================================

@router.get("/doctors", response_model=List[DoctorResponse])
def list_doctors(
    search: Optional[str] = Query(None),
    doctor_type: Optional[str] = Query(None),  # referring, reporting, both
    department_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:view")),
):
    query = db.query(
        Doctor,
        DoctorCategory.name.label("category_name"),
        Department.name.label("department_name")
    ).outerjoin(
        DoctorCategory, Doctor.category_id == DoctorCategory.id
    ).outerjoin(
        Department, Doctor.department_id == Department.id
    ).filter(
        Doctor.organization_id == current_user.organization_id
    )

    if active_only:
        query = query.filter(Doctor.is_active == True)
    if doctor_type:
        query = query.filter(or_(Doctor.doctor_type == doctor_type, Doctor.doctor_type == "both"))
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    if category_id:
        query = query.filter(Doctor.category_id == category_id)
    if search:
        query = query.filter(
            or_(
                Doctor.full_name.ilike(f"%{search}%"),
                Doctor.phone.ilike(f"%{search}%"),
                Doctor.email.ilike(f"%{search}%"),
                Doctor.qualification.ilike(f"%{search}%")
            )
        )

    results = query.order_by(Doctor.full_name.asc()).offset(skip).limit(limit).all()
    response = []
    for doc, cat_name, dept_name in results:
        res = DoctorResponse.model_validate(doc)
        res.category_name = cat_name
        res.department_name = dept_name
        response.append(res)
    return response


@router.post("/doctors", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    payload: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:add")),
):
    doc = Doctor(
        organization_id=current_user.organization_id,
        category_id=payload.category_id,
        department_id=payload.department_id,
        full_name=payload.full_name.strip(),
        qualification=payload.qualification,
        phone=payload.phone,
        email=payload.email,
        doctor_type=payload.doctor_type,
        commission_rate=payload.commission_rate,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        is_active=payload.is_active,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    log_audit_action(db, current_user, "create", "doctors", doc.id, None, payload.model_dump())
    
    # Enrich names for response
    cat_name = db.query(DoctorCategory.name).filter(DoctorCategory.id == doc.category_id).scalar() if doc.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == doc.department_id).scalar() if doc.department_id else None
    res = DoctorResponse.model_validate(doc)
    res.category_name = cat_name
    res.department_name = dept_name
    return res


@router.put("/doctors/{doc_id}", response_model=DoctorResponse)
def update_doctor(
    doc_id: str,
    payload: DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:update")),
):
    doc = db.query(Doctor).filter(
        Doctor.id == doc_id,
        Doctor.organization_id == current_user.organization_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    old_data = {"full_name": doc.full_name, "doctor_type": doc.doctor_type, "is_active": doc.is_active}
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "full_name" and value is not None:
            setattr(doc, field, value.strip())
        else:
            setattr(doc, field, value)

    db.commit()
    db.refresh(doc)
    log_audit_action(db, current_user, "update", "doctors", doc.id, old_data, update_data)

    cat_name = db.query(DoctorCategory.name).filter(DoctorCategory.id == doc.category_id).scalar() if doc.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == doc.department_id).scalar() if doc.department_id else None
    res = DoctorResponse.model_validate(doc)
    res.category_name = cat_name
    res.department_name = dept_name
    return res


@router.patch("/doctors/{doc_id}/toggle-status", response_model=DoctorResponse)
def toggle_doctor_status(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:update")),
):
    doc = db.query(Doctor).filter(
        Doctor.id == doc_id,
        Doctor.organization_id == current_user.organization_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doc.is_active = not doc.is_active
    db.commit()
    db.refresh(doc)
    log_audit_action(db, current_user, "toggle_status", "doctors", doc.id, None, {"is_active": doc.is_active})

    cat_name = db.query(DoctorCategory.name).filter(DoctorCategory.id == doc.category_id).scalar() if doc.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == doc.department_id).scalar() if doc.department_id else None
    res = DoctorResponse.model_validate(doc)
    res.category_name = cat_name
    res.department_name = dept_name
    return res


@router.delete("/doctors/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:delete")),
):
    doc = db.query(Doctor).filter(
        Doctor.id == doc_id,
        Doctor.organization_id == current_user.organization_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")

    has_referral_cases = db.query(Case).filter(Case.referring_doctor_id == doc_id).first()
    has_reporting_cases = db.query(Case).filter(Case.reporting_doctor_id == doc_id).first()
    has_reports = db.query(ClinicalReport).filter(ClinicalReport.reporting_doctor_id == doc_id).first()
    if has_referral_cases or has_reporting_cases or has_reports:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete doctor referenced by active clinical cases or diagnostic reports. Deactivate instead."
        )

    db.delete(doc)
    db.commit()
    log_audit_action(db, current_user, "delete", "doctors", doc_id, {"full_name": doc.full_name}, None)
    return None


# ==============================================================================
# 6. DOCTOR INVESTIGATION RATES / COMMISSIONS
# ==============================================================================

@router.get("/doctor-rates", response_model=List[DoctorInvestigationRateResponse])
def list_doctor_rates(
    doctor_id: Optional[str] = Query(None),
    rate_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:view")),
):
    query = db.query(
        DoctorInvestigationRate,
        Doctor.full_name.label("doctor_name"),
        Investigation.name.label("investigation_name"),
        Investigation.code.label("investigation_code")
    ).join(
        Doctor, DoctorInvestigationRate.doctor_id == Doctor.id
    ).join(
        Investigation, DoctorInvestigationRate.investigation_id == Investigation.id
    ).filter(
        Doctor.organization_id == current_user.organization_id
    )

    if doctor_id:
        query = query.filter(DoctorInvestigationRate.doctor_id == doctor_id)
    if rate_type:
        query = query.filter(DoctorInvestigationRate.rate_type == rate_type)

    results = query.all()
    response = []
    for rate, doc_name, inv_name, inv_code in results:
        res = DoctorInvestigationRateResponse.model_validate(rate)
        res.doctor_name = doc_name
        res.investigation_name = inv_name
        res.investigation_code = inv_code
        response.append(res)
    return response


@router.post("/doctor-rates", response_model=DoctorInvestigationRateResponse, status_code=status.HTTP_201_CREATED)
def set_doctor_rate(
    payload: DoctorInvestigationRateCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:update")),
):
    # Check if rate already exists for this pair
    existing = db.query(DoctorInvestigationRate).filter(
        DoctorInvestigationRate.doctor_id == payload.doctor_id,
        DoctorInvestigationRate.investigation_id == payload.investigation_id,
        DoctorInvestigationRate.rate_type == payload.rate_type
    ).first()

    if existing:
        existing.regular_fixed = payload.regular_fixed
        existing.regular_percentage = payload.regular_percentage
        existing.emergency_fixed = payload.emergency_fixed
        existing.emergency_percentage = payload.emergency_percentage
        rate = existing
    else:
        rate = DoctorInvestigationRate(
            doctor_id=payload.doctor_id,
            investigation_id=payload.investigation_id,
            rate_type=payload.rate_type,
            regular_fixed=payload.regular_fixed,
            regular_percentage=payload.regular_percentage,
            emergency_fixed=payload.emergency_fixed,
            emergency_percentage=payload.emergency_percentage,
        )
        db.add(rate)

    db.commit()
    db.refresh(rate)
    log_audit_action(db, current_user, "set_doctor_rate", "doctor_investigation_rates", rate.id, None, payload.model_dump())

    doc_name = db.query(Doctor.full_name).filter(Doctor.id == rate.doctor_id).scalar()
    inv = db.query(Investigation.name, Investigation.code).filter(Investigation.id == rate.investigation_id).first()
    res = DoctorInvestigationRateResponse.model_validate(rate)
    res.doctor_name = doc_name
    res.investigation_name = inv[0] if inv else None
    res.investigation_code = inv[1] if inv else None
    return res


@router.delete("/doctor-rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor_rate(
    rate_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("doctor_master:update")),
):
    rate = db.query(DoctorInvestigationRate).filter(DoctorInvestigationRate.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Rate entry not found")
    db.delete(rate)
    db.commit()
    return None


# ==============================================================================
# 7. INVESTIGATION CATEGORIES
# ==============================================================================

@router.get("/investigation-categories", response_model=List[InvestigationCategoryResponse])
def list_investigation_categories(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(InvestigationCategory).filter(InvestigationCategory.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(InvestigationCategory.is_active == True)
    if search:
        query = query.filter(
            or_(
                InvestigationCategory.name.ilike(f"%{search}%"),
                InvestigationCategory.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(InvestigationCategory.name.asc()).all()


@router.post("/investigation-categories", response_model=InvestigationCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_investigation_category(
    payload: InvestigationCategoryCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:add")),
):
    existing = db.query(InvestigationCategory).filter(
        InvestigationCategory.organization_id == current_user.organization_id,
        or_(
            InvestigationCategory.code == payload.code.upper(),
            InvestigationCategory.name.ilike(payload.name.strip())
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Investigation category with this name or code already exists")

    inv_cat = InvestigationCategory(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        is_active=payload.is_active,
    )
    db.add(inv_cat)
    db.commit()
    db.refresh(inv_cat)
    log_audit_action(db, current_user, "create", "investigation_categories", inv_cat.id, None, payload.model_dump())
    return inv_cat


@router.put("/investigation-categories/{cat_id}", response_model=InvestigationCategoryResponse)
def update_investigation_category(
    cat_id: str,
    payload: InvestigationCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    inv_cat = db.query(InvestigationCategory).filter(
        InvestigationCategory.id == cat_id,
        InvestigationCategory.organization_id == current_user.organization_id
    ).first()
    if not inv_cat:
        raise HTTPException(status_code=404, detail="Investigation category not found")

    old_data = {"name": inv_cat.name, "code": inv_cat.code, "is_active": inv_cat.is_active}
    if payload.name is not None:
        inv_cat.name = payload.name.strip()
    if payload.code is not None:
        inv_cat.code = payload.code.strip().upper()
    if payload.is_active is not None:
        inv_cat.is_active = payload.is_active

    db.commit()
    db.refresh(inv_cat)
    log_audit_action(db, current_user, "update", "investigation_categories", inv_cat.id, old_data, payload.model_dump(exclude_unset=True))
    return inv_cat


@router.patch("/investigation-categories/{cat_id}/toggle-status", response_model=InvestigationCategoryResponse)
def toggle_investigation_category_status(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    inv_cat = db.query(InvestigationCategory).filter(
        InvestigationCategory.id == cat_id,
        InvestigationCategory.organization_id == current_user.organization_id
    ).first()
    if not inv_cat:
        raise HTTPException(status_code=404, detail="Investigation category not found")

    inv_cat.is_active = not inv_cat.is_active
    db.commit()
    db.refresh(inv_cat)
    log_audit_action(db, current_user, "toggle_status", "investigation_categories", inv_cat.id, None, {"is_active": inv_cat.is_active})
    return inv_cat


@router.delete("/investigation-categories/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation_category(
    cat_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:delete")),
):
    inv_cat = db.query(InvestigationCategory).filter(
        InvestigationCategory.id == cat_id,
        InvestigationCategory.organization_id == current_user.organization_id
    ).first()
    if not inv_cat:
        raise HTTPException(status_code=404, detail="Investigation category not found")

    has_invs = db.query(Investigation).filter(Investigation.category_id == cat_id).first()
    if has_invs:
        raise HTTPException(status_code=400, detail="Cannot delete category referenced by investigations. Deactivate instead.")

    db.delete(inv_cat)
    db.commit()
    log_audit_action(db, current_user, "delete", "investigation_categories", cat_id, {"name": inv_cat.name}, None)
    return None


# ==============================================================================
# 8. INVESTIGATIONS / SERVICES CATALOGUE
# ==============================================================================

@router.get("/investigations", response_model=List[InvestigationResponse])
def list_investigations(
    search: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:view")),
):
    query = db.query(
        Investigation,
        InvestigationCategory.name.label("category_name"),
        Department.name.label("department_name"),
        ReportTemplate.name.label("template_name")
    ).outerjoin(
        InvestigationCategory, Investigation.category_id == InvestigationCategory.id
    ).outerjoin(
        Department, Investigation.department_id == Department.id
    ).outerjoin(
        ReportTemplate, Investigation.template_id == ReportTemplate.id
    ).filter(
        Investigation.organization_id == current_user.organization_id
    )

    if active_only:
        query = query.filter(Investigation.is_active == True)
    if department_id:
        query = query.filter(Investigation.department_id == department_id)
    if category_id:
        query = query.filter(Investigation.category_id == category_id)
    if search:
        query = query.filter(
            or_(
                Investigation.name.ilike(f"%{search}%"),
                Investigation.code.ilike(f"%{search}%"),
                Investigation.description.ilike(f"%{search}%")
            )
        )

    results = query.order_by(Investigation.name.asc()).offset(skip).limit(limit).all()
    response = []
    for inv, cat_name, dept_name, tmpl_name in results:
        res = InvestigationResponse.model_validate(inv)
        res.category_name = cat_name
        res.department_name = dept_name
        res.template_name = tmpl_name
        response.append(res)
    return response


@router.post("/investigations", response_model=InvestigationResponse, status_code=status.HTTP_201_CREATED)
def create_investigation(
    payload: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:add")),
):
    existing = db.query(Investigation).filter(
        Investigation.organization_id == current_user.organization_id,
        Investigation.code == payload.code.strip().upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Investigation with this test code already exists")

    inv = Investigation(
        organization_id=current_user.organization_id,
        category_id=payload.category_id,
        department_id=payload.department_id,
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        description=payload.description,
        default_price=payload.default_price,
        emergency_price=payload.emergency_price,
        turnaround_hours=payload.turnaround_hours,
        template_id=payload.template_id,
        is_active=payload.is_active,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    log_audit_action(db, current_user, "create", "investigations", inv.id, None, payload.model_dump())

    cat_name = db.query(InvestigationCategory.name).filter(InvestigationCategory.id == inv.category_id).scalar() if inv.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == inv.department_id).scalar() if inv.department_id else None
    tmpl_name = db.query(ReportTemplate.name).filter(ReportTemplate.id == inv.template_id).scalar() if inv.template_id else None
    res = InvestigationResponse.model_validate(inv)
    res.category_name = cat_name
    res.department_name = dept_name
    res.template_name = tmpl_name
    return res


@router.put("/investigations/{inv_id}", response_model=InvestigationResponse)
def update_investigation(
    inv_id: str,
    payload: InvestigationUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    inv = db.query(Investigation).filter(
        Investigation.id == inv_id,
        Investigation.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    old_data = {"name": inv.name, "code": inv.code, "default_price": float(inv.default_price), "is_active": inv.is_active}
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "code" and value is not None:
            setattr(inv, field, value.strip().upper())
        elif field == "name" and value is not None:
            setattr(inv, field, value.strip())
        else:
            setattr(inv, field, value)

    db.commit()
    db.refresh(inv)
    log_audit_action(db, current_user, "update", "investigations", inv.id, old_data, update_data)

    cat_name = db.query(InvestigationCategory.name).filter(InvestigationCategory.id == inv.category_id).scalar() if inv.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == inv.department_id).scalar() if inv.department_id else None
    tmpl_name = db.query(ReportTemplate.name).filter(ReportTemplate.id == inv.template_id).scalar() if inv.template_id else None
    res = InvestigationResponse.model_validate(inv)
    res.category_name = cat_name
    res.department_name = dept_name
    res.template_name = tmpl_name
    return res


@router.patch("/investigations/{inv_id}/toggle-status", response_model=InvestigationResponse)
def toggle_investigation_status(
    inv_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    inv = db.query(Investigation).filter(
        Investigation.id == inv_id,
        Investigation.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    inv.is_active = not inv.is_active
    db.commit()
    db.refresh(inv)
    log_audit_action(db, current_user, "toggle_status", "investigations", inv.id, None, {"is_active": inv.is_active})

    cat_name = db.query(InvestigationCategory.name).filter(InvestigationCategory.id == inv.category_id).scalar() if inv.category_id else None
    dept_name = db.query(Department.name).filter(Department.id == inv.department_id).scalar() if inv.department_id else None
    tmpl_name = db.query(ReportTemplate.name).filter(ReportTemplate.id == inv.template_id).scalar() if inv.template_id else None
    res = InvestigationResponse.model_validate(inv)
    res.category_name = cat_name
    res.department_name = dept_name
    res.template_name = tmpl_name
    return res


@router.delete("/investigations/{inv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation(
    inv_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:delete")),
):
    inv = db.query(Investigation).filter(
        Investigation.id == inv_id,
        Investigation.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    has_case_items = db.query(CaseItem).filter(CaseItem.investigation_id == inv_id).first()
    if has_case_items:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete investigation referenced in existing patient case items. Deactivate instead."
        )

    db.delete(inv)
    db.commit()
    log_audit_action(db, current_user, "delete", "investigations", inv_id, {"code": inv.code, "name": inv.name}, None)
    return None


# ==============================================================================
# 9. INVESTIGATION CHARGES / BRANCH PRICE OVERRIDES
# ==============================================================================

@router.get("/investigation-charges", response_model=List[InvestigationBranchPriceResponse])
def list_investigation_branch_prices(
    branch_id: Optional[str] = Query(None),
    investigation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:view")),
):
    query = db.query(
        InvestigationBranchPrice,
        Investigation.name.label("investigation_name"),
        Investigation.code.label("investigation_code"),
        Branch.name.label("branch_name")
    ).join(
        Investigation, InvestigationBranchPrice.investigation_id == Investigation.id
    ).join(
        Branch, InvestigationBranchPrice.branch_id == Branch.id
    ).filter(
        Investigation.organization_id == current_user.organization_id
    )

    if branch_id:
        query = query.filter(InvestigationBranchPrice.branch_id == branch_id)
    if investigation_id:
        query = query.filter(InvestigationBranchPrice.investigation_id == investigation_id)

    results = query.all()
    response = []
    for price_rec, inv_name, inv_code, b_name in results:
        res = InvestigationBranchPriceResponse.model_validate(price_rec)
        res.investigation_name = inv_name
        res.investigation_code = inv_code
        res.branch_name = b_name
        response.append(res)
    return response


@router.post("/investigation-charges", response_model=InvestigationBranchPriceResponse, status_code=status.HTTP_201_CREATED)
def set_investigation_branch_price(
    payload: InvestigationBranchPriceCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    existing = db.query(InvestigationBranchPrice).filter(
        InvestigationBranchPrice.investigation_id == payload.investigation_id,
        InvestigationBranchPrice.branch_id == payload.branch_id
    ).first()

    if existing:
        existing.price = payload.price
        existing.emergency_price = payload.emergency_price
        price_rec = existing
    else:
        price_rec = InvestigationBranchPrice(
            investigation_id=payload.investigation_id,
            branch_id=payload.branch_id,
            price=payload.price,
            emergency_price=payload.emergency_price,
        )
        db.add(price_rec)

    db.commit()
    db.refresh(price_rec)
    log_audit_action(db, current_user, "set_branch_price", "investigation_branch_prices", price_rec.id, None, payload.model_dump())

    inv = db.query(Investigation.name, Investigation.code).filter(Investigation.id == price_rec.investigation_id).first()
    b_name = db.query(Branch.name).filter(Branch.id == price_rec.branch_id).scalar()
    res = InvestigationBranchPriceResponse.model_validate(price_rec)
    res.investigation_name = inv[0] if inv else None
    res.investigation_code = inv[1] if inv else None
    res.branch_name = b_name
    return res


@router.delete("/investigation-charges/{charge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investigation_branch_price(
    charge_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("investigation_master:update")),
):
    charge = db.query(InvestigationBranchPrice).filter(InvestigationBranchPrice.id == charge_id).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge override entry not found")
    db.delete(charge)
    db.commit()
    return None


# ==============================================================================
# 10. OTHER CHARGE TYPES
# ==============================================================================

@router.get("/other-charges", response_model=List[OtherChargeTypeResponse])
def list_other_charges(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(OtherChargeType).filter(OtherChargeType.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(OtherChargeType.is_active == True)
    if search:
        query = query.filter(
            or_(
                OtherChargeType.name.ilike(f"%{search}%"),
                OtherChargeType.code.ilike(f"%{search}%")
            )
        )
    return query.order_by(OtherChargeType.name.asc()).all()


@router.post("/other-charges", response_model=OtherChargeTypeResponse, status_code=status.HTTP_201_CREATED)
def create_other_charge_type(
    payload: OtherChargeTypeCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("other_charges_master:add")),
):
    existing = db.query(OtherChargeType).filter(
        OtherChargeType.organization_id == current_user.organization_id,
        or_(
            OtherChargeType.code == payload.code.upper(),
            OtherChargeType.name.ilike(payload.name.strip())
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Charge type with this name or code already exists")

    charge = OtherChargeType(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        code=payload.code.strip().upper(),
        default_amount=payload.default_amount,
        is_taxable=payload.is_taxable,
        is_active=payload.is_active,
    )
    db.add(charge)
    db.commit()
    db.refresh(charge)
    log_audit_action(db, current_user, "create", "other_charge_types", charge.id, None, payload.model_dump())
    return charge


@router.put("/other-charges/{charge_id}", response_model=OtherChargeTypeResponse)
def update_other_charge_type(
    charge_id: str,
    payload: OtherChargeTypeUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("other_charges_master:update")),
):
    charge = db.query(OtherChargeType).filter(
        OtherChargeType.id == charge_id,
        OtherChargeType.organization_id == current_user.organization_id
    ).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge type not found")

    old_data = {"name": charge.name, "default_amount": float(charge.default_amount), "is_active": charge.is_active}
    if payload.name is not None:
        charge.name = payload.name.strip()
    if payload.code is not None:
        charge.code = payload.code.strip().upper()
    if payload.default_amount is not None:
        charge.default_amount = payload.default_amount
    if payload.is_taxable is not None:
        charge.is_taxable = payload.is_taxable
    if payload.is_active is not None:
        charge.is_active = payload.is_active

    db.commit()
    db.refresh(charge)
    log_audit_action(db, current_user, "update", "other_charge_types", charge.id, old_data, payload.model_dump(exclude_unset=True))
    return charge


@router.patch("/other-charges/{charge_id}/toggle-status", response_model=OtherChargeTypeResponse)
def toggle_other_charge_status(
    charge_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("other_charges_master:update")),
):
    charge = db.query(OtherChargeType).filter(
        OtherChargeType.id == charge_id,
        OtherChargeType.organization_id == current_user.organization_id
    ).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge type not found")

    charge.is_active = not charge.is_active
    db.commit()
    db.refresh(charge)
    log_audit_action(db, current_user, "toggle_status", "other_charge_types", charge.id, None, {"is_active": charge.is_active})
    return charge


@router.delete("/other-charges/{charge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_other_charge_type(
    charge_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("other_charges_master:delete")),
):
    charge = db.query(OtherChargeType).filter(
        OtherChargeType.id == charge_id,
        OtherChargeType.organization_id == current_user.organization_id
    ).first()
    if not charge:
        raise HTTPException(status_code=404, detail="Charge type not found")

    db.delete(charge)
    db.commit()
    log_audit_action(db, current_user, "delete", "other_charge_types", charge_id, {"name": charge.name}, None)
    return None


# ==============================================================================
# 11. EMAIL TEMPLATES
# ==============================================================================

@router.get("/email-templates", response_model=List[EmailTemplateResponse])
def list_email_templates(
    search: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(EmailTemplate).filter(EmailTemplate.organization_id == current_user.organization_id)
    if active_only:
        query = query.filter(EmailTemplate.is_active == True)
    if search:
        query = query.filter(
            or_(
                EmailTemplate.name.ilike(f"%{search}%"),
                EmailTemplate.subject.ilike(f"%{search}%")
            )
        )
    return query.order_by(EmailTemplate.name.asc()).all()


@router.post("/email-templates", response_model=EmailTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_email_template(
    payload: EmailTemplateCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:add")),
):
    existing = db.query(EmailTemplate).filter(
        EmailTemplate.organization_id == current_user.organization_id,
        EmailTemplate.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email template with this name already exists")

    template = EmailTemplate(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        subject=payload.subject.strip(),
        body=payload.body,
        is_active=payload.is_active,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    log_audit_action(db, current_user, "create", "email_templates", template.id, None, payload.model_dump())
    return template


@router.put("/email-templates/{template_id}", response_model=EmailTemplateResponse)
def update_email_template(
    template_id: str,
    payload: EmailTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:update")),
):
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.organization_id == current_user.organization_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    old_data = {"name": template.name, "subject": template.subject, "is_active": template.is_active}
    if payload.name is not None:
        template.name = payload.name.strip()
    if payload.subject is not None:
        template.subject = payload.subject.strip()
    if payload.body is not None:
        template.body = payload.body
    if payload.is_active is not None:
        template.is_active = payload.is_active

    db.commit()
    db.refresh(template)
    log_audit_action(db, current_user, "update", "email_templates", template.id, old_data, payload.model_dump(exclude_unset=True))
    return template


@router.patch("/email-templates/{template_id}/toggle-status", response_model=EmailTemplateResponse)
def toggle_email_template_status(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:update")),
):
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.organization_id == current_user.organization_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    template.is_active = not template.is_active
    db.commit()
    db.refresh(template)
    log_audit_action(db, current_user, "toggle_status", "email_templates", template.id, None, {"is_active": template.is_active})
    return template


@router.delete("/email-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:delete")),
):
    template = db.query(EmailTemplate).filter(
        EmailTemplate.id == template_id,
        EmailTemplate.organization_id == current_user.organization_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Email template not found")

    db.delete(template)
    db.commit()
    log_audit_action(db, current_user, "delete", "email_templates", template_id, {"name": template.name}, None)
    return None


# ==============================================================================
# 12. REPORT TEMPLATES
# ==============================================================================

@router.get("/report-templates", response_model=List[ReportTemplateResponse])
def list_report_templates(
    search: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(get_current_user),
):
    query = db.query(
        ReportTemplate,
        Department.name.label("department_name")
    ).outerjoin(
        Department, ReportTemplate.department_id == Department.id
    ).filter(
        ReportTemplate.organization_id == current_user.organization_id
    )

    if active_only:
        query = query.filter(ReportTemplate.is_active == True)
    if department_id:
        query = query.filter(ReportTemplate.department_id == department_id)
    if search:
        query = query.filter(ReportTemplate.name.ilike(f"%{search}%"))

    results = query.order_by(ReportTemplate.name.asc()).all()
    response = []
    for tmpl, dept_name in results:
        res = ReportTemplateResponse.model_validate(tmpl)
        res.department_name = dept_name
        response.append(res)
    return response


@router.post("/report-templates", response_model=ReportTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_report_template(
    payload: ReportTemplateCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:add")),
):
    tmpl = ReportTemplate(
        organization_id=current_user.organization_id,
        name=payload.name.strip(),
        department_id=payload.department_id,
        schema_json=payload.template_schema,
        default_text=payload.default_text,
        is_active=payload.is_active,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    log_audit_action(db, current_user, "create", "report_templates", tmpl.id, None, payload.model_dump())

    dept_name = db.query(Department.name).filter(Department.id == tmpl.department_id).scalar() if tmpl.department_id else None
    res = ReportTemplateResponse.model_validate(tmpl)
    res.department_name = dept_name
    return res


@router.put("/report-templates/{tmpl_id}", response_model=ReportTemplateResponse)
def update_report_template(
    tmpl_id: str,
    payload: ReportTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:update")),
):
    tmpl = db.query(ReportTemplate).filter(
        ReportTemplate.id == tmpl_id,
        ReportTemplate.organization_id == current_user.organization_id
    ).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Report template not found")

    old_data = {"name": tmpl.name, "department_id": tmpl.department_id, "is_active": tmpl.is_active}
    if payload.name is not None:
        tmpl.name = payload.name.strip()
    if payload.department_id is not None:
        tmpl.department_id = payload.department_id
    if payload.template_schema is not None:
        tmpl.schema_json = payload.template_schema
    if payload.default_text is not None:
        tmpl.default_text = payload.default_text
    if payload.is_active is not None:
        tmpl.is_active = payload.is_active

    db.commit()
    db.refresh(tmpl)
    log_audit_action(db, current_user, "update", "report_templates", tmpl.id, old_data, payload.model_dump(exclude_unset=True))

    dept_name = db.query(Department.name).filter(Department.id == tmpl.department_id).scalar() if tmpl.department_id else None
    res = ReportTemplateResponse.model_validate(tmpl)
    res.department_name = dept_name
    return res


@router.patch("/report-templates/{tmpl_id}/toggle-status", response_model=ReportTemplateResponse)
def toggle_report_template_status(
    tmpl_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:update")),
):
    tmpl = db.query(ReportTemplate).filter(
        ReportTemplate.id == tmpl_id,
        ReportTemplate.organization_id == current_user.organization_id
    ).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Report template not found")

    tmpl.is_active = not tmpl.is_active
    db.commit()
    db.refresh(tmpl)
    log_audit_action(db, current_user, "toggle_status", "report_templates", tmpl.id, None, {"is_active": tmpl.is_active})

    dept_name = db.query(Department.name).filter(Department.id == tmpl.department_id).scalar() if tmpl.department_id else None
    res = ReportTemplateResponse.model_validate(tmpl)
    res.department_name = dept_name
    return res


@router.delete("/report-templates/{tmpl_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report_template(
    tmpl_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("template_master:delete")),
):
    tmpl = db.query(ReportTemplate).filter(
        ReportTemplate.id == tmpl_id,
        ReportTemplate.organization_id == current_user.organization_id
    ).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Report template not found")

    has_reports = db.query(ClinicalReport).filter(ClinicalReport.template_id == tmpl_id).first()
    if has_reports:
        raise HTTPException(status_code=400, detail="Cannot delete report template referenced by existing clinical reports. Deactivate instead.")

    db.delete(tmpl)
    db.commit()
    log_audit_action(db, current_user, "delete", "report_templates", tmpl_id, {"name": tmpl.name}, None)
    return None
