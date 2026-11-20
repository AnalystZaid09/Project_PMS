from datetime import datetime, timezone, date, time
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc, func

from app.core.audit import log_audit_action
from app.core.rbac import AuthenticatedUserContext, get_current_user, require_permission
from app.db.session import get_db
from app.models.schema_all import FinancialRegister, Case, Invoice, Payment, Patient
from app.schemas.billing import (
    FinancialRegisterCreate,
    FinancialRegisterItem,
    RegisterListResponse,
    DateWiseRegisterItem,
    DateWiseRegisterResponse,
)

router = APIRouter(prefix="/registers", tags=["Financial Registers"])


def _format_register_item(reg: FinancialRegister, idx: int = 1) -> FinancialRegisterItem:
    return FinancialRegisterItem(
        id=reg.id,
        register_type=reg.register_type,
        serial_no=reg.serial_no or idx,
        transaction_date=reg.transaction_date or reg.created_at,
        cheque_no=reg.cheque_no or "—",
        particulars=reg.particulars or reg.description or "Diagnostic Services",
        amount=Decimal(str(reg.amount)),
        direction=reg.direction,
        debit_or_credit=reg.direction.upper(),
        regular_or_emergency=(reg.regular_or_emergency or "regular").upper(),
        payment_mode=reg.payment_mode or "cash",
        by_cash_or_cheque=(reg.payment_mode or "cash").upper(),
        due_or_paid=(reg.due_or_paid or "paid").upper(),
        patient_name=reg.patient_name or "—",
        case_number=reg.case_number or "—",
        receipt_number=reg.receipt_number or "—",
        remark=reg.remark or reg.description or "—",
        created_at=reg.created_at,
    )


# ------------------------------------------------------------------------------
# 1. CASE REGISTER (PMS/Fourth_Tab/case_register.png)
# ------------------------------------------------------------------------------

@router.get("/case", response_model=RegisterListResponse)
def get_case_register(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    """
    Case Register displaying Date, Receipt No, Case No, Patient Name, Charges.
    """
    query = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "case"
    )

    if branch_id:
        query = query.filter(FinancialRegister.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(FinancialRegister.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date <= e_dt)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                FinancialRegister.case_number.ilike(search_term),
                FinancialRegister.patient_name.ilike(search_term),
                FinancialRegister.receipt_number.ilike(search_term),
                FinancialRegister.particulars.ilike(search_term),
            )
        )

    total_count = query.count()
    records = query.order_by(desc(FinancialRegister.transaction_date)).offset(skip).limit(limit).all()

    total_sum = Decimal(str(query.with_entities(func.sum(FinancialRegister.amount)).scalar() or 0))
    credit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "credit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))
    debit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "debit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))

    items = [_format_register_item(r, idx=i + 1 + skip) for i, r in enumerate(records)]
    return RegisterListResponse(
        items=items,
        count=total_count,
        sum_amount=total_sum,
        credit_total=credit_total,
        debit_total=debit_total,
    )


# ------------------------------------------------------------------------------
# 2. BANK REGISTER (PMS/Fourth_Tab/bank_register.png)
# ------------------------------------------------------------------------------

@router.get("/bank", response_model=RegisterListResponse)
def get_bank_register(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    query = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "bank"
    )

    if branch_id:
        query = query.filter(FinancialRegister.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(FinancialRegister.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date <= e_dt)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                FinancialRegister.cheque_no.ilike(search_term),
                FinancialRegister.particulars.ilike(search_term),
                FinancialRegister.patient_name.ilike(search_term),
                FinancialRegister.case_number.ilike(search_term),
            )
        )

    total_count = query.count()
    records = query.order_by(desc(FinancialRegister.transaction_date)).offset(skip).limit(limit).all()

    total_sum = Decimal(str(query.with_entities(func.sum(FinancialRegister.amount)).scalar() or 0))
    credit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "credit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))
    debit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "debit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))

    items = [_format_register_item(r, idx=i + 1 + skip) for i, r in enumerate(records)]
    return RegisterListResponse(
        items=items,
        count=total_count,
        sum_amount=total_sum,
        credit_total=credit_total,
        debit_total=debit_total,
    )


