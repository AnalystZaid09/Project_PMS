from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# Patient Schemas
# ------------------------------------------------------------------------------

class PatientBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: Optional[date] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: str = Field("male", pattern="^(male|female|other|undisclosed)$")
    blood_group: Optional[str] = None
    national_id: Optional[str] = None
    phone: str = Field(..., min_length=5, max_length=50)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    emergency_contact: Optional[str] = None
    category_id: Optional[str] = None
    is_active: bool = True


class PatientCreate(PatientBase):
    branch_id: Optional[str] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    dob: Optional[date] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = Field(None, pattern="^(male|female|other|undisclosed)$")
    blood_group: Optional[str] = None
    national_id: Optional[str] = None
    phone: Optional[str] = Field(None, min_length=5, max_length=50)
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    emergency_contact: Optional[str] = None
    category_id: Optional[str] = None
    is_active: Optional[bool] = None


class PatientResponse(PatientBase):
    id: str
    organization_id: str
    branch_id: str
    patient_uhid: str
    category_name: Optional[str] = None
    branch_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Duplicate Check Schemas
# ------------------------------------------------------------------------------

class DuplicateCheckRequest(BaseModel):
    phone: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None


class DuplicateMatchItem(BaseModel):
    id: str
    patient_uhid: str
    full_name: str
    phone: str
    gender: str
    dob: Optional[date] = None
    age: Optional[int] = None
    city: Optional[str] = None
    match_reasons: List[str]


class DuplicateCheckResponse(BaseModel):
    has_duplicates: bool
    possible_matches: List[DuplicateMatchItem]


# ------------------------------------------------------------------------------
# Case Items & Other Charges Schemas
# ------------------------------------------------------------------------------

class CaseItemInput(BaseModel):
    investigation_id: str
    quantity: int = Field(default=1, ge=1)
    override_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))


class CaseItemResponse(BaseModel):
    id: str
    case_id: str
    investigation_id: str
    investigation_code: Optional[str] = None
    investigation_name: Optional[str] = None
    quantity: int
    price: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    final_price: Decimal
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CaseOtherChargeInput(BaseModel):
    charge_type_id: str
    charge_name: str
    amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class CaseOtherChargeResponse(BaseModel):
    id: str
    case_id: str
    charge_type_id: str
    charge_name: str
    amount: Decimal
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Case Schemas
# ------------------------------------------------------------------------------

class CaseCreateWizard(BaseModel):
    # Patient selection: either existing patient_id or inline registration data
    patient_id: Optional[str] = None
    new_patient: Optional[PatientCreate] = None

    # Step 1: Referring Doctor & Department
    referring_doctor_id: Optional[str] = None
    department_id: Optional[str] = None

    # Step 2: Investigation & Category Selection
    case_category: str = Field("regular", pattern="^(regular|emergency)$")
    patient_category_id: Optional[str] = None
    investigations: List[CaseItemInput] = Field(..., min_length=1)

    # Step 3: Reporting Doctor Assignments
    reporting_doctor_id: Optional[str] = None
    radiologist_id: Optional[str] = None
    pathologist_id: Optional[str] = None
    physician_id: Optional[str] = None
    other_doctor_id: Optional[str] = None

    # Step 4: Other Charges
    other_charges: Optional[List[CaseOtherChargeInput]] = Field(default_factory=list)

    # Step 5: Symptoms & Notes
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    priority: str = Field("normal", pattern="^(normal|urgent|emergency)$")

    branch_id: Optional[str] = None


class CaseUpdate(BaseModel):
    referring_doctor_id: Optional[str] = None
    reporting_doctor_id: Optional[str] = None
    radiologist_id: Optional[str] = None
    pathologist_id: Optional[str] = None
    physician_id: Optional[str] = None
    other_doctor_id: Optional[str] = None
    department_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(draft|registered|in_progress|report_pending|verification_pending|completed|cancelled)$")
    priority: Optional[str] = Field(None, pattern="^(normal|urgent|emergency)$")
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None


class CaseListItemResponse(BaseModel):
    id: str
    case_number: str
    patient_id: str
    patient_uhid: str
    patient_name: str
    exam_date: datetime
    status: str
    priority: str
    case_category: str
    referring_doctor_name: Optional[str] = None
    reporting_doctor_name: Optional[str] = None
    investigations_summary: str
    items_count: int
    total_charges: Decimal
    discount_total: Decimal
    net_amount: Decimal
    has_report: bool = False
    model_config = ConfigDict(from_attributes=True)


class CaseDetailResponse(BaseModel):
    id: str
    organization_id: str
    branch_id: str
    branch_name: Optional[str] = None
    case_number: str
    patient_id: str
    patient_uhid: str
    patient_name: str
    patient_phone: str
    patient_gender: str
    patient_age: Optional[int] = None
    referring_doctor_id: Optional[str] = None
    referring_doctor_name: Optional[str] = None
    reporting_doctor_id: Optional[str] = None
    reporting_doctor_name: Optional[str] = None
    radiologist_name: Optional[str] = None
    pathologist_name: Optional[str] = None
    physician_name: Optional[str] = None
    other_doctor_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    visit_datetime: datetime
    status: str
    priority: str
    case_category: str
    symptoms: Optional[str] = None
    clinical_notes: Optional[str] = None
    total_charges: Decimal
    discount_total: Decimal
    tax_total: Decimal
    net_amount: Decimal
    items: List[CaseItemResponse]
    other_charges: List[CaseOtherChargeResponse]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Patient Profile & Timeline Schemas
# ------------------------------------------------------------------------------

class TimelineEvent(BaseModel):
    id: str
    event_type: str
    title: str
    description: str
    timestamp: datetime
    actor_name: Optional[str] = None


class PatientProfileResponse(BaseModel):
    patient: PatientResponse
    cases: List[CaseListItemResponse]
    timeline: List[TimelineEvent]
    total_visits: int
    total_billed: Decimal

