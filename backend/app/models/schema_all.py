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
    is_active = Column(Boolean, default=True, nullable=False)


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
    turnaround_hours = Column(Integer, default=24, nullable=False)
    template_id = Column(String(36), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)


class InvestigationBranchPrice(Base, TimestampMixin):
    __tablename__ = "investigation_branch_prices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)


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
    gender = Column(String(20), nullable=False)  # male, female, other, undisclosed
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
    department_id = Column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    visit_datetime = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="registered", nullable=False)
    symptoms = Column(Text, nullable=True)
    clinical_notes = Column(Text, nullable=True)
    priority = Column(String(20), default="normal", nullable=False)


class CaseItem(Base, TimestampMixin):
    __tablename__ = "case_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    final_price = Column(Numeric(10, 2), nullable=False)
    status = Column(String(50), default="pending", nullable=False)


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
    case_item_id = Column(String(36), ForeignKey("case_items.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(String(36), ForeignKey("report_templates.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="draft", nullable=False)
    current_version = Column(Integer, default=1, nullable=False)
    reporting_doctor_id = Column(String(36), ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True)
    verified_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    finalized_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)


class ReportVersion(Base):
    __tablename__ = "report_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("clinical_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    content_json = Column(Text, nullable=True)
    rendered_html = Column(Text, nullable=True)
    amendment_reason = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
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
    tax_total = Column(Numeric(10, 2), default=0.00, nullable=False)
    grand_total = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0.00, nullable=False)
    outstanding_balance = Column(Numeric(10, 2), nullable=False)
    payment_status = Column(String(30), default="unpaid", nullable=False)


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_mode = Column(String(50), default="cash", nullable=False)
    reference_number = Column(String(100), nullable=True)
    collected_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class FinancialRegister(Base, TimestampMixin):
    __tablename__ = "financial_registers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(String(36), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    register_type = Column(String(50), nullable=False, index=True)  # case, bank, expense, petty_cash, date_wise
    amount = Column(Numeric(10, 2), nullable=False)
    direction = Column(String(10), nullable=False)  # credit, debit
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    description = Column(Text, nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

