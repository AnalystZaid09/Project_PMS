def test_receptionist_forbidden_from_admin_users(client, receptionist_token):
    # Receptionist role does not possess 'user_master:view' permission
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {receptionist_token}"}
    )
    assert response.status_code == 403
    assert "Access denied: Missing required permission" in response.json()["detail"]


def test_receptionist_forbidden_from_roles_permissions(client, receptionist_token):
    response = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {receptionist_token}"}
    )
    assert response.status_code == 403


def test_receptionist_forbidden_from_general_settings(client, receptionist_token):
    response = client.get(
        "/api/v1/settings/general",
        headers={"Authorization": f"Bearer {receptionist_token}"}
    )
    assert response.status_code == 403


def test_admin_allowed_on_admin_users(client, admin_token):
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5


def test_admin_allowed_on_roles(client, admin_token):
    response = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 5

