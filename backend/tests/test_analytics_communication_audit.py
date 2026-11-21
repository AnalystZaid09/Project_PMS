import pytest
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
# 1. Executive Analytics & Dashboard
# ------------------------------------------------------------------------------

def test_get_dashboard_analytics(admin_headers):
    res = client.get("/api/v1/analytics/dashboard", headers=admin_headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "kpis" in data
    kpi = data["kpis"]
    assert "total_patients" in kpi
    assert "today_cases" in kpi
    assert "emergency_cases" in kpi
    assert "today_revenue" in kpi
    assert "outstanding_dues" in kpi

    assert "revenue_trends" in data
    assert len(data["revenue_trends"]) == 14

    assert "department_distribution" in data
    assert "priority_breakdown" in data
    assert "top_investigations" in data
    assert "emergency_queue" in data
    assert "pending_verifications" in data


# ------------------------------------------------------------------------------
# 2. Internal Staff Chat
# ------------------------------------------------------------------------------

def test_chat_channels_and_users(admin_headers):
    # Channels
    res_ch = client.get("/api/v1/chat/channels", headers=admin_headers)
    assert res_ch.status_code == 200, res_ch.text
    channels = res_ch.json()
    assert len(channels) >= 3
    ch_names = [c["name"] for c in channels]
    assert "general" in ch_names
    assert "clinical-updates" in ch_names

    # Users
    res_u = client.get("/api/v1/chat/users", headers=admin_headers)
    assert res_u.status_code == 200, res_u.text
    users = res_u.json()
    assert len(users) >= 1
    assert any(u["username"] == "drmarcus" for u in users)


def test_send_and_get_channel_message(receptionist_headers):
    # Send message to general channel
    payload = {
        "channel": "general",
        "content": "Morning shift hand-off complete. All reception counters active."
    }
    res_send = client.post("/api/v1/chat/messages", json=payload, headers=receptionist_headers)
    assert res_send.status_code == 200, res_send.text
    msg = res_send.json()
    assert msg["channel"] == "general"
    assert "Morning shift" in msg["content"]
    assert msg["sender_name"] == "Emily Watson"

    # Fetch general messages
    res_get = client.get("/api/v1/chat/messages?channel=general", headers=receptionist_headers)
    assert res_get.status_code == 200, res_get.text
    msgs = res_get.json()
    assert any("Morning shift" in m["content"] for m in msgs)


def test_send_direct_message_and_mark_read(receptionist_headers, doctor_headers):
    # Find doctor user id
    res_u = client.get("/api/v1/chat/users", headers=receptionist_headers)
    doc = next(u for u in res_u.json() if u["username"] == "drmarcus")

    # Receptionist sends direct message to doctor
    payload = {
        "recipient_id": doc["id"],
        "content": "Patient Rajesh Mehta requires review for lumbar spine x-ray."
    }
    res_send = client.post("/api/v1/chat/messages", json=payload, headers=receptionist_headers)
    assert res_send.status_code == 200, res_send.text
    msg = res_send.json()
    assert msg["recipient_id"] == doc["id"]

    # Doctor fetches direct messages
    res_get = client.get(f"/api/v1/chat/messages?recipient_id={res_send.json()['sender_id']}", headers=doctor_headers)
    assert res_get.status_code == 200, res_get.text

    # Mark as read
    res_read = client.post(f"/api/v1/chat/mark-read?sender_id={res_send.json()['sender_id']}", headers=doctor_headers)
    assert res_read.status_code == 200, res_read.text


# ------------------------------------------------------------------------------
# 3. In-App Notifications
# ------------------------------------------------------------------------------

def test_user_notifications_lifecycle(doctor_headers):
    # Fetch notifications
    res = client.get("/api/v1/notifications", headers=doctor_headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "unread_count" in data
    assert "items" in data

    if data["items"]:
        first_notif_id = data["items"][0]["id"]
        # Mark single notification as read
        res_read = client.post(f"/api/v1/notifications/{first_notif_id}/read", headers=doctor_headers)
        assert res_read.status_code == 200, res_read.text

    # Mark all as read
    res_all = client.post("/api/v1/notifications/read-all", headers=doctor_headers)
    assert res_all.status_code == 200, res_all.text


# ------------------------------------------------------------------------------
# 4. Email Communication & Logs
# ------------------------------------------------------------------------------

def test_send_and_list_emails(admin_headers):
    # Dispatch email
    payload = {
        "recipient_email": "test.patient@apexhealth.org",
        "recipient_name": "Test Patient",
        "subject": "Diagnostic Examination Confirmation",
        "body": "Dear Patient, your upcoming radiology examination is scheduled for tomorrow at Apex Central Diagnostic Hospital."
    }
    res_send = client.post("/api/v1/emails/send", json=payload, headers=admin_headers)
    assert res_send.status_code == 200, res_send.text
    log = res_send.json()
    assert log["recipient_email"] == "test.patient@apexhealth.org"
    assert log["status"] == "sent"

    # List email logs
    res_logs = client.get("/api/v1/emails/logs", headers=admin_headers)
    assert res_logs.status_code == 200, res_logs.text
    logs = res_logs.json()
    assert any(l["recipient_email"] == "test.patient@apexhealth.org" for l in logs)


def test_send_email_invalid_format_rejected(admin_headers):
    payload = {
        "recipient_email": "invalid-email-address",
        "subject": "Notice",
        "body": "Test message body."
    }
    res = client.post("/api/v1/emails/send", json=payload, headers=admin_headers)
    assert res.status_code == 400


# ------------------------------------------------------------------------------
# 5. Enhanced Audit Logs & Activity Stats
# ------------------------------------------------------------------------------

def test_audit_logs_stats_and_filters(admin_headers):
    # Stats
    res_stats = client.get("/api/v1/audit-logs/stats", headers=admin_headers)
    assert res_stats.status_code == 200, res_stats.text
    stats = res_stats.json()
    assert "total_logs" in stats
    assert "login_events" in stats
    assert "clinical_events" in stats

    # Filtered audit logs
    res_logs = client.get("/api/v1/audit-logs?limit=25", headers=admin_headers)
    assert res_logs.status_code == 200, res_logs.text
    assert len(res_logs.json()) >= 1
