import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime
from unittest.mock import patch

from app.main import app
from app.db.database import Base, get_db
from app.db.models import User, EmailVerificationToken, PasswordResetToken, DailyUsage, PlanTier, OCRJob, JobStatus
from app.core.config import settings
from app.core.security import hash_password, create_access_token

# In-memory SQLite engine for fast isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_phase3.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=engine)
    client.cookies.clear()
    yield
    Base.metadata.drop_all(bind=engine)
    client.cookies.clear()
    app.dependency_overrides.pop(get_db, None)

def test_user_registration_and_email_verification():
    # 1. Register User
    reg_res = client.post(
        "/api/v1/auth/register",
        json={"email": "testuser@example.com", "password": "SecurePassword123!"}
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert data["user"]["email"] == "testuser@example.com"
    assert data["user"]["isVerified"] is False

    # 2. Get verification token from DB
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "testuser@example.com").first()
    assert user is not None
    token_obj = db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user.id).first()
    assert token_obj is not None
    token_str = token_obj.token
    db.close()

    # 3. Verify Email
    verify_res = client.get(f"/api/v1/auth/verify-email?token={token_str}")
    assert verify_res.status_code == 200
    assert "verified" in verify_res.json()["message"].lower()

    # 4. Check DB user status
    db = TestingSessionLocal()
    user_after = db.query(User).filter(User.email == "testuser@example.com").first()
    assert user_after.is_verified is True
    db.close()

def test_user_login_and_me_endpoint():
    # Create verified user directly in DB
    db = TestingSessionLocal()
    user = User(
        email="authuser@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
        plan_tier=PlanTier.FREE
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    # Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "authuser@example.com", "password": "Password123!"}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "accessToken" in login_data
    token = login_data["accessToken"]

    # Access /auth/me with Bearer token
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == "authuser@example.com"
    assert me_data["quota"]["planTier"] == "free"
    assert me_data["quota"]["conversionsRemaining"] == settings.FREE_DAILY_CONVERSIONS

def test_password_reset_flow():
    db = TestingSessionLocal()
    user = User(
        email="resetuser@example.com",
        hashed_password=hash_password("OldPassword123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()

    # Forgot password request
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "resetuser@example.com"}
    )
    assert forgot_res.status_code == 200

    # Retrieve reset token
    reset_obj = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).first()
    assert reset_obj is not None
    token_str = reset_obj.token
    db.close()

    # Reset password
    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token_str, "newPassword": "NewSecurePassword123!"}
    )
    assert reset_res.status_code == 200

    # Try login with old password (should fail)
    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "resetuser@example.com", "password": "OldPassword123!"}
    )
    assert old_login.status_code == 401

    # Try login with new password (should succeed)
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "resetuser@example.com", "password": "NewSecurePassword123!"}
    )
    assert new_login.status_code == 200

