from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin, generate_uuid


# ==============================================================================
# Master Data Models
# ==============================================================================

class Department(Base, TimestampMixin):
    __tablename__ = "departments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class City(Base, TimestampMixin):
    __tablename__ = "cities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class PatientCategory(Base, TimestampMixin):
    __tablename__ = "patient_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    discount_percentage = Column(Float, default=0.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class DoctorCategory(Base, TimestampMixin):
    __tablename__ = "doctor_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Doctor(Base, TimestampMixin):
    __tablename__ = "doctors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("doctor_categories.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    full_name = Column(String(255), nullable=False)
    qualification = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    doctor_type = Column(String(50), default="both", nullable=False)  # referring, reporting, both
    commission_rate = Column(Float, default=0.0, nullable=False)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class DoctorInvestigationRate(Base, TimestampMixin):
    __tablename__ = "doctor_investigation_rates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    rate_type = Column(String(20), default="referral", nullable=False)  # referral, reporting
    regular_fixed = Column(Numeric(10, 2), default=0.00, nullable=False)
    regular_percentage = Column(Float, default=0.0, nullable=False)
    emergency_fixed = Column(Numeric(10, 2), default=0.00, nullable=False)
    emergency_percentage = Column(Float, default=0.0, nullable=False)


class InvestigationCategory(Base, TimestampMixin):
    __tablename__ = "investigation_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class Investigation(Base, TimestampMixin):
    __tablename__ = "investigations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("investigation_categories.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    default_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    emergency_price = Column(Numeric(10, 2), default=0.00, nullable=False)
    turnaround_hours = Column(Integer, default=24, nullable=False)
    template_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class InvestigationBranchPrice(Base, TimestampMixin):
    __tablename__ = "investigation_branch_prices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    emergency_price = Column(Numeric(10, 2), default=0.00, nullable=False)


class OtherChargeType(Base, TimestampMixin):
    __tablename__ = "other_charge_types"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    default_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    is_taxable = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


class EmailTemplate(Base, TimestampMixin):
    __tablename__ = "email_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)


# ==============================================================================
# Patient & Clinical Operations Models
# ==============================================================================

