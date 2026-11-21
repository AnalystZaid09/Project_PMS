import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security_headers import validate_file_upload, sanitize_filename
from fastapi import HTTPException

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
def receptionist_token():
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "receptionist", "password": "Admin@123"}
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def receptionist_headers(receptionist_token):
    return {"Authorization": f"Bearer {receptionist_token}"}


# ------------------------------------------------------------------------------
# 1. Backups Listing, Creation and Downloads
# ------------------------------------------------------------------------------

def test_list_backups(admin_headers):
    res = client.get("/api/v1/backups", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert isinstance(data, list)


def test_create_database_dump_backup(admin_headers):
    payload = {
        "backup_type": "database_dump",
        "notes": "Automated test database snapshot"
    }
    res = client.post("/api/v1/backups", json=payload, headers=admin_headers)
    assert res.status_code == 200, res.text
    backup = res.json()

    assert "id" in backup
    assert "filename" in backup
    assert "checksum_sha256" in backup
    assert backup["status"] == "completed"
    assert backup["backup_type"] == "database_dump"

    # Download the backup
    res_down = client.get(f"/api/v1/backups/{backup['id']}/download", headers=admin_headers)
    assert res_down.status_code == 200, res_down.text
    assert len(res_down.content) > 0


def test_create_full_system_archive(admin_headers):
    payload = {
        "backup_type": "full_system_archive",
        "notes": "Full system archive containing DB + uploaded scans"
    }
    res = client.post("/api/v1/backups", json=payload, headers=admin_headers)
    assert res.status_code == 200, res.text
    backup = res.json()
    assert backup["filename"].endswith(".zip")
    assert backup["backup_type"] == "full_system_archive"


def test_restore_backup_verification(admin_headers):
    # Create fresh backup to restore
    res_b = client.post("/api/v1/backups", json={"backup_type": "database_dump"}, headers=admin_headers)
    assert res_b.status_code == 200
    b_id = res_b.json()["id"]

    # Trigger restore
    res_r = client.post(f"/api/v1/backups/{b_id}/restore", headers=admin_headers)
    assert res_r.status_code == 200, res_r.text
    data = res_r.json()
    assert data["status"] == "success"
    assert "successfully restored" in data["message"]


def test_delete_backup(admin_headers):
    # Create a temporary backup to delete
    res_b = client.post("/api/v1/backups", json={"backup_type": "database_dump"}, headers=admin_headers)
    assert res_b.status_code == 200
    b_id = res_b.json()["id"]

    # Delete it
    res_del = client.delete(f"/api/v1/backups/{b_id}", headers=admin_headers)
    assert res_del.status_code == 200, res_del.text


# ------------------------------------------------------------------------------
# 2. RBAC Permissions Enforcement on Backups
# ------------------------------------------------------------------------------

def test_backup_rbac_rejection(receptionist_headers):
    # Receptionist cannot view, create, or restore backups
    res_list = client.get("/api/v1/backups", headers=receptionist_headers)
    assert res_list.status_code == 403

    res_create = client.post("/api/v1/backups", json={"backup_type": "database_dump"}, headers=receptionist_headers)
    assert res_create.status_code == 403


# ------------------------------------------------------------------------------
# 3. Security Headers & File Upload Hardening
# ------------------------------------------------------------------------------

def test_security_headers_present():
    res = client.get("/")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert "Strict-Transport-Security" in headers
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_file_upload_validation_safe_vs_dangerous():
    # Safe clinical formats
    assert validate_file_upload("chest_xray.png", 500000) is True
    assert validate_file_upload("ultrasound_scan.dcm", 2000000) is True
    assert validate_file_upload("pathology_report.pdf", 1000000) is True

    # Dangerous executable formats must be rejected
    with pytest.raises(HTTPException) as exc1:
        validate_file_upload("trojan_script.exe", 5000)
    assert exc1.value.status_code == 400
    assert "Disallowed file extension" in exc1.value.detail

    with pytest.raises(HTTPException) as exc2:
        validate_file_upload("malicious_batch.bat", 200)
    assert exc2.value.status_code == 400

    # Oversized file > 10MB
    with pytest.raises(HTTPException) as exc3:
        validate_file_upload("huge_mri.dcm", 15 * 1024 * 1024)
    assert exc3.value.status_code == 413


def test_filename_sanitization():
    assert sanitize_filename("../../etc/passwd.pdf") == "passwd.pdf"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("safe_report_2026.pdf") == "safe_report_2026.pdf"