@patch("app.api.jobs_router.process_ocr_job_async.delay")
def test_free_quota_exhaustion_limits(mock_celery_delay):
    db = TestingSessionLocal()
    today = datetime.date.today()
    # 1. Anonymous IP exhaustion
    usage_anon = DailyUsage(
        ip_address="testclient",
        usage_date=today,
        conversion_count=settings.ANONYMOUS_DAILY_CONVERSIONS
    )
    db.add(usage_anon)

    # 2. Free user exhaustion
    user = User(
        email="freeuser@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
        plan_tier=PlanTier.FREE
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    usage_user = DailyUsage(
        user_id=user.id,
        usage_date=today,
        conversion_count=settings.FREE_DAILY_CONVERSIONS
    )
    db.add(usage_user)
    db.commit()
    user_token = create_access_token(data={"sub": user.id, "email": user.email})
    db.close()

    # Attempt 1: Anonymous job submission when quota reached -> 429
    img_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    res_anon = client.post(
        "/api/v1/jobs",
        files={"file": ("test.png", img_content, "image/png")}
    )
    assert res_anon.status_code == 429
    assert "conversions reached" in res_anon.json()["detail"].lower()

    # Attempt 2: Logged-in Free user job submission when quota reached -> 429
    res_user = client.post(
        "/api/v1/jobs",
        files={"file": ("test2.png", img_content, "image/png")},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert res_user.status_code == 429
    assert "conversions reached" in res_user.json()["detail"].lower()

def test_account_deletion_cascading_purge():
    db = TestingSessionLocal()
    user = User(
        email="deleteuser@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()
    user_id = user.id

    # Create associated OCR job
    job = OCRJob(
        job_id="job-delete-test-123",
        user_id=user_id,
        filename="test.pdf",
        secure_path="/tmp/ocr_uploads/test.pdf",
        status=JobStatus.COMPLETED
    )
    db.add(job)
    db.commit()
    db.close()

    token = create_access_token(data={"sub": user_id, "email": "deleteuser@example.com"})

    # Delete Account
    del_res = client.delete(
        "/api/v1/auth/account",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_res.status_code == 200

    # Verify user and jobs are deleted from DB
    db = TestingSessionLocal()
    assert db.query(User).filter(User.id == user_id).first() is None
    assert db.query(OCRJob).filter(OCRJob.user_id == user_id).first() is None
    db.close()

def test_unauthenticated_access_rejection():
    # Protected endpoints must reject unauthenticated requests with 401 Unauthorized
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 401
    assert "authentication required" in me_res.json()["detail"].lower()

    del_res = client.delete("/api/v1/auth/account")
    assert del_res.status_code == 401
    assert "authentication required" in del_res.json()["detail"].lower()

    cancel_res = client.post("/api/v1/auth/cancel-pro")
    assert cancel_res.status_code == 401
    assert "authentication required" in cancel_res.json()["detail"].lower()

def test_password_reset_token_expiry():
    db = TestingSessionLocal()
    user = User(
        email="expireduser@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()

    # Create expired token (2 hours in the past)
    expired_token_str = "expired-token-uuid-12345"
    expired_token = PasswordResetToken(
        user_id=user.id,
        token=expired_token_str,
        expires_at=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    )
    db.add(expired_token)
    db.commit()
    db.close()

    # Attempt to reset password with expired token
    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": expired_token_str, "newPassword": "NewValidPassword123!"}
    )
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()

    # Ensure expired token was purged from DB
    db = TestingSessionLocal()
    assert db.query(PasswordResetToken).filter(PasswordResetToken.token == expired_token_str).first() is None
    db.close()

def test_password_reset_token_single_use():
    db = TestingSessionLocal()
    user = User(
        email="singleuse@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True
    )
    db.add(user)
    db.commit()

    valid_token_str = "single-use-token-uuid-54321"
    token_obj = PasswordResetToken(
        user_id=user.id,
        token=valid_token_str,
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    )
    db.add(token_obj)
    db.commit()
    db.close()

    # First attempt: succeeds (200)
    res1 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": valid_token_str, "newPassword": "BrandNewPassword123!"}
    )
    assert res1.status_code == 200

    # Second attempt with same token: rejected (400)
    res2 = client.post(
        "/api/v1/auth/reset-password",
        json={"token": valid_token_str, "newPassword": "AnotherPassword123!"}
    )
    assert res2.status_code == 400
    assert "invalid or expired" in res2.json()["detail"].lower()

def test_admin_only_docs_protection():
    # 1. Unauthenticated access is blocked with 401
    anon_docs = client.get("/api/v1/docs")
    assert anon_docs.status_code == 401

    anon_schema = client.get("/api/v1/openapi.json")
    assert anon_schema.status_code == 401

    # 2. Regular non-admin user access is blocked with 403 Forbidden
    db = TestingSessionLocal()
    regular_user = User(
        email="regular@example.com",
        hashed_password=hash_password("Password123!"),
        is_verified=True,
        is_admin=False
    )
    db.add(regular_user)
    db.commit()
    db.refresh(regular_user)
    regular_token = create_access_token(data={"sub": regular_user.id, "email": regular_user.email})

    admin_user = User(
        email="admin@example.com",
        hashed_password=hash_password("AdminPassword123!"),
        is_verified=True,
        is_admin=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    admin_token = create_access_token(data={"sub": admin_user.id, "email": admin_user.email})
    db.close()

    reg_docs = client.get("/api/v1/docs", headers={"Authorization": f"Bearer {regular_token}"})
    assert reg_docs.status_code == 403
    assert "administrator access required" in reg_docs.json()["detail"].lower()

    reg_schema = client.get("/api/v1/openapi.json", headers={"Authorization": f"Bearer {regular_token}"})
    assert reg_schema.status_code == 403

    # 3. Authenticated admin user access succeeds with 200 OK
    adm_docs = client.get("/api/v1/docs", headers={"Authorization": f"Bearer {admin_token}"})
    assert adm_docs.status_code == 200
    assert "swagger" in adm_docs.text.lower()

    adm_schema = client.get("/api/v1/openapi.json", headers={"Authorization": f"Bearer {admin_token}"})
    assert adm_schema.status_code == 200
    assert "openapi" in adm_schema.json()