class Patient(Base, TimestampMixin):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_uhid = Column(String(50), unique=True, nullable=False, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dob = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=False)  # male, female, other, undisclosed
    blood_group = Column(String(10), nullable=True)
    national_id = Column(String(50), nullable=True)
    phone = Column(String(50), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    category_id = Column(String(36), ForeignKey("patient_categories.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class Case(Base, TimestampMixin):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    case_number = Column(String(50), unique=True, nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    referring_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    reporting_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    radiologist_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    pathologist_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    physician_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    other_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    visit_datetime = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="registered", nullable=False)  # draft, registered, in_progress, report_pending, verification_pending, completed, cancelled
    symptoms = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    priority = Column(String(20), default="normal", nullable=False)  # normal, urgent, emergency
    case_category = Column(String(50), default="regular", nullable=False)  # regular, emergency
    patient_category_id = Column(String(36), ForeignKey("patient_categories.id", ondelete="SET NULL"), nullable=True)
    total_charges = Column(Numeric(10, 2), default=0.00, nullable=False)
    discount_total = Column(Numeric(10, 2), default=0.00, nullable=False)
    tax_total = Column(Numeric(10, 2), default=0.00, nullable=False)
    net_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class CaseItem(Base, TimestampMixin):
    __tablename__ = "case_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    final_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, in_progress, completed, cancelled


class CaseOtherCharge(Base, TimestampMixin):
    __tablename__ = "case_other_charges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    charge_type_id = Column(String(36), ForeignKey("other_charge_types.id", ondelete="CASCADE"), nullable=False)
    charge_name = Column(String(100), nullable=False)
    amount = Column(Numeric(10, 2), default=0.00, nullable=False)


class ReportTemplate(Base, TimestampMixin):
    __tablename__ = "report_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    schema_json = Column(Text, nullable=True)
    default_text = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class ClinicalReport(Base, TimestampMixin):
    __tablename__ = "clinical_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=True, index=True)
    case_item_id = Column(String(36), ForeignKey("case_items.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True)
    report_number = Column(String(50), unique=True, nullable=True, index=True)
    report_name = Column(String(255), nullable=True)
    report_heading = Column(String(255), nullable=True)
    status = Column(String(50), default="draft", nullable=False)  # draft, submitted, verified, finalized, amended
    current_version = Column(Integer, default=1, nullable=False)
    findings_text = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    reporting_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verification_remarks = Column(Text, nullable=True)
    finalized_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    digital_signature = Column(Boolean, default=False, nullable=False)
    patient_email = Column(String(255), nullable=True)


class ReportVersion(Base):
    __tablename__ = "report_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("clinical_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    report_name = Column(String(255), nullable=True)
    report_heading = Column(String(255), nullable=True)
    findings_text = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    content_json = Column(Text, nullable=True)
    rendered_html = Column(Text, nullable=True)
    amendment_reason = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


class ReportAttachment(Base):
    __tablename__ = "report_attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("clinical_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_data = Column(Text, nullable=True)  # Base64 or local storage path
    caption = Column(String(255), nullable=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)


# ==============================================================================
# Billing & Finance Models
# ==============================================================================

class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    subtotal = Column(Numeric(10, 2), nullable=False)
    discount_total = Column(Numeric(10, 2), default=0.00, nullable=False)
    discount_reason = Column(String(255), nullable=True)
    tax_total = Column(Numeric(10, 2), default=0.00, nullable=False)
    grand_total = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    outstanding_balance = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(30), default="unpaid", nullable=False)  # unpaid, partially_paid, paid, refunded, cancelled
    notes = Column(Text, nullable=True)


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(50), default="cash", nullable=False)  # cash, card, upi, cheque, bank_transfer
    reference_number = Column(String(100), nullable=True)
    is_refund = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)
    collected_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class FinancialRegister(Base, TimestampMixin):
    __tablename__ = "financial_registers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    register_type = Column(String(50), nullable=False, index=True)  # case, bank, expense, petty_cash, date_wise
    transaction_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    serial_no = Column(Integer, nullable=True)
    cheque_no = Column(String(50), nullable=True)
    particulars = Column(String(255), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    direction = Column(String(10), nullable=False)  # credit, debit
    regular_or_emergency = Column(String(50), default="regular", nullable=True)  # regular, emergency
    payment_mode = Column(String(50), default="cash", nullable=True)  # cash, cheque, online, card, upi
    due_or_paid = Column(String(50), default="paid", nullable=True)  # paid, due
    patient_name = Column(String(255), nullable=True)
    case_number = Column(String(50), nullable=True)
    receipt_number = Column(String(50), nullable=True)
    reference_type = Column(String(50), nullable=True)  # invoice, payment, case, manual
    reference_id = Column(String(36), nullable=True)
    remark = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


# ==============================================================================
# Phase 6: Analytics, Communication, and Audit Models
# ==============================================================================

class ChatMessage(Base, TimestampMixin):
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=True, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    channel = Column(String(50), nullable=True, index=True)  # "general", "clinical-updates", "billing"
    content = Column(Text, nullable=False)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    report_id = Column(String(36), ForeignKey("clinical_reports.id", ondelete="SET NULL"), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), default="info", nullable=False)  # info, warning, urgent, clinical, billing
    link_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)


class EmailLog(Base, TimestampMixin):
    __tablename__ = "email_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=True, index=True)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(200), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    template_id = Column(String(36), ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="SET NULL"), nullable=True)
    report_id = Column(String(36), ForeignKey("clinical_reports.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="sent", nullable=False)  # sent, failed, delivered
    error_message = Column(Text, nullable=True)


# ==============================================================================
# Phase 7: Backup, Hardening & Recovery Models
# ==============================================================================

class BackupRecord(Base, TimestampMixin):
    __tablename__ = "backup_records"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, default=0, nullable=False)
    file_size_human = Column(String(50), default="0 KB", nullable=False)
    backup_type = Column(String(50), default="database_dump", nullable=False)  # database_dump, full_system_archive
    status = Column(String(50), default="completed", nullable=False)  # completed, in_progress, failed
    checksum_sha256 = Column(String(64), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)




