import pytest
from datetime import date
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    res = client.post("/api/v1/auth/login", json={"username_or_email": "admin", "password": "Admin@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def accountant_token():
    res = client.post("/api/v1/auth/login", json={"username_or_email": "accountant", "password": "Admin@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def receptionist_token():
    res = client.post("/api/v1/auth/login", json={"username_or_email": "receptionist", "password": "Admin@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_list_invoices_and_summary(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # List invoices
    res = client.get("/api/v1/invoices", headers=headers)
    assert res.status_code == 200
    invoices = res.json()
    assert len(invoices) >= 3
    
    inv = invoices[0]
    assert "invoice_number" in inv
    assert inv["invoice_number"].startswith("APX-INV-")
    assert "patient_uhid" in inv
    assert "grand_total" in inv
    assert Decimal(str(inv["grand_total"])) > Decimal("0.00")

    # Check Summary stats
    stats_res = client.get("/api/v1/invoices/summary/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_invoices"] >= 3
    assert stats["total_billed"] > 0


def test_invoice_details_and_line_items(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    invoices = client.get("/api/v1/invoices", headers=headers).json()
    target_inv = invoices[0]
    
    res = client.get(f"/api/v1/invoices/{target_inv['id']}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == target_inv["id"]
    assert len(detail["items"]) >= 1
    item = detail["items"][0]
    assert "name" in item
    assert "unit_price" in item
    assert "final_price" in item


def test_payment_collection_split_and_full(accountant_token, admin_token):
    headers_acc = {"Authorization": f"Bearer {accountant_token}"}
    headers_adm = {"Authorization": f"Bearer {admin_token}"}

    # Find or create an unpaid invoice
    invoices = client.get("/api/v1/invoices?payment_status=unpaid", headers=headers_adm).json()
    if not invoices:
        # Create a new case to get an unpaid invoice
        docs = client.get("/api/v1/doctors", headers=headers_adm).json()
        invs = client.get("/api/v1/investigations", headers=headers_adm).json()
        case_res = client.post(
            "/api/v1/cases",
            json={
                "new_patient": {
                    "first_name": "Billing",
                    "last_name": "TestPatient",
                    "phone": "+91-9870001122",
                    "gender": "female",
                },
                "referring_doctor_id": docs[0]["id"],
                "investigations": [{"investigation_id": invs[0]["id"], "quantity": 1}],
                "priority": "normal",
            },
            headers=headers_adm,
        )
        assert case_res.status_code == 201
        case_id = case_res.json()["id"]
        inv_res = client.get(f"/api/v1/invoices/by-case/{case_id}", headers=headers_adm)
        assert inv_res.status_code == 200
        target_inv = inv_res.json()
    else:
        target_inv = invoices[0]

    inv_id = target_inv["id"]
    initial_outstanding = Decimal(str(target_inv["outstanding_balance"]))
    assert initial_outstanding > 0

    # 1. Partial payment (Split payment)
    partial_amount = round(initial_outstanding / Decimal("2.0"), 2)
    pay_res1 = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": float(partial_amount),
            "payment_mode": "cash",
            "notes": "First partial split payment",
        },
        headers=headers_acc,
    )
    assert pay_res1.status_code == 201
    pay1 = pay_res1.json()
    assert pay1["receipt_number"].startswith("APX-REC-")
    assert Decimal(str(pay1["amount"])) == partial_amount

    # Verify invoice status changed to partially_paid
    inv_check1 = client.get(f"/api/v1/invoices/{inv_id}", headers=headers_acc).json()
    assert inv_check1["payment_status"] == "partially_paid"
    assert Decimal(str(inv_check1["paid_amount"])) == partial_amount
    new_outstanding = Decimal(str(inv_check1["outstanding_balance"]))

    # 2. Reject payment exceeding outstanding balance
    excess_res = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={"amount": float(new_outstanding + Decimal("500.00")), "payment_mode": "upi"},
        headers=headers_acc,
    )
    assert excess_res.status_code == 400

    # 3. Pay remaining balance to complete
    pay_res2 = client.post(
        f"/api/v1/invoices/{inv_id}/payments",
        json={
            "amount": float(new_outstanding),
            "payment_mode": "upi",
            "reference_number": "UPI-REF-998877",
            "notes": "Settling final remaining balance",
        },
        headers=headers_acc,
    )
    assert pay_res2.status_code == 201

    # Verify invoice status is now fully paid
    inv_check2 = client.get(f"/api/v1/invoices/{inv_id}", headers=headers_acc).json()
    assert inv_check2["payment_status"] == "paid"
    assert Decimal(str(inv_check2["outstanding_balance"])) == Decimal("0.00")
    assert len(inv_check2["payments"]) >= 2


def test_refund_processing(accountant_token, admin_token):
    headers_acc = {"Authorization": f"Bearer {accountant_token}"}
    headers_adm = {"Authorization": f"Bearer {admin_token}"}

    # Find a paid invoice
    invoices = client.get("/api/v1/invoices?payment_status=paid", headers=headers_adm).json()
    assert len(invoices) >= 1
    target_inv = invoices[0]
    inv_id = target_inv["id"]
    paid_amt = Decimal(str(target_inv["paid_amount"]))
    assert paid_amt > 0

    refund_amt = Decimal("50.00") if paid_amt > Decimal("100.00") else paid_amt / 2

    refund_res = client.post(
        f"/api/v1/invoices/{inv_id}/refund",
        json={
            "amount": float(refund_amt),
            "payment_mode": "cash",
            "reason": "Test investigation cancelled by patient request",
        },
        headers=headers_acc,
    )
    assert refund_res.status_code == 201
    refund = refund_res.json()
    assert refund["is_refund"] is True
    assert Decimal(str(refund["amount"])) == refund_amt


def test_case_register_endpoint(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    res = client.get("/api/v1/registers/case", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert "sum_amount" in data
    assert "items" in data
    assert data["count"] >= 1
    assert Decimal(str(data["sum_amount"])) > Decimal("0.00")
    item = data["items"][0]
    assert "receipt_number" in item
    assert "case_number" in item
    assert "patient_name" in item
    assert "amount" in item


def test_bank_register_crud(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    # 1. List bank register
    res = client.get("/api/v1/registers/bank", headers=headers)
    assert res.status_code == 200
    initial_count = res.json()["count"]

    # 2. Add bank register transaction
    new_entry = {
        "register_type": "bank",
        "cheque_no": "CHQ-TEST-12345",
        "particulars": "Insurance Settlement Deposit - Test Company",
        "amount": 25000.00,
        "direction": "credit",
        "regular_or_emergency": "regular",
        "payment_mode": "cheque",
        "due_or_paid": "paid",
        "remark": "Automated verification test deposit",
    }
    create_res = client.post("/api/v1/registers/bank", json=new_entry, headers=headers)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["cheque_no"] == "CHQ-TEST-12345"
    assert Decimal(str(created["amount"])) == Decimal("25000.00")

    # 3. Verify count increased
    res_after = client.get("/api/v1/registers/bank", headers=headers)
    assert res_after.status_code == 200
    assert res_after.json()["count"] == initial_count + 1


def test_expense_register_crud(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    # Add expense
    new_expense = {
        "register_type": "expense",
        "cheque_no": "CHQ-EXP-8899",
        "particulars": "Sterilization Equipment Autoclave Service",
        "amount": 4500.00,
        "direction": "debit",
        "regular_or_emergency": "regular",
        "payment_mode": "cheque",
        "due_or_paid": "paid",
        "remark": "Quarterly autoclave preventive maintenance",
    }
    create_res = client.post("/api/v1/registers/expense", json=new_expense, headers=headers)
    assert create_res.status_code == 201
    assert create_res.json()["particulars"] == "Sterilization Equipment Autoclave Service"

    # List expenses
    list_res = client.get("/api/v1/registers/expense", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["count"] >= 1
    assert Decimal(str(list_res.json()["sum_amount"])) > Decimal("0.00")


def test_petty_cash_register_crud(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    new_entry = {
        "register_type": "petty_cash",
        "particulars": "Courier charges for urgent blood sample shipment",
        "amount": 350.00,
        "direction": "debit",
        "payment_mode": "cash",
        "due_or_paid": "paid",
        "remark": "Direct laboratory transport",
    }
    create_res = client.post("/api/v1/registers/petty-cash", json=new_entry, headers=headers)
    assert create_res.status_code == 201
    assert Decimal(str(create_res.json()["amount"])) == Decimal("350.00")

    list_res = client.get("/api/v1/registers/petty-cash", headers=headers)
    assert list_res.status_code == 200
    assert list_res.json()["count"] >= 1


def test_date_wise_register(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    res = client.get("/api/v1/registers/date-wise", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "count" in data
    assert "sum_total" in data
    assert "items" in data
    assert data["count"] >= 1
    assert Decimal(str(data["sum_total"])) > Decimal("0.00")
    item = data["items"][0]
    assert "date" in item
    assert "daily_total" in item
    assert "start_at" in item
    assert "receipt_no_end" in item


def test_charge_reports_endpoints(accountant_token):
    headers = {"Authorization": f"Bearer {accountant_token}"}
    
    # 1. Charges Report
    cr_res = client.get("/api/v1/reports/charges", headers=headers)
    assert cr_res.status_code == 200
    cr_items = cr_res.json()
    assert len(cr_items) >= 1
    assert "case_number" in cr_items[0]
    assert "investigation_name" in cr_items[0]
    assert "amount" in cr_items[0]

    # 2. Other Charges Report
    ocr_res = client.get("/api/v1/reports/other-charges", headers=headers)
    assert ocr_res.status_code == 200
