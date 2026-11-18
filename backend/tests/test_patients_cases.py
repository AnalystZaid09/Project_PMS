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
def receptionist_token():
    res = client.post("/api/v1/auth/login", json={"username_or_email": "receptionist", "password": "Admin@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def master_ids(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get a doctor
    docs = client.get("/api/v1/doctors", headers=headers).json()
    assert len(docs) > 0
    ref_doc_id = docs[0]["id"]
    rep_doc_id = docs[1]["id"] if len(docs) > 1 else docs[0]["id"]

    # Get investigations
    invs = client.get("/api/v1/investigations", headers=headers).json()
    assert len(invs) >= 2
    inv1_id = invs[0]["id"]
    inv1_price = invs[0]["default_price"]
    inv2_id = invs[1]["id"]
    inv2_price = invs[1]["default_price"]

    # Get patient categories
    cats = client.get("/api/v1/patient-categories", headers=headers).json()
    senior_cat = next((c for c in cats if "Senior" in c["name"]), cats[0])

    # Get other charge types
    charge_types = client.get("/api/v1/other-charges", headers=headers).json()
    charge_type = charge_types[0] if charge_types else None

    # Get department
    depts = client.get("/api/v1/departments", headers=headers).json()
    dept_id = depts[0]["id"] if depts else None

    return {
        "ref_doc_id": ref_doc_id,
        "rep_doc_id": rep_doc_id,
        "inv1_id": inv1_id,
        "inv1_price": Decimal(str(inv1_price)),
        "inv2_id": inv2_id,
        "inv2_price": Decimal(str(inv2_price)),
        "senior_cat_id": senior_cat["id"],
        "senior_discount_pct": Decimal(str(senior_cat["discount_percentage"] or 0)),
        "charge_type_id": charge_type["id"] if charge_type else None,
        "charge_type_name": charge_type["name"] if charge_type else "Syringe & Needle",
        "charge_default_amt": Decimal(str(charge_type["default_amount"] or 50)) if charge_type else Decimal("50.00"),
        "dept_id": dept_id,
    }


def test_patient_registration_and_uhid_generation(receptionist_token):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    payload = {
        "first_name": "Vikram",
        "last_name": "Singhania",
        "dob": "1980-05-15",
        "gender": "male",
        "blood_group": "O+",
        "phone": "+91-9820011223",
        "email": "vikram.singhania@example.com",
        "address": "404 Sea View Heights, Bandra West",
        "city": "Mumbai",
        "emergency_contact": "+91-9820099887",
        "is_active": True
    }
    
    res = client.post("/api/v1/patients", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    pat = res.json()
    assert pat["first_name"] == "Vikram"
    assert pat["last_name"] == "Singhania"
    assert pat["patient_uhid"].startswith("APX-PAT-")
    assert pat["age"] is not None and pat["age"] > 40
    assert pat["phone"] == "+91-9820011223"


def test_duplicate_patient_check(receptionist_token):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # 1. Check with existing phone
    check_payload = {
        "phone": "+91-9820011223",
        "first_name": "Vikram",
        "last_name": "Singhania"
    }
    res = client.post("/api/v1/patients/check-duplicates", json=check_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["has_duplicates"] is True
    assert len(data["possible_matches"]) >= 1
    match = data["possible_matches"][0]
    assert match["phone"] == "+91-9820011223"
    assert "Matching mobile phone number" in match["match_reasons"]

    # 2. Check with unique phone and name
    unique_payload = {
        "phone": "+91-9999900000",
        "first_name": "Unregistered",
        "last_name": "Person"
    }
    res_uniq = client.post("/api/v1/patients/check-duplicates", json=unique_payload, headers=headers)
    assert res_uniq.status_code == 200
    assert res_uniq.json()["has_duplicates"] is False


def test_patient_search_and_update(receptionist_token):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # Search by phone
    res = client.get("/api/v1/patients?search=9820011223", headers=headers)
    assert res.status_code == 200
    pats = res.json()
    assert len(pats) >= 1
    patient_id = pats[0]["id"]

    # Update patient address & email
    update_payload = {
        "email": "vikram.updated@example.com",
        "address": "702 Marina Tower, Worli"
    }
    up_res = client.put(f"/api/v1/patients/{patient_id}", json=update_payload, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["email"] == "vikram.updated@example.com"
    assert up_res.json()["address"] == "702 Marina Tower, Worli"


def test_case_registration_wizard_with_server_calculation(receptionist_token, master_ids):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # 1. Register a Senior Citizen patient
    pat_payload = {
        "first_name": "Ramesh",
        "last_name": "Patel",
        "dob": "1955-08-12",
        "gender": "male",
        "blood_group": "B+",
        "phone": "+91-9811223344",
        "city": "Mumbai",
        "category_id": master_ids["senior_cat_id"]
    }
    pat_res = client.post("/api/v1/patients", json=pat_payload, headers=headers)
    assert pat_res.status_code == 201
    patient_id = pat_res.json()["id"]

    # 2. Create case via wizard
    wizard_payload = {
        "patient_id": patient_id,
        "referring_doctor_id": master_ids["ref_doc_id"],
        "reporting_doctor_id": master_ids["rep_doc_id"],
        "department_id": master_ids["dept_id"],
        "case_category": "regular",
        "patient_category_id": master_ids["senior_cat_id"],
        "investigations": [
            {"investigation_id": master_ids["inv1_id"], "quantity": 1},
            {"investigation_id": master_ids["inv2_id"], "quantity": 1}
        ],
        "other_charges": [
            {
                "charge_type_id": master_ids["charge_type_id"],
                "charge_name": master_ids["charge_type_name"],
                "amount": float(master_ids["charge_default_amt"])
            }
        ] if master_ids["charge_type_id"] else [],
        "symptoms": "Persistent dry cough, mild dyspnea on exertion for 2 weeks",
        "clinical_notes": "Chest X-Ray and CBC advised. Prior history of hypertension.",
        "priority": "normal"
    }

    case_res = client.post("/api/v1/cases", json=wizard_payload, headers=headers)
    assert case_res.status_code == 201, case_res.text
    case = case_res.json()

    assert case["case_number"].startswith("APX-CAS-")
    assert case["patient_id"] == patient_id
    assert case["status"] == "registered"
    assert len(case["items"]) == 2

    # Verify server-side financial calculations
    inv1_expected = master_ids["inv1_price"]
    inv2_expected = master_ids["inv2_price"]
    other_amt = master_ids["charge_default_amt"] if master_ids["charge_type_id"] else Decimal("0.00")
    expected_subtotal = inv1_expected + inv2_expected + other_amt
    
    disc_pct = master_ids["senior_discount_pct"]
    expected_discount = round((inv1_expected + inv2_expected) * (disc_pct / Decimal("100.00")), 2)
    expected_net = expected_subtotal - expected_discount

    actual_charges = Decimal(str(case["total_charges"]))
    actual_discount = Decimal(str(case["discount_total"]))
    actual_net = Decimal(str(case["net_amount"]))

    assert actual_charges == expected_subtotal
    assert actual_discount == expected_discount
    assert actual_net == expected_net

    # Verify referring doctor name display
    assert case["referring_doctor_name"] is not None


def test_inline_patient_case_registration(receptionist_token, master_ids):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # Register case with inline new patient
    wizard_payload = {
        "new_patient": {
            "first_name": "Meera",
            "last_name": "Kulkarni",
            "dob": "1992-03-24",
            "gender": "female",
            "phone": "+91-9765432100",
            "city": "Pune",
        },
        "referring_doctor_id": master_ids["ref_doc_id"],
        "reporting_doctor_id": master_ids["rep_doc_id"],
        "department_id": master_ids["dept_id"],
        "case_category": "emergency",
        "priority": "urgent",
        "investigations": [
            {"investigation_id": master_ids["inv1_id"], "quantity": 1}
        ],
        "symptoms": "Acute abdominal pain, vomiting",
        "clinical_notes": "Stat ultrasound advised",
    }

    res = client.post("/api/v1/cases", json=wizard_payload, headers=headers)
    assert res.status_code == 201, res.text
    case = res.json()
    assert case["case_number"].startswith("APX-CAS-")
    assert case["patient_name"] == "Meera Kulkarni"
    assert case["priority"] == "urgent"
    assert case["case_category"] == "emergency"


def test_list_cases_and_filters(receptionist_token):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # 1. List cases
    res = client.get("/api/v1/cases", headers=headers)
    assert res.status_code == 200
    cases = res.json()
    assert len(cases) >= 2
    
    # 2. Search case
    search_res = client.get("/api/v1/cases?search=Meera", headers=headers)
    assert search_res.status_code == 200
    search_cases = search_res.json()
    assert len(search_cases) >= 1
    assert "Meera" in search_cases[0]["patient_name"]

    # 3. Summary stats
    stats_res = client.get("/api/v1/cases/stats/summary", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_cases"] >= 2
    assert stats["today_cases"] >= 2
    assert stats["emergency_cases"] >= 1


def test_patient_profile_and_chronological_timeline(receptionist_token):
    headers = {"Authorization": f"Bearer {receptionist_token}"}
    
    # Find patient Ramesh Patel
    search_res = client.get("/api/v1/patients?search=Ramesh", headers=headers)
    assert search_res.status_code == 200
    ramesh = search_res.json()[0]
    
    profile_res = client.get(f"/api/v1/patients/{ramesh['id']}/profile", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()

    assert profile["patient"]["first_name"] == "Ramesh"
    assert profile["total_visits"] >= 1
    assert Decimal(str(profile["total_billed"])) > 0
    assert len(profile["timeline"]) >= 2  # registration + case booked
    events = [e["event_type"] for e in profile["timeline"]]
    assert "patient_registration" in events
    assert "case_booked" in events


def test_case_cancellation(admin_token, master_ids):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Register a case to cancel
    wizard_payload = {
        "new_patient": {
            "first_name": "Cancel",
            "last_name": "TestPatient",
            "gender": "male",
            "phone": "+91-9111222333",
        },
        "referring_doctor_id": master_ids["ref_doc_id"],
        "investigations": [
            {"investigation_id": master_ids["inv1_id"], "quantity": 1}
        ],
        "priority": "normal"
    }
    case_res = client.post("/api/v1/cases", json=wizard_payload, headers=headers)
    assert case_res.status_code == 201
    case_id = case_res.json()["id"]

    # Cancel case
    del_res = client.delete(f"/api/v1/cases/{case_id}?reason=Patient+requested+cancellation", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

    # Verify status changed to cancelled
    detail_res = client.get(f"/api/v1/cases/{case_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["status"] == "cancelled"
