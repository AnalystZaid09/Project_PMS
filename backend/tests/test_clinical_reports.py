import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin", "password": "Admin@123"}
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def doctor_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "drmarcus", "password": "Admin@123"}
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def doctor_headers(doctor_token):
    return {"Authorization": f"Bearer {doctor_token}"}


# ------------------------------------------------------------------------------
# 1. Report List & KPI Summary Stats
# ------------------------------------------------------------------------------

def test_get_clinical_reports_stats(admin_headers):
    res = client.get("/api/v1/clinical-reports/summary/stats", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "total_reports" in data
    assert "draft_count" in data
    assert "submitted_count" in data
    assert "finalized_count" in data
    assert data["total_reports"] >= 1


def test_list_clinical_reports(admin_headers):
    res = client.get("/api/v1/clinical-reports", headers=admin_headers)
    assert res.status_code == 200, res.text
    reports = res.json()
    assert isinstance(reports, list)
    assert len(reports) > 0

    first = reports[0]
    assert "id" in first
    assert "report_number" in first
    assert "case_number" in first
    assert "patient_name" in first
    assert "status" in first


# ------------------------------------------------------------------------------
# 2. Report Details & Draft Updates
# ------------------------------------------------------------------------------

def test_get_and_update_report_draft(admin_headers):
    # Fetch report list to find a draft
    list_res = client.get("/api/v1/clinical-reports?status=draft", headers=admin_headers)
    assert list_res.status_code == 200
    drafts = list_res.json()
    assert len(drafts) > 0, "No draft report found for testing"
    target_id = drafts[0]["id"]

    # Fetch detail
    det_res = client.get(f"/api/v1/clinical-reports/{target_id}", headers=admin_headers)
    assert det_res.status_code == 200
    detail = det_res.json()
    assert detail["id"] == target_id
    assert "versions" in detail
    assert "attachments" in detail

    # Update draft findings
    upd_payload = {
        "report_name": "Updated Test Findings Study",
        "report_heading": "TEST INVESTIGATION AP VIEW",
        "findings_text": "Updated radiological examination shows normal bone trabecular architecture without focal lytic or sclerotic lesions.",
        "impression": "Normal radiological study. No significant pathology.",
        "recommendation": "Follow-up as clinically indicated.",
        "patient_email": "patient.test@example.com",
    }
    upd_res = client.put(f"/api/v1/clinical-reports/{target_id}", json=upd_payload, headers=admin_headers)
    assert upd_res.status_code == 200, upd_res.text
    updated = upd_res.json()
    assert updated["report_name"] == upd_payload["report_name"]
    assert updated["findings_text"] == upd_payload["findings_text"]
    assert updated["impression"] == upd_payload["impression"]
    assert updated["patient_email"] == upd_payload["patient_email"]


# ------------------------------------------------------------------------------
# 3. Report Lifecycle: Submit -> Verify -> Finalize -> Lock
# ------------------------------------------------------------------------------

def test_report_lifecycle_and_locking(admin_headers, doctor_headers):
    list_res = client.get("/api/v1/clinical-reports?status=draft", headers=admin_headers)
    drafts = list_res.json()
    assert len(drafts) > 0
    target_id = drafts[0]["id"]

    # Ensure findings exist before submitting
    client.put(f"/api/v1/clinical-reports/{target_id}", json={
        "findings_text": "Specimen examined reveals cellular morphology within standard baseline parameters.",
        "impression": "No abnormal histopathological features detected."
    }, headers=admin_headers)

    # 1. Submit for review
    sub_res = client.post(f"/api/v1/clinical-reports/{target_id}/submit", json={"notes": "Ready for doctor verification"}, headers=admin_headers)
    assert sub_res.status_code == 200, sub_res.text
    assert sub_res.json()["status"] == "submitted"

    # 2. Verify report (by Doctor)
    ver_res = client.post(f"/api/v1/clinical-reports/{target_id}/verify", json={"verification_remarks": "Reviewed and verified findings"}, headers=doctor_headers)
    assert ver_res.status_code == 200, ver_res.text
    assert ver_res.json()["status"] == "verified"
    assert ver_res.json()["verified_at"] is not None

    # 3. Finalize report & Digital Sign-off
    fin_res = client.post(f"/api/v1/clinical-reports/{target_id}/finalize", json={"digital_signature": True, "final_notes": "Signed off by Doctor"}, headers=doctor_headers)
    assert fin_res.status_code == 200, fin_res.text
    finalized = fin_res.json()
    assert finalized["status"] == "finalized"
    assert finalized["digital_signature"] is True
    assert finalized["finalized_at"] is not None

    # 4. Finalization Guard: Direct PUT must be rejected
    fail_edit = client.put(f"/api/v1/clinical-reports/{target_id}", json={"findings_text": "Attempted tamper"}, headers=admin_headers)
    assert fail_edit.status_code == 400
    assert "Finalized clinical reports cannot be directly modified" in fail_edit.json()["detail"]


# ------------------------------------------------------------------------------
# 4. Amendment Workflow: Addendum with Reason
# ------------------------------------------------------------------------------

def test_report_amendment_workflow(doctor_headers):
    list_res = client.get("/api/v1/clinical-reports?status=finalized", headers=doctor_headers)
    finalized_list = list_res.json()
    assert len(finalized_list) > 0
    target_id = finalized_list[0]["id"]

    amend_payload = {
        "amendment_reason": "Addendum: Additional comparison with prior 2025 radiological baseline study.",
        "findings_text": "Updated findings including comparison with prior scan: stable appearance without interval change.",
        "impression": "Amended: Stable mild degenerative disease without interval progression.",
        "recommendation": "Physical therapy and routine annual follow-up."
    }
    amend_res = client.post(f"/api/v1/clinical-reports/{target_id}/amend", json=amend_payload, headers=doctor_headers)
    assert amend_res.status_code == 200, amend_res.text
    amended = amend_res.json()
    assert amended["status"] == "amended"
    assert amended["current_version"] >= 2
    assert len(amended["versions"]) >= 2
    assert amended["versions"][0]["amendment_reason"] == amend_payload["amendment_reason"]


# ------------------------------------------------------------------------------
# 5. Attachments Upload & Deletion
# ------------------------------------------------------------------------------

def test_report_attachments(admin_headers):
    list_res = client.get("/api/v1/clinical-reports", headers=admin_headers)
    reports = list_res.json()
    target_id = reports[0]["id"]

    # Upload attachment
    att_payload = {
        "file_name": "CHEST_RADIOGRAPH_PA.png",
        "file_type": "image/png",
        "file_size": 102400,
        "file_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "caption": "Digital Chest Radiograph PA View (Verified)"
    }
    att_res = client.post(f"/api/v1/clinical-reports/{target_id}/attachments", json=att_payload, headers=admin_headers)
    assert att_res.status_code == 201, att_res.text
    att_data = att_res.json()
    assert att_data["file_name"] == att_payload["file_name"]
    att_id = att_data["id"]

    # Delete attachment
    del_res = client.delete(f"/api/v1/clinical-reports/{target_id}/attachments/{att_id}", headers=admin_headers)
    assert del_res.status_code == 204


# ------------------------------------------------------------------------------
# 6. Referring and Reporting Doctor Reports
# ------------------------------------------------------------------------------

def test_referring_doctor_report(admin_headers):
    res = client.get("/api/v1/reports/referring-doctor", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert "total_cases" in data
    assert "total_commission" in data
    if data["items"]:
        first = data["items"][0]
        assert "doctor_name" in first
        assert "commission_amount" in first


def test_reporting_doctor_report(admin_headers):
    res = client.get("/api/v1/reports/reporting-doctor", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "items" in data
    assert "total_cases" in data
    assert "total_fees" in data
    if data["items"]:
        first = data["items"][0]
        assert "doctor_name" in first
        assert "rate_amount" in first
        assert "report_status" in first


def test_send_patient_report_email(admin_headers):
    list_res = client.get("/api/v1/clinical-reports", headers=admin_headers)
    reports = list_res.json()
    target_id = reports[0]["id"]

    email_res = client.post(
        f"/api/v1/clinical-reports/{target_id}/send-email",
        params={"email": "patient.delivery@example.com"},
        headers=admin_headers
    )
    assert email_res.status_code == 200, email_res.text
    assert email_res.json()["status"] == "success"
    assert email_res.json()["recipient"] == "patient.delivery@example.com"
