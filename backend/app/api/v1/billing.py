from datetime import datetime, timezone, date, time
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, func

from app.core.audit import log_audit_action
from app.core.generators import generate_receipt_number
from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import (
    Patient, PatientCategory, Case, CaseItem, CaseOtherCharge,
    Investigation, OtherChargeType, Invoice, Payment, FinancialRegister
)
from app.models.branch import Branch
from app.models.user import User
from app.schemas.billing import (
    InvoiceResponse,
    InvoiceItemResponse,
    PaymentResponse,
    PaymentCreate,
    RefundCreate,
)

router = APIRouter(prefix="/invoices", tags=["Billing & Invoices"])


def _build_invoice_response(invoice: Invoice, db: Session) -> InvoiceResponse:
    case = db.query(Case).filter(Case.id == invoice.case_id).first()
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first() if case else None
    branch = db.query(Branch.name).filter(Branch.id == invoice.branch_id).first()

    # Category name
    cat_name = None
    if patient and patient.category_id:
        c = db.query(PatientCategory.name).filter(PatientCategory.id == patient.category_id).first()
        if c:
            cat_name = c[0]

    # Line items
    items: List[InvoiceItemResponse] = []
    if case:
        case_items = db.query(CaseItem, Investigation).join(
            Investigation, CaseItem.investigation_id == Investigation.id
        ).filter(CaseItem.case_id == case.id).all()

        for ci, inv in case_items:
            items.append(InvoiceItemResponse(
                id=ci.id,
                item_type="investigation",
                code=inv.code,
                name=inv.name,
                quantity=ci.quantity,
                unit_price=Decimal(str(ci.price)),
                discount_amount=Decimal(str(ci.discount_amount)),
                final_price=Decimal(str(ci.final_price)),
            ))

        other_charges = db.query(CaseOtherCharge).filter(CaseOtherCharge.case_id == case.id).all()
        for oc in other_charges:
            items.append(InvoiceItemResponse(
                id=oc.id,
                item_type="other_charge",
                code="ANCILLARY",
                name=oc.charge_name,
                quantity=1,
                unit_price=Decimal(str(oc.amount)),
                discount_amount=Decimal("0.00"),
                final_price=Decimal(str(oc.amount)),
            ))

    # Payments
    payments_raw = db.query(Payment).filter(Payment.invoice_id == invoice.id).order_by(Payment.created_at.asc()).all()
    payments_res: List[PaymentResponse] = []
    for p in payments_raw:
        collector = db.query(User.full_name).filter(User.id == p.collected_by_id).first() if p.collected_by_id else None
        payments_res.append(PaymentResponse(
            id=p.id,
            invoice_id=p.invoice_id,
            receipt_number=p.receipt_number,
            amount=Decimal(str(p.amount)),
            payment_mode=p.payment_mode,
            reference_number=p.reference_number,
            is_refund=p.is_refund,
            notes=p.notes,
            collected_by_id=p.collected_by_id,
            collected_by_name=collector[0] if collector else None,
            created_at=p.created_at,
        ))

    return InvoiceResponse(
        id=invoice.id,
        organization_id=invoice.organization_id,
        branch_id=invoice.branch_id,
        branch_name=branch[0] if branch else None,
        case_id=invoice.case_id,
        case_number=case.case_number if case else "UNKNOWN",
        patient_id=patient.id if patient else "UNKNOWN",
        patient_uhid=patient.patient_uhid if patient else "UNKNOWN",
        patient_name=f"{patient.first_name} {patient.last_name}" if patient else "Unknown",
        patient_phone=patient.phone if patient else "",
        patient_category_name=cat_name,
        invoice_number=invoice.invoice_number,
        subtotal=Decimal(str(invoice.subtotal)),
        discount_total=Decimal(str(invoice.discount_total)),
        discount_reason=invoice.discount_reason,
        tax_total=Decimal(str(invoice.tax_total)),
        grand_total=Decimal(str(invoice.grand_total)),
        paid_amount=Decimal(str(invoice.paid_amount)),
        outstanding_balance=Decimal(str(invoice.outstanding_balance)),
        payment_status=invoice.payment_status,
        notes=invoice.notes,
        items=items,
        payments=payments_res,
        created_at=invoice.created_at,
        updated_at=invoice.updated_at,
    )


