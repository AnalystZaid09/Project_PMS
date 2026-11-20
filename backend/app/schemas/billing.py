from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------------------
# Invoice & Payment Schemas
# ------------------------------------------------------------------------------

class InvoiceItemResponse(BaseModel):
    id: str
    item_type: str  # investigation or other_charge
    code: Optional[str] = None
    name: str
    quantity: int = 1
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.00")
    final_price: Decimal
    model_config = ConfigDict(from_attributes=True)


class PaymentResponse(BaseModel):
    id: str
    invoice_id: str
    receipt_number: str
    amount: Decimal
    payment_mode: str
    reference_number: Optional[str] = None
    is_refund: bool = False
    notes: Optional[str] = None
    collected_by_id: Optional[str] = None
    collected_by_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Payment collection amount")
    payment_mode: str = Field("cash", pattern="^(cash|card|upi|cheque|bank_transfer)$")
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class RefundCreate(BaseModel):
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Refund amount")
    payment_mode: str = Field("cash", pattern="^(cash|card|upi|cheque|bank_transfer)$")
    reason: str = Field(..., min_length=3, description="Mandatory audit explanation for refund")


class InvoiceResponse(BaseModel):
    id: str
    organization_id: str
    branch_id: str
    branch_name: Optional[str] = None
    case_id: str
    case_number: str
    patient_id: str
    patient_uhid: str
    patient_name: str
    patient_phone: str
    patient_category_name: Optional[str] = None
    invoice_number: str
    subtotal: Decimal
    discount_total: Decimal
    discount_reason: Optional[str] = None
    tax_total: Decimal
    grand_total: Decimal
    paid_amount: Decimal
    outstanding_balance: Decimal
    payment_status: str  # unpaid, partially_paid, paid, refunded, cancelled
    notes: Optional[str] = None
    items: List[InvoiceItemResponse] = Field(default_factory=list)
    payments: List[PaymentResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ------------------------------------------------------------------------------
# Financial Register Schemas (Screens in Fourth_Tab)
# ------------------------------------------------------------------------------

class FinancialRegisterCreate(BaseModel):
    register_type: str = Field(..., pattern="^(case|bank|expense|petty_cash|date_wise)$")
    transaction_date: Optional[datetime] = None
    serial_no: Optional[int] = None
    cheque_no: Optional[str] = None
    particulars: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=Decimal("0.00"))
    direction: str = Field("debit", pattern="^(debit|credit)$")
    regular_or_emergency: Optional[str] = Field("regular", pattern="^(regular|emergency)$")
    payment_mode: Optional[str] = Field("cash", pattern="^(cash|cheque|online|card|upi|bank_transfer)$")
    due_or_paid: Optional[str] = Field("paid", pattern="^(paid|due)$")
    remark: Optional[str] = None


class FinancialRegisterItem(BaseModel):
    id: str
    register_type: str
    serial_no: Optional[int] = None
    transaction_date: datetime
    cheque_no: Optional[str] = None
    particulars: Optional[str] = None
    amount: Decimal
    direction: str
    debit_or_credit: str  # formatted for UI
    regular_or_emergency: Optional[str] = None
    payment_mode: Optional[str] = None
    by_cash_or_cheque: Optional[str] = None
    due_or_paid: Optional[str] = None
    patient_name: Optional[str] = None
    case_number: Optional[str] = None
    receipt_number: Optional[str] = None
    remark: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RegisterListResponse(BaseModel):
    items: List[FinancialRegisterItem]
    count: int
    sum_amount: Decimal
    credit_total: Decimal
    debit_total: Decimal


class DateWiseRegisterItem(BaseModel):
    date: date
    daily_total: Decimal
    start_at: Optional[str] = None
    receipt_no_end: Optional[str] = None
    case_count: int


class DateWiseRegisterResponse(BaseModel):
    items: List[DateWiseRegisterItem]
    count: int
    sum_total: Decimal


# ------------------------------------------------------------------------------
# Charge Reports Schemas (Second_Tab/Charges_Report.png & Other_Charges_Report.png)
# ------------------------------------------------------------------------------

class ChargesReportItem(BaseModel):
    id: str
    case_number: str
    date: datetime
    patient_name: str
    patient_uhid: str
    department_name: Optional[str] = None
    faculty_name: Optional[str] = None
    doctor_name: Optional[str] = None
    investigation_code: str
    investigation_name: str
    amount: Decimal
    category: str  # regular or emergency


class OtherChargesReportItem(BaseModel):
    id: str
    case_number: str
    date: datetime
    patient_name: str
    patient_uhid: str
    charge_category: str
    charge_name: str
    amount: Decimal

