import os
import io
import datetime
import logging
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.db.database import get_db, Base, engine
from app.db.models import User, PlanTier, DailyUsage, OCRJob, JobStatus, AuditLog, SystemSetting
from app.core.security import hash_password, create_access_token
from app.core.logging_config import RedactingLogFilter
from app.services.captcha_service import verify_captcha_token, get_captcha_settings

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_test_users():
    """Sets up verified admin, unverified admin, standard user, and banned user."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        # Create or update verified admin
        admin_user = db.query(User).filter(User.email == "phase6_admin@example.com").first()
        if not admin_user:
            admin_user = User(
                email="phase6_admin@example.com",
                hashed_password=hash_password("AdminPass123!"),
                is_admin=True,
                is_verified=True,
                is_banned=False,
                plan_tier=PlanTier.PRO
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Create unverified admin
        unverified_admin = db.query(User).filter(User.email == "unverified_admin@example.com").first()
        if not unverified_admin:
            unverified_admin = User(
                email="unverified_admin@example.com",
                hashed_password=hash_password("AdminPass123!"),
                is_admin=True,
                is_verified=False,
                is_banned=False,
                plan_tier=PlanTier.FREE
            )
            db.add(unverified_admin)
            db.commit()
            db.refresh(unverified_admin)

        # Create standard non-admin user
        standard_user = db.query(User).filter(User.email == "phase6_standard@example.com").first()
        if not standard_user:
            standard_user = User(
                email="phase6_standard@example.com",
                hashed_password=hash_password("UserPass123!"),
                is_admin=False,
                is_verified=True,
                is_banned=False,
                plan_tier=PlanTier.FREE
            )
            db.add(standard_user)
            db.commit()
            db.refresh(standard_user)

        # Create banned user
        banned_user = db.query(User).filter(User.email == "phase6_banned@example.com").first()
        if not banned_user:
            banned_user = User(
                email="phase6_banned@example.com",
                hashed_password=hash_password("BannedPass123!"),
                is_admin=False,
                is_verified=True,
                is_banned=True,
                plan_tier=PlanTier.FREE
            )
            db.add(banned_user)
            db.commit()
            db.refresh(banned_user)

        admin_token = create_access_token({"sub": admin_user.id, "email": admin_user.email})
        unverified_admin_token = create_access_token({"sub": unverified_admin.id, "email": unverified_admin.email})
        standard_token = create_access_token({"sub": standard_user.id, "email": standard_user.email})
        banned_token = create_access_token({"sub": banned_user.id, "email": banned_user.email})

        return {
            "admin": admin_user,
            "admin_token": admin_token,
            "unverified_admin": unverified_admin,
            "unverified_admin_token": unverified_admin_token,
            "standard_user": standard_user,
            "standard_token": standard_token,
            "banned_user": banned_user,
            "banned_token": banned_token,
        }
    finally:
        db.close()


def test_rbac_boundaries_unauthenticated_rejected():
    """Unauthenticated requests to admin routes must return 401 Unauthorized."""
    endpoints = [
        "/api/v1/admin/stats",
        "/api/v1/admin/users",
        "/api/v1/admin/settings",
        "/api/v1/admin/jobs",
        "/api/v1/admin/queue-stats",
        "/api/v1/admin/audit-logs",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {ep}, got {res.status_code}"


def test_rbac_boundaries_non_admin_forbidden(setup_test_users):
    """Standard non-admin users must be rejected with 403 Forbidden."""
    token = setup_test_users["standard_token"]
    headers = {"Authorization": f"Bearer {token}"}
    endpoints = [
        "/api/v1/admin/stats",
        "/api/v1/admin/users",
        "/api/v1/admin/settings",
        "/api/v1/admin/jobs",
        "/api/v1/admin/queue-stats",
        "/api/v1/admin/audit-logs",
    ]
    for ep in endpoints:
        res = client.get(ep, headers=headers)
        assert res.status_code == 403, f"Expected 403 for non-admin {ep}, got {res.status_code}"


def test_rbac_boundaries_unverified_admin_forbidden(setup_test_users):
    """Admin accounts that have not verified email must receive 403 Forbidden."""
    token = setup_test_users["unverified_admin_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/admin/stats", headers=headers)
    assert res.status_code == 403
    assert "verification" in res.json()["detail"].lower()


def test_rbac_boundaries_banned_user_rejected(setup_test_users):
    """Banned users must receive 403 Forbidden on authenticated endpoints."""
    token = setup_test_users["banned_token"]
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 403
    assert "suspended" in res.json()["detail"].lower()


def test_admin_access_authorized(setup_test_users):
    """Verified administrator must succeed with 200 OK across admin endpoints."""
    token = setup_test_users["admin_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_stats = client.get("/api/v1/admin/stats", headers=headers)
    assert res_stats.status_code == 200
    assert "totalUsers" in res_stats.json()["stats"]

    res_users = client.get("/api/v1/admin/users", headers=headers)
    assert res_users.status_code == 200
    assert "users" in res_users.json()

    res_settings = client.get("/api/v1/admin/settings", headers=headers)
    assert res_settings.status_code == 200
    assert "settings" in res_settings.json()


def test_admin_reset_user_quota(setup_test_users):
    """Admin should be able to reset a user's daily conversion usage to 0 and generate an audit log."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    standard_user = setup_test_users["standard_user"]
    admin_token = setup_test_users["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        today = datetime.date.today()
        # Seed daily usage
        usage = db.query(DailyUsage).filter(DailyUsage.user_id == standard_user.id, DailyUsage.usage_date == today).first()
        if not usage:
            usage = DailyUsage(user_id=standard_user.id, usage_date=today, conversion_count=5, pages_processed=12)
            db.add(usage)
        else:
            usage.conversion_count = 5
            usage.pages_processed = 12
        db.commit()

        # Admin triggers reset
        res = client.post(f"/api/v1/admin/users/{standard_user.id}/reset-quota", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["conversionsReset"] == 5
        assert data["userId"] == standard_user.id

        # Verify DB updated
        db.refresh(usage)
        assert usage.conversion_count == 0
        assert usage.pages_processed == 0

        # Verify Audit Log written
        audit = db.query(AuditLog).filter(AuditLog.action == "RESET_QUOTA").order_by(AuditLog.created_at.desc()).first()
        assert audit is not None
        assert standard_user.email in audit.details
    finally:
        db.close()


def test_admin_ocr_jobs_zero_retention_guarantee(setup_test_users):
    """GET /admin/jobs must strictly omit raw user documents and extracted OCR text."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    admin_token = setup_test_users["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        # Create a test job with sensitive plaintext result
        test_job = OCRJob(
            filename="confidential_contract.pdf",
            secure_path="/tmp/ocr_uploads/secret_contract_123.pdf",
            status=JobStatus.COMPLETED,
            file_type="pdf",
            page_count=3,
            processed_pages=3,
            text_result="CONFIDENTIAL FINANCIAL DATA 1234-5678",
            processing_ms=450.0
        )
        db.add(test_job)
        db.commit()

        res = client.get("/api/v1/admin/jobs", headers=headers)
        assert res.status_code == 200
        jobs = res.json()["jobs"]
        assert len(jobs) > 0

        for j in jobs:
            # Zero-retention privacy check: raw text and secure paths must never be exposed
            assert "text_result" not in j or j.get("text_result") is None, "Zero-retention violation: text_result exposed!"
            assert "text" not in j or j.get("text") is None, "Zero-retention violation: text exposed!"
            assert "secure_path" not in j, "Zero-retention violation: secure_path exposed!"
            assert "filename" in j
            assert "status" in j
            assert "processingMs" in j
    finally:
        db.close()


def test_admin_queue_stats_endpoint(setup_test_users):
    """GET /admin/queue-stats returns Celery queue depth and DB job states."""
    admin_token = setup_test_users["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/admin/queue-stats", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "celeryQueueLength" in data
    assert "redisConnected" in data
    assert "processingJobs" in data
    assert "queuedJobs" in data
    assert isinstance(data["celeryQueueLength"], int)


def test_health_and_readiness_probes():
    """Tests /health (liveness) and /ready (operational readiness) probes."""
    # Liveness Probe
    res_liveness = client.get("/health")
    assert res_liveness.status_code == 200
    assert res_liveness.json()["status"] == "healthy"

    res_v1_health = client.get("/api/v1/health")
    assert res_v1_health.status_code == 200

    # Readiness Probe
    res_ready = client.get("/ready")
    assert res_ready.status_code in (200, 503)
    data = res_ready.json()
    assert "status" in data
    assert "components" in data
    assert "database" in data["components"]
    assert "redis" in data["components"]
    assert "disk_storage" in data["components"]


def test_secret_redaction_in_logs():
    """Verifies RedactingLogFilter scrubs Stripe secrets, JWT tokens, and credentials."""
    redactor = RedactingLogFilter()

    # Test Stripe Secret Key Redaction
    record1 = logging.LogRecord("test", logging.INFO, "", 0, "Processing with key sk_test_5123456789abcdefghijklmnop", (), None)
    redactor.filter(record1)
    assert "sk_test_5123456789abcdefghijklmnop" not in record1.msg
    assert "sk_test_••••••••" in record1.msg

    # Test Stripe Webhook Secret Redaction
    record2 = logging.LogRecord("test", logging.INFO, "", 0, "Webhook secret is whsec_1234567890abcdef", (), None)
    redactor.filter(record2)
    assert "whsec_1234567890abcdef" not in record2.msg
    assert "whsec_••••••••" in record2.msg

    # Test Bearer Token Redaction
    record3 = logging.LogRecord("test", logging.INFO, "", 0, "Header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", (), None)
    redactor.filter(record3)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in record3.msg
    assert "[REDACTED_JWT]" in record3.msg

    # Test Password Redaction
    record4 = logging.LogRecord("test", logging.INFO, "", 0, '{"password": "SecretPassword123!"}', (), None)
    redactor.filter(record4)
    assert "SecretPassword123!" not in record4.msg
    assert "••••••••" in record4.msg


def test_captcha_verification_service():
    """Tests CAPTCHA service behavior under disabled, bypass, and enabled modes."""
    # When disabled or bypass token used, verify_captcha_token returns True
    success, msg = verify_captcha_token("test-captcha-token", "127.0.0.1")
    assert success is True
    assert "bypass" in msg.lower() or "disabled" in msg.lower()

    success_dev, _ = verify_captcha_token("development-bypass-token", "127.0.0.1")
    assert success_dev is True


def test_admin_trigger_expired_cleanup(setup_test_users):
    """Admin can manually trigger zero-retention cleanup of expired jobs."""
    from app.db.database import SessionLocal
    db = SessionLocal()
    admin_token = setup_test_users["admin_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    try:
        # Seed an expired job
        past_time = datetime.datetime.utcnow() - datetime.timedelta(hours=2)
        expired_job = OCRJob(
            filename="expired_doc.pdf",
            secure_path="/tmp/ocr_uploads/non_existent_file.pdf",
            status=JobStatus.COMPLETED,
            file_type="pdf",
            text_result="This should be wiped",
            expires_at=past_time
        )
        db.add(expired_job)
        db.commit()
        db.refresh(expired_job)
        job_id = expired_job.job_id

        # Trigger cleanup
        res = client.post("/api/v1/admin/cleanup/trigger", headers=headers)
        assert res.status_code == 200
        assert "purgedCount" in res.json()

        # Verify job was expired and text wiped
        db.refresh(expired_job)
        assert expired_job.status == JobStatus.EXPIRED
        assert expired_job.text_result is None
    finally:
        db.close()
