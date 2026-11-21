from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


# ------------------------------------------------------------------------------
# Report Attachment Schemas
# ------------------------------------------------------------------------------

class ReportAttachmentCreate(BaseModel):
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    file_data: Optional[str] = None  # Base64 data string or URL
    caption: Optional[str] = None


class ReportAttachmentResponse(BaseModel):
    id: str
    report_id: str
    file_name: str
    file_type: str
    file_size: Optional[int] = None
    file_data: Optional[str] = None
    caption: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Report Version Schemas
# ------------------------------------------------------------------------------

class ReportVersionResponse(BaseModel):
    id: str
    report_id: str
    version_number: int
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    findings_text: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    rendered_html: Optional[str] = None
    amendment_reason: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Clinical Report Lifecycle & Form Schemas
# ------------------------------------------------------------------------------

class ClinicalReportCreate(BaseModel):
    case_item_id: str
    template_id: Optional[str] = None
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    findings_text: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None


class ClinicalReportUpdate(BaseModel):
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    findings_text: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    patient_email: Optional[str] = None


class ReportSubmitRequest(BaseModel):
    notes: Optional[str] = None


class ReportVerifyRequest(BaseModel):
    verification_remarks: Optional[str] = None


class ReportFinalizeRequest(BaseModel):
    digital_signature: bool = True
    final_notes: Optional[str] = None


class ReportAmendRequest(BaseModel):
    amendment_reason: str = Field(..., min_length=5, description="Clear medical rationale for amendment")
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    findings_text: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None


class ClinicalReportListItem(BaseModel):
    id: str
    report_number: str
    case_id: str
    case_number: str
    case_item_id: str
    patient_id: str
    patient_uhid: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: str
    patient_phone: Optional[str] = None
    investigation_id: str
    investigation_code: str
    investigation_name: str
    department_name: Optional[str] = None
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    status: str
    current_version: int
    reporting_doctor_name: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    finalized_by_name: Optional[str] = None
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClinicalReportDetailResponse(BaseModel):
    id: str
    report_number: str
    case_id: str
    case_number: str
    case_item_id: str
    patient_id: str
    patient_uhid: str
    patient_name: str
    patient_age: Optional[int] = None
    patient_gender: str
    patient_phone: Optional[str] = None
    patient_city: Optional[str] = None
    patient_email: Optional[str] = None
    patient_symptoms: Optional[str] = None
    referring_doctor_name: Optional[str] = None
    reporting_doctor_name: Optional[str] = None
    branch_name: Optional[str] = None
    branch_address: Optional[str] = None
    investigation_id: str
    investigation_code: str
    investigation_name: str
    department_name: Optional[str] = None
    template_id: Optional[str] = None
    template_name: Optional[str] = None
    report_name: Optional[str] = None
    report_heading: Optional[str] = None
    status: str
    current_version: int
    findings_text: Optional[str] = None
    impression: Optional[str] = None
    recommendation: Optional[str] = None
    verification_remarks: Optional[str] = None
    digital_signature: bool = False
    verified_by_name: Optional[str] = None
    verified_at: Optional[datetime] = None
    finalized_by_name: Optional[str] = None
    finalized_at: Optional[datetime] = None
    versions: List[ReportVersionResponse] = []
    attachments: List[ReportAttachmentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ClinicalReportsStatsResponse(BaseModel):
    total_reports: int
    draft_count: int
    submitted_count: int
    verified_count: int
    finalized_count: int
    amended_count: int


# ------------------------------------------------------------------------------
# Doctor Tariff & Commission Reports Schemas
# ------------------------------------------------------------------------------

class ReferringDoctorReportItem(BaseModel):
    id: str
    date: datetime
    case_number: str
    patient_uhid: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    doctor_category: Optional[str] = None
    department_name: Optional[str] = None
    investigation_code: str
    investigation_name: str
    charge_amount: Decimal
    commission_rate: Decimal
    commission_type: str  # percentage or fixed
    commission_amount: Decimal


class ReportingDoctorReportItem(BaseModel):
    id: str
    date: datetime
    case_number: str
    patient_uhid: str
    patient_name: str
    doctor_id: str
    doctor_name: str
    doctor_category: Optional[str] = None
    department_name: Optional[str] = None
    investigation_code: str
    investigation_name: str
    charge_amount: Decimal
    rate_amount: Decimal
    report_status: str


class ReferringDoctorReportResponse(BaseModel):
    items: List[ReferringDoctorReportItem]
    total_cases: int
    total_charges: Decimal
    total_commission: Decimal


class ReportingDoctorReportResponse(BaseModel):
    items: List[ReportingDoctorReportItem]
    total_cases: int
    total_charges: Decimal
    total_fees: Decimal