@router.post("/bank", response_model=FinancialRegisterItem, status_code=status.HTTP_201_CREATED)
def add_bank_entry(
    payload: FinancialRegisterCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:add")),
):
    count = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "bank"
    ).count()

    entry = FinancialRegister(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id or "default",
        register_type="bank",
        serial_no=count + 1,
        transaction_date=payload.transaction_date or datetime.now(timezone.utc),
        cheque_no=payload.cheque_no.strip() if payload.cheque_no else None,
        particulars=payload.particulars.strip(),
        amount=payload.amount,
        direction=payload.direction,
        regular_or_emergency=payload.regular_or_emergency or "regular",
        payment_mode=payload.payment_mode or "cheque",
        due_or_paid=payload.due_or_paid or "paid",
        remark=payload.remark.strip() if payload.remark else None,
        description=payload.particulars.strip(),
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit_action(
        db=db,
        user=current_user,
        action="bank_register:add",
        entity_type="financial_register",
        entity_id=entry.id,
        new_data={"particulars": entry.particulars, "amount": str(entry.amount), "direction": entry.direction}
    )

    return _format_register_item(entry, count + 1)


# ------------------------------------------------------------------------------
# 3. EXPENSE REGISTER (PMS/Fourth_Tab/expense_register.png)
# ------------------------------------------------------------------------------

@router.get("/expense", response_model=RegisterListResponse)
def get_expense_register(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    query = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "expense"
    )

    if branch_id:
        query = query.filter(FinancialRegister.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(FinancialRegister.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date <= e_dt)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                FinancialRegister.particulars.ilike(search_term),
                FinancialRegister.cheque_no.ilike(search_term),
                FinancialRegister.remark.ilike(search_term),
            )
        )

    total_count = query.count()
    records = query.order_by(desc(FinancialRegister.transaction_date)).offset(skip).limit(limit).all()

    total_sum = Decimal(str(query.with_entities(func.sum(FinancialRegister.amount)).scalar() or 0))
    credit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "credit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))
    debit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "debit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))

    items = [_format_register_item(r, idx=i + 1 + skip) for i, r in enumerate(records)]
    return RegisterListResponse(
        items=items,
        count=total_count,
        sum_amount=total_sum,
        credit_total=credit_total,
        debit_total=debit_total,
    )


@router.post("/expense", response_model=FinancialRegisterItem, status_code=status.HTTP_201_CREATED)
def add_expense_entry(
    payload: FinancialRegisterCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:add")),
):
    count = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "expense"
    ).count()

    entry = FinancialRegister(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id or "default",
        register_type="expense",
        serial_no=count + 1,
        transaction_date=payload.transaction_date or datetime.now(timezone.utc),
        cheque_no=payload.cheque_no.strip() if payload.cheque_no else None,
        particulars=payload.particulars.strip(),
        amount=payload.amount,
        direction=payload.direction or "debit",
        regular_or_emergency=payload.regular_or_emergency or "regular",
        payment_mode=payload.payment_mode or "cash",
        due_or_paid=payload.due_or_paid or "paid",
        remark=payload.remark.strip() if payload.remark else None,
        description=payload.particulars.strip(),
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit_action(
        db=db,
        user=current_user,
        action="expense_register:add",
        entity_type="financial_register",
        entity_id=entry.id,
        new_data={"particulars": entry.particulars, "amount": str(entry.amount), "due_paid": entry.due_or_paid}
    )

    return _format_register_item(entry, count + 1)


# ------------------------------------------------------------------------------
# 4. PETTY CASH REGISTER (PMS/Fourth_Tab/petty_cash.png)
# ------------------------------------------------------------------------------

@router.get("/petty-cash", response_model=RegisterListResponse)
def get_petty_cash_register(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    search: Optional[str] = Query(None),
    branch_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    query = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "petty_cash"
    )

    if branch_id:
        query = query.filter(FinancialRegister.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(FinancialRegister.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date <= e_dt)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                FinancialRegister.particulars.ilike(search_term),
                FinancialRegister.remark.ilike(search_term),
            )
        )

    total_count = query.count()
    records = query.order_by(desc(FinancialRegister.transaction_date)).offset(skip).limit(limit).all()

    total_sum = Decimal(str(query.with_entities(func.sum(FinancialRegister.amount)).scalar() or 0))
    credit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "credit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))
    debit_total = Decimal(str(
        query.filter(FinancialRegister.direction == "debit").with_entities(func.sum(FinancialRegister.amount)).scalar() or 0
    ))

    items = [_format_register_item(r, idx=i + 1 + skip) for i, r in enumerate(records)]
    return RegisterListResponse(
        items=items,
        count=total_count,
        sum_amount=total_sum,
        credit_total=credit_total,
        debit_total=debit_total,
    )


