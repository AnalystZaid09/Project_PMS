def test_list_branches_authenticated(client, admin_token):
    response = client.get(
        "/api/v1/branches",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5
    codes = [b["branch_code"] for b in data]
    assert "1" in codes
    assert "8" in codes


def test_list_branches_unauthenticated(client):
    response = client.get("/api/v1/branches")
    assert response.status_code == 401


def test_create_and_toggle_branch(client, admin_token):
    new_code = "99"
    create_payload = {
        "branch_code": new_code,
        "name": "Nairobi Imaging Clinic",
        "country": "Kenya",
        "state": "Nairobi",
        "city": "Nairobi",
        "phone": "+254 20 555555"
    }
    create_res = client.post(
        "/api/v1/branches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=create_payload
    )
    assert create_res.status_code == 201
    created_branch = create_res.json()
    assert created_branch["branch_code"] == new_code
    assert created_branch["is_active"] is True

    # Toggle status
    toggle_res = client.patch(
        f"/api/v1/branches/{created_branch['id']}/toggle-status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False