# ------------------------------------------------------------------------------
# 1. LIST INVOICES
# ------------------------------------------------------------------------------

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    search: Optional[str] = Query(None, description="Search invoice #, case #, patient name/UHID"),
    payment_status: Optional[str] = Query(None, description="unpaid, partially_paid, paid, refunded, cancelled"),
    branch_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    query = db.query(Invoice).filter(Invoice.organization_id == current_user.organization_id)

    if branch_id:
        query = query.filter(Invoice.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Invoice.branch_id.in_(current_user.branch_ids))

    if payment_status:
        query = query.filter(Invoice.payment_status == payment_status)

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(Invoice.created_at >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(Invoice.created_at <= e_dt)

    if search:
        search_term = f"%{search.strip()}%"
        # Join case and patient for search
        query = query.join(Case, Invoice.case_id == Case.id).join(Patient, Case.patient_id == Patient.id).filter(
            or_(
                Invoice.invoice_number.ilike(search_term),
                Case.case_number.ilike(search_term),
                Patient.patient_uhid.ilike(search_term),
                Patient.first_name.ilike(search_term),
                Patient.last_name.ilike(search_term),
                Patient.phone.ilike(search_term),
                (Patient.first_name + " " + Patient.last_name).ilike(search_term)
            )
        )

    invoices = query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()
    return [_build_invoice_response(inv, db) for inv in invoices]


# ------------------------------------------------------------------------------
# 2. INVOICE SUMMARY STATS
# ------------------------------------------------------------------------------

@router.get("/summary/stats")
def get_billing_summary(
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    query = db.query(Invoice).filter(Invoice.organization_id == current_user.organization_id)
    if branch_id:
        query = query.filter(Invoice.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(Invoice.branch_id.in_(current_user.branch_ids))

    total_invoices = query.count()
    paid_count = query.filter(Invoice.payment_status == "paid").count()
    unpaid_count = query.filter(Invoice.payment_status == "unpaid").count()
    partial_count = query.filter(Invoice.payment_status == "partially_paid").count()

    total_billed = Decimal(str(query.with_entities(func.sum(Invoice.grand_total)).scalar() or 0))
    total_collected = Decimal(str(query.with_entities(func.sum(Invoice.paid_amount)).scalar() or 0))
    total_due = Decimal(str(query.with_entities(func.sum(Invoice.outstanding_balance)).scalar() or 0))

    return {
        "total_invoices": total_invoices,
        "paid_count": paid_count,
        "unpaid_count": unpaid_count,
        "partial_count": partial_count,
        "total_billed": float(total_billed),
        "total_collected": float(total_collected),
        "total_due": float(total_due),
    }


# ------------------------------------------------------------------------------
# 3. GET INVOICE DETAIL
# ------------------------------------------------------------------------------

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return _build_invoice_response(inv, db)


@router.get("/by-case/{case_id}", response_model=InvoiceResponse)
def get_invoice_by_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    inv = db.query(Invoice).filter(
        Invoice.case_id == case_id,
        Invoice.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice for this case not found")

    return _build_invoice_response(inv, db)


# ------------------------------------------------------------------------------
# 4. COLLECT PAYMENT (Split / Full)
# ------------------------------------------------------------------------------

@router.post("/{invoice_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    invoice_id: str,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:add")),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    outstanding = Decimal(str(inv.outstanding_balance))
    if outstanding <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="This invoice is already fully paid.")

    if payload.amount > outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (Rs. {payload.amount}) cannot exceed outstanding balance (Rs. {outstanding})."
        )

    receipt_no = generate_receipt_number(db, current_user.organization_id)
    payment = Payment(
        invoice_id=inv.id,
        organization_id=current_user.organization_id,
        branch_id=inv.branch_id,
        receipt_number=receipt_no,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        reference_number=payload.reference_number.strip() if payload.reference_number else None,
        notes=payload.notes.strip() if payload.notes else None,
        is_refund=False,
        collected_by_id=current_user.id,
    )
    db.add(payment)

    # Update Invoice Financial Balances
    new_paid = Decimal(str(inv.paid_amount)) + payload.amount
    new_balance = Decimal(str(inv.outstanding_balance)) - payload.amount
    inv.paid_amount = new_paid
    inv.outstanding_balance = new_balance
    inv.payment_status = "paid" if new_balance <= Decimal("0.00") else "partially_paid"
    inv.updated_at = datetime.now(timezone.utc)

    # Fetch Case and Patient for register logging
    case = db.query(Case).filter(Case.id == inv.case_id).first()
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first() if case else None
    patient_full_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"

    # Automatically log into FinancialRegister (Case Register & Bank Register if applicable)
    reg_entry = FinancialRegister(
        organization_id=current_user.organization_id,
        branch_id=inv.branch_id,
        register_type="case",
        transaction_date=datetime.now(timezone.utc),
        particulars=f"Case fee collection ({case.case_number if case else ''})",
        amount=payload.amount,
        direction="credit",
        regular_or_emergency=case.case_category if case else "regular",
        payment_mode=payload.payment_mode,
        due_or_paid="paid",
        patient_name=patient_full_name,
        case_number=case.case_number if case else None,
        receipt_number=receipt_no,
        reference_type="payment",
        reference_id=payment.id,
        remark=payload.notes or f"Payment collected via {payload.payment_mode}",
        created_by_id=current_user.id,
    )
    db.add(reg_entry)

    # If payment via bank/cheque/card/upi, also log into Bank Register
    if payload.payment_mode in ["cheque", "card", "upi", "bank_transfer"]:
        bank_reg = FinancialRegister(
            organization_id=current_user.organization_id,
            branch_id=inv.branch_id,
            register_type="bank",
            transaction_date=datetime.now(timezone.utc),
            cheque_no=payload.reference_number or receipt_no,
            particulars=f"Case {case.case_number if case else ''} ({patient_full_name})",
            amount=payload.amount,
            direction="credit",
            regular_or_emergency=case.case_category if case else "regular",
            payment_mode=payload.payment_mode,
            due_or_paid="paid",
            patient_name=patient_full_name,
            case_number=case.case_number if case else None,
            receipt_number=receipt_no,
            reference_type="payment",
            reference_id=payment.id,
            remark=f"Diagnostic billing settlement via {payload.payment_mode}",
            created_by_id=current_user.id,
        )
        db.add(bank_reg)

    db.commit()
    db.refresh(payment)

    log_audit_action(
        db=db,
        user=current_user,
        action="payment:collect",
        entity_type="payment",
        entity_id=payment.id,
        new_data={
            "receipt_number": payment.receipt_number,
            "invoice_number": inv.invoice_number,
            "amount": str(payment.amount),
            "payment_mode": payment.payment_mode,
            "remaining_balance": str(inv.outstanding_balance),
        }
    )

    return PaymentResponse(
        id=payment.id,
        invoice_id=payment.invoice_id,
        receipt_number=payment.receipt_number,
        amount=Decimal(str(payment.amount)),
        payment_mode=payment.payment_mode,
        reference_number=payment.reference_number,
        is_refund=payment.is_refund,
        notes=payment.notes,
        collected_by_id=payment.collected_by_id,
        collected_by_name=current_user.full_name,
        created_at=payment.created_at,
    )


# ------------------------------------------------------------------------------
# 5. PROCESS REFUND
# ------------------------------------------------------------------------------

@router.post("/{invoice_id}/refund", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def process_refund(
    invoice_id: str,
    payload: RefundCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:add")),
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.organization_id == current_user.organization_id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    paid = Decimal(str(inv.paid_amount))
    if payload.amount > paid:
        raise HTTPException(
            status_code=400,
            detail=f"Refund amount (Rs. {payload.amount}) cannot exceed collected amount (Rs. {paid})."
        )

    receipt_no = generate_receipt_number(db, current_user.organization_id)
    refund_payment = Payment(
        invoice_id=inv.id,
        organization_id=current_user.organization_id,
        branch_id=inv.branch_id,
        receipt_number=receipt_no,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        reference_number=f"REFUND-{inv.invoice_number}",
        notes=payload.reason.strip(),
        is_refund=True,
        collected_by_id=current_user.id,
    )
    db.add(refund_payment)

    new_paid = paid - payload.amount
    new_balance = Decimal(str(inv.outstanding_balance)) + payload.amount
    inv.paid_amount = new_paid
    inv.outstanding_balance = new_balance
    inv.payment_status = "refunded" if new_paid <= Decimal("0.00") else "partially_paid"
    inv.updated_at = datetime.now(timezone.utc)

    case = db.query(Case).filter(Case.id == inv.case_id).first()
    patient = db.query(Patient).filter(Patient.id == case.patient_id).first() if case else None
    patient_full_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown"

    # Log debit reversal in FinancialRegister
    reg_entry = FinancialRegister(
        organization_id=current_user.organization_id,
        branch_id=inv.branch_id,
        register_type="case",
        transaction_date=datetime.now(timezone.utc),
        particulars=f"Refund: {payload.reason}",
        amount=payload.amount,
        direction="debit",
        regular_or_emergency="regular",
        payment_mode=payload.payment_mode,
        due_or_paid="paid",
        patient_name=patient_full_name,
        case_number=case.case_number if case else None,
        receipt_number=receipt_no,
        reference_type="refund",
        reference_id=refund_payment.id,
        remark=f"Refund issued. Reason: {payload.reason}",
        created_by_id=current_user.id,
    )
    db.add(reg_entry)

    db.commit()
    db.refresh(refund_payment)

    log_audit_action(
        db=db,
        user=current_user,
        action="payment:refund",
        entity_type="payment",
        entity_id=refund_payment.id,
        new_data={
            "receipt_number": refund_payment.receipt_number,
            "invoice_number": inv.invoice_number,
            "amount": str(refund_payment.amount),
            "reason": payload.reason,
        }
    )

    return PaymentResponse(
        id=refund_payment.id,
        invoice_id=refund_payment.invoice_id,
        receipt_number=refund_payment.receipt_number,
        amount=Decimal(str(refund_payment.amount)),
        payment_mode=refund_payment.payment_mode,
        reference_number=refund_payment.reference_number,
        is_refund=True,
        notes=refund_payment.notes,
        collected_by_id=refund_payment.collected_by_id,
        collected_by_name=current_user.full_name,
        created_at=refund_payment.created_at,
    )

