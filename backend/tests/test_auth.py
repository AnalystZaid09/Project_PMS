def test_login_success(client):
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["username"] == "admin"
    assert "Admin" in data["user"]["roles"]
    assert len(data["user"]["permissions"]) > 0


def test_login_invalid_password(client):
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword!999"
    })
    assert response.status_code == 401
    assert "Incorrect username/email or password" in response.json()["detail"]


def test_login_nonexistent_user(client):
    response = client.post("/api/v1/auth/login", json={
        "username_or_email": "nonexistent_user",
        "password": "Admin@123"
    })
    assert response.status_code == 401


def test_get_current_user_me(client, admin_token):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "admin"
    assert len(data["allowed_branches"]) > 0


def test_change_password(client, admin_token):
    response = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "current_password": "Admin@123",
            "new_password": "NewSecretPassword@123"
        }
    )
    assert response.status_code == 200

    # Revert back for subsequent tests
    client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "current_password": "NewSecretPassword@123",
            "new_password": "Admin@123"
        }
    )

