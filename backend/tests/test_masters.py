import pytest
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


def test_list_departments(admin_token):
    res = client.get("/api/v1/departments", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    depts = res.json()
    assert len(depts) >= 5
    names = [d["name"] for d in depts]
    assert "Pathology" in names
    assert "Radiology & Imaging" in names


def test_create_and_update_department(admin_token):
    # Create new department
    dept_code = "NEURO_TEST"
    payload = {
        "name": "Neurology & Neuro-Diagnostics",
        "code": dept_code,
        "description": "EEG, EMG and nerve conduction studies",
        "is_active": True
    }
    create_res = client.post("/api/v1/departments", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_res.status_code == 201
    created_dept = create_res.json()
    assert created_dept["code"] == dept_code
    dept_id = created_dept["id"]

    # Duplicate code rejection
    dup_res = client.post("/api/v1/departments", json=payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert dup_res.status_code == 400

    # Update department
    update_res = client.put(
        f"/api/v1/departments/{dept_id}",
        json={"name": "Neurology Centre Updated", "description": "Updated description"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Neurology Centre Updated"

    # Toggle status
    toggle_res = client.patch(
        f"/api/v1/departments/{dept_id}/toggle-status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Delete unreferenced department
    del_res = client.delete(
        f"/api/v1/departments/{dept_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 204


def test_list_cities(admin_token):
    res = client.get("/api/v1/cities", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    cities = res.json()
    assert len(cities) >= 5
    city_names = [c["name"] for c in cities]
    assert "Vadodara" in city_names
    assert "Kampala" in city_names


def test_patient_categories(admin_token):
    res = client.get("/api/v1/patient-categories", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 3
    cat_names = [c["name"] for c in cats]
    assert "General / Walk-in" in cat_names
    assert "Senior Citizen" in cat_names


def test_doctor_categories(admin_token):
    res = client.get("/api/v1/doctor-categories", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    cats = res.json()
    assert len(cats) >= 3


def test_doctors_list_and_filter(admin_token):
    # List all doctors
    res = client.get("/api/v1/doctors", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) >= 5
    doc_names = [d["full_name"] for d in docs]
    assert "Dr. Marcus Vance" in doc_names
    assert "Dr. Elena Rostova" in doc_names

    # Filter by doctor_type: referring
    ref_res = client.get("/api/v1/doctors?doctor_type=referring", headers={"Authorization": f"Bearer {admin_token}"})
    assert ref_res.status_code == 200
    for doc in ref_res.json():
        assert doc["doctor_type"] in ["referring", "both"]


def test_doctor_investigation_rates(admin_token):
    # Get existing doctors and investigations
    docs = client.get("/api/v1/doctors", headers={"Authorization": f"Bearer {admin_token}"}).json()
    invs = client.get("/api/v1/investigations", headers={"Authorization": f"Bearer {admin_token}"}).json()
    doc_id = docs[0]["id"]
    inv_id = invs[0]["id"]

    # Set tariff rate
    rate_payload = {
        "doctor_id": doc_id,
        "investigation_id": inv_id,
        "rate_type": "referral",
        "regular_fixed": "120.00",
        "regular_percentage": 0.0,
        "emergency_fixed": "180.00",
        "emergency_percentage": 0.0,
    }
    set_res = client.post("/api/v1/doctor-rates", json=rate_payload, headers={"Authorization": f"Bearer {admin_token}"})
    assert set_res.status_code == 201
    rate_data = set_res.json()
    assert float(rate_data["regular_fixed"]) == 120.0

    # Query doctor rates
    rates_list = client.get(f"/api/v1/doctor-rates?doctor_id={doc_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert rates_list.status_code == 200
    assert any(r["investigation_id"] == inv_id for r in rates_list.json())


def test_investigations_catalogue(admin_token):
    res = client.get("/api/v1/investigations", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    invs = res.json()
    assert len(invs) >= 8
    codes = [i["code"] for i in invs]
    assert "CBC-01" in codes
    assert "XRAY-01" in codes
    assert "USG-01" in codes

    # Search filter
    search_res = client.get("/api/v1/investigations?search=Blood", headers={"Authorization": f"Bearer {admin_token}"})
    assert search_res.status_code == 200
    assert any("Blood" in i["name"] for i in search_res.json())


def test_investigation_charges_branch_price(admin_token):
    charges_res = client.get("/api/v1/investigation-charges", headers={"Authorization": f"Bearer {admin_token}"})
    assert charges_res.status_code == 200
    charges = charges_res.json()
    assert len(charges) >= 1
    assert any(c["investigation_code"] == "XRAY-01" for c in charges)


def test_other_charges_crud(admin_token):
    res = client.get("/api/v1/other-charges", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    charges = res.json()
    assert len(charges) >= 3
    codes = [c["code"] for c in charges]
    assert "REG-FEE" in codes

    # Add new charge
    new_charge = {
        "name": "Diagnostic Film Print Charge",
        "code": "FILM-01",
        "default_amount": "50.00",
        "is_taxable": True,
        "is_active": True
    }
    create_res = client.post("/api/v1/other-charges", json=new_charge, headers={"Authorization": f"Bearer {admin_token}"})
    assert create_res.status_code == 201
    charge_id = create_res.json()["id"]

    # Toggle status
    tog_res = client.patch(f"/api/v1/other-charges/{charge_id}/toggle-status", headers={"Authorization": f"Bearer {admin_token}"})
    assert tog_res.status_code == 200
    assert tog_res.json()["is_active"] is False

    # Delete
    del_res = client.delete(f"/api/v1/other-charges/{charge_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert del_res.status_code == 204


def test_email_and_report_templates(admin_token):
    # Email templates
    email_res = client.get("/api/v1/email-templates", headers={"Authorization": f"Bearer {admin_token}"})
    assert email_res.status_code == 200
    email_tmpls = email_res.json()
    assert len(email_tmpls) >= 2

    # Report templates
    report_res = client.get("/api/v1/report-templates", headers={"Authorization": f"Bearer {admin_token}"})
    assert report_res.status_code == 200
    report_tmpls = report_res.json()
    assert len(report_tmpls) >= 3


def test_rbac_restriction_for_receptionist(receptionist_token):
    # Receptionist does not have department_master:add permission
    res = client.post(
        "/api/v1/departments",
        json={"name": "Unauthorized Dept", "code": "UNAUTH", "is_active": True},
        headers={"Authorization": f"Bearer {receptionist_token}"}
    )
    assert res.status_code == 403
