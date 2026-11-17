from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# Department Schemas
# ------------------------------------------------------------------------------

class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(DepartmentBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# City Schemas
# ------------------------------------------------------------------------------

class CityBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    country: str = Field(..., min_length=2, max_length=100)
    is_active: bool = True


class CityCreate(CityBase):
    pass


class CityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    country: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None


class CityResponse(CityBase):
    id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Patient Category Schemas
# ------------------------------------------------------------------------------

class PatientCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    discount_percentage: float = Field(0.0, ge=0.0, le=100.0)
    is_active: bool = True


class PatientCategoryCreate(PatientCategoryBase):
    pass


class PatientCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    discount_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    is_active: Optional[bool] = None


class PatientCategoryResponse(PatientCategoryBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Doctor Category Schemas
# ------------------------------------------------------------------------------

class DoctorCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    is_active: bool = True


class DoctorCategoryCreate(DoctorCategoryBase):
    pass


class DoctorCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None


class DoctorCategoryResponse(DoctorCategoryBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Doctor Schemas
# ------------------------------------------------------------------------------

class DoctorBase(BaseModel):
    category_id: Optional[str] = None
    department_id: Optional[str] = None
    full_name: str = Field(..., min_length=2, max_length=255)
    qualification: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    doctor_type: str = Field("both", pattern="^(referring|reporting|both)$")
    commission_rate: float = Field(0.0, ge=0.0, le=100.0)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    category_id: Optional[str] = None
    department_id: Optional[str] = None
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    qualification: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    doctor_type: Optional[str] = Field(None, pattern="^(referring|reporting|both)$")
    commission_rate: Optional[float] = Field(None, ge=0.0, le=100.0)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    is_active: Optional[bool] = None


class DoctorResponse(DoctorBase):
    id: str
    organization_id: str
    category_name: Optional[str] = None
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Doctor Investigation Rates Schemas
# ------------------------------------------------------------------------------

class DoctorInvestigationRateBase(BaseModel):
    doctor_id: str
    investigation_id: str
    rate_type: str = Field("referral", pattern="^(referral|reporting)$")
    regular_fixed: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    regular_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    emergency_fixed: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    emergency_percentage: float = Field(default=0.0, ge=0.0, le=100.0)


class DoctorInvestigationRateCreate(DoctorInvestigationRateBase):
    pass


class DoctorInvestigationRateUpdate(BaseModel):
    regular_fixed: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    regular_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    emergency_fixed: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    emergency_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)


class DoctorInvestigationRateResponse(DoctorInvestigationRateBase):
    id: str
    doctor_name: Optional[str] = None
    investigation_name: Optional[str] = None
    investigation_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Investigation Category Schemas
# ------------------------------------------------------------------------------

class InvestigationCategoryBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    is_active: bool = True


class InvestigationCategoryCreate(InvestigationCategoryBase):
    pass


class InvestigationCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    is_active: Optional[bool] = None


class InvestigationCategoryResponse(InvestigationCategoryBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Investigation Schemas
# ------------------------------------------------------------------------------

class InvestigationBase(BaseModel):
    category_id: Optional[str] = None
    department_id: Optional[str] = None
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    default_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    emergency_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    turnaround_hours: int = Field(default=24, ge=1)
    template_id: Optional[str] = None
    is_active: bool = True


class InvestigationCreate(InvestigationBase):
    pass


class InvestigationUpdate(BaseModel):
    category_id: Optional[str] = None
    department_id: Optional[str] = None
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    default_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    emergency_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    turnaround_hours: Optional[int] = Field(None, ge=1)
    template_id: Optional[str] = None
    is_active: Optional[bool] = None


class InvestigationResponse(InvestigationBase):
    id: str
    organization_id: str
    category_name: Optional[str] = None
    department_name: Optional[str] = None
    template_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Investigation Branch Pricing Schemas
# ------------------------------------------------------------------------------

class InvestigationBranchPriceBase(BaseModel):
    investigation_id: str
    branch_id: str
    price: Decimal = Field(..., ge=Decimal("0.00"))
    emergency_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))


class InvestigationBranchPriceCreate(InvestigationBranchPriceBase):
    pass


class InvestigationBranchPriceUpdate(BaseModel):
    price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    emergency_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))


class InvestigationBranchPriceResponse(InvestigationBranchPriceBase):
    id: str
    investigation_name: Optional[str] = None
    investigation_code: Optional[str] = None
    branch_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Other Charge Type Schemas
# ------------------------------------------------------------------------------

class OtherChargeTypeBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    code: str = Field(..., min_length=2, max_length=50)
    default_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    is_taxable: bool = False
    is_active: bool = True


class OtherChargeTypeCreate(OtherChargeTypeBase):
    pass


class OtherChargeTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    code: Optional[str] = Field(None, min_length=2, max_length=50)
    default_amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    is_taxable: Optional[bool] = None
    is_active: Optional[bool] = None


class OtherChargeTypeResponse(OtherChargeTypeBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Email Template Schemas
# ------------------------------------------------------------------------------

class EmailTemplateBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    subject: str = Field(..., min_length=2, max_length=255)
    body: str = Field(..., min_length=1)
    is_active: bool = True


class EmailTemplateCreate(EmailTemplateBase):
    pass


class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    subject: Optional[str] = Field(None, min_length=2, max_length=255)
    body: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None


class EmailTemplateResponse(EmailTemplateBase):
    id: str
    organization_id: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Report Template Schemas
# ------------------------------------------------------------------------------

class ReportTemplateBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    department_id: Optional[str] = None
    template_schema: Optional[str] = Field(None, alias="schema_json")
    default_text: Optional[str] = None
    is_active: bool = True
    model_config = ConfigDict(populate_by_name=True)


class ReportTemplateCreate(ReportTemplateBase):
    pass


class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    department_id: Optional[str] = None
    template_schema: Optional[str] = Field(None, alias="schema_json")
    default_text: Optional[str] = None
    is_active: Optional[bool] = None
    model_config = ConfigDict(populate_by_name=True)


class ReportTemplateResponse(ReportTemplateBase):
    id: str
    organization_id: str
    department_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
