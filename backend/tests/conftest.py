import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.db.seed import seed_database
from app.main import app as fastapi_app
import app.models  # noqa: F401

# In-memory SQLite engine for fast, isolated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


fastapi_app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="function")
def client():
    with TestClient(fastapi_app) as c:
        yield c


@pytest.fixture(scope="function")
def admin_token(client):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="function")
def receptionist_token(client):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "receptionist",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="function")
def superadmin_token(client):
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "superadmin",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]