@router.post("/petty-cash", response_model=FinancialRegisterItem, status_code=status.HTTP_201_CREATED)
def add_petty_cash_entry(
    payload: FinancialRegisterCreate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:add")),
):
    count = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "petty_cash"
    ).count()

    entry = FinancialRegister(
        organization_id=current_user.organization_id,
        branch_id=current_user.active_branch_id or "default",
        register_type="petty_cash",
        serial_no=count + 1,
        transaction_date=payload.transaction_date or datetime.now(timezone.utc),
        particulars=payload.particulars.strip(),
        amount=payload.amount,
        direction=payload.direction or "debit",
        payment_mode="cash",
        due_or_paid="paid",
        remark=payload.remark.strip() if payload.remark else None,
        description=payload.particulars.strip(),
        created_by_id=current_user.id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit_action(
        db=db,
        user=current_user,
        action="petty_cash:add",
        entity_type="financial_register",
        entity_id=entry.id,
        new_data={"particulars": entry.particulars, "amount": str(entry.amount), "direction": entry.direction}
    )

    return _format_register_item(entry, count + 1)


# ------------------------------------------------------------------------------
# 5. DATE-WISE REGISTER (PMS/Fourth_Tab/date_wise_register.png)
# ------------------------------------------------------------------------------

@router.get("/date-wise", response_model=DateWiseRegisterResponse)
def get_date_wise_register(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    branch_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUserContext = Depends(require_permission("financial_registers:view")),
):
    """
    Daily aggregated billing register: DATE, DAILYTOTAL, START AT, RECEIPTNOEND
    """
    query = db.query(FinancialRegister).filter(
        FinancialRegister.organization_id == current_user.organization_id,
        FinancialRegister.register_type == "case",
        FinancialRegister.direction == "credit"
    )

    if branch_id:
        query = query.filter(FinancialRegister.branch_id == branch_id)
    elif not current_user.is_superadmin and current_user.active_branch_id:
        query = query.filter(FinancialRegister.branch_id.in_(current_user.branch_ids))

    if start_date:
        s_dt = datetime.combine(start_date, time.min, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date >= s_dt)

    if end_date:
        e_dt = datetime.combine(end_date, time.max, tzinfo=timezone.utc)
        query = query.filter(FinancialRegister.transaction_date <= e_dt)

    records = query.order_by(asc(FinancialRegister.transaction_date)).all()

    # Group by calendar date
    grouped: dict = {}
    for r in records:
        d = r.transaction_date.date()
        if d not in grouped:
            grouped[d] = {
                "daily_total": Decimal("0.00"),
                "receipts": [],
                "count": 0,
            }
        grouped[d]["daily_total"] += Decimal(str(r.amount))
        grouped[d]["count"] += 1
        if r.receipt_number:
            grouped[d]["receipts"].append(r.receipt_number)

    items: List[DateWiseRegisterItem] = []
    total_sum = Decimal("0.00")

    # Sort dates descending
    sorted_dates = sorted(grouped.keys(), reverse=True)
    for d in sorted_dates:
        data = grouped[d]
        total_sum += data["daily_total"]
        receipts = sorted(data["receipts"])
        start_at = receipts[0] if receipts else "—"
        receipt_end = receipts[-1] if receipts else "—"

        items.append(DateWiseRegisterItem(
            date=d,
            daily_total=data["daily_total"],
            start_at=start_at,
            receipt_no_end=receipt_end,
            case_count=data["count"],
        ))

    return DateWiseRegisterResponse(
        items=items,
        count=len(items),
        sum_total=total_sum,
    )

