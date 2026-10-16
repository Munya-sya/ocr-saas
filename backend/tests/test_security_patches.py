import os
import io
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app
from app.db.database import init_db, SessionLocal
from app.db.models import User, OCRJob, JobStatus, PlanTier
from app.core.security import hash_password, create_access_token
from app.core.config import settings
from app.services.captcha_service import verify_captcha_token
from app.services.ocr_engine import validate_image_security
from fastapi import HTTPException

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    init_db()
    db = SessionLocal()
    try:
        db.query(OCRJob).delete()
        db.query(User).filter(User.email.like("sectest_%")).delete()
        db.commit()
    finally:
        db.close()
    client.cookies.clear()

def create_test_user(email: str, is_banned: bool = False, is_admin: bool = False):
    db = SessionLocal()
    try:
        user = User(
            email=email,
            hashed_password=hash_password("SecurePass123!"),
            is_verified=True,
            is_admin=is_admin,
            is_banned=is_banned,
            plan_tier=PlanTier.FREE
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token({"sub": user.id, "email": user.email})
        return user, token
    finally:
        db.close()

def test_banned_user_cannot_login():
    """Verify Issue 7: Banned users are blocked at /auth/login with 403."""
    user, _ = create_test_user("sectest_banned@example.com", is_banned=True)
    resp = client.post("/api/v1/auth/login", json={
        "email": "sectest_banned@example.com",
        "password": "SecurePass123!"
    })
    assert resp.status_code == 403
    assert "suspended" in resp.json()["detail"].lower()

def test_bola_cross_user_job_isolation():
    """Verify Issue 1: User A cannot read or delete User B's OCR job."""
    user_a, token_a = create_test_user("sectest_usera@example.com")
    user_b, token_b = create_test_user("sectest_userb@example.com")

    # Create job owned by User B
    db = SessionLocal()
    try:
        job_b = OCRJob(
            job_id="00000000-0000-0000-0000-000000000001",
            user_id=user_b.id,
            filename="confidential_invoice.pdf",
            secure_path="/tmp/fake_path.pdf",
            status=JobStatus.COMPLETED,
            file_type="pdf",
            text_result="SECRET FINANCIAL DATA",
            ip_address="127.0.0.1"
        )
        db.add(job_b)
        db.commit()
    finally:
        db.close()

    # User A tries to inspect User B's job status -> 403
    client.cookies.set("access_token", token_a)
    resp_status = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000001")
    assert resp_status.status_code == 403
    assert "authorization" in resp_status.json()["detail"].lower()

    # User A tries to read User B's extracted text -> 403
    resp_result = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000001/result")
    assert resp_result.status_code == 403

    # User A tries to delete User B's job -> 403
    resp_del = client.delete("/api/v1/jobs/00000000-0000-0000-0000-000000000001")
    assert resp_del.status_code == 403

    # User B accessing their own job succeeds -> 200
    client.cookies.set("access_token", token_b)
    resp_owner = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000001/result")
    assert resp_owner.status_code == 200
    assert resp_owner.json()["text"] == "SECRET FINANCIAL DATA"

def test_captcha_bypass_blocked_in_production():
    """Verify Issue 4: Development bypass token is strictly rejected when ENVIRONMENT=production."""
    with patch("app.services.captcha_service.get_captcha_settings", return_value=(True, "turnstile", "mock_site", "mock_sec")):
        with patch.object(settings, "ENVIRONMENT", "production"):
            with patch("os.getenv", return_value="production"):
                # In production, the bypass token must not be accepted; it proceeds to verify against Turnstile
                with patch("urllib.request.urlopen") as mock_url:
                    mock_resp = mock_url.return_value.__enter__.return_value
                    mock_resp.read.return_value = b'{"success": false, "error-codes": ["invalid-input-response"]}'
                    valid, msg = verify_captcha_token("test-captcha-token", "1.2.3.4")
                    assert valid is False
                    assert "rejected" in msg.lower()

def test_image_decompression_bomb_guard():
    """Verify Issue 5: Images exceeding 25 Megapixels raise HTTPException."""
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tmp_name = tf.name
        # Create an image that reports 6000x5000 = 30 Megapixels
        img = Image.new("RGB", (6000, 5000), color=(255, 255, 255))
        img.save(tmp_name)

    try:
        with pytest.raises(HTTPException) as exc_info:
            validate_image_security(tmp_name)
        assert exc_info.value.status_code == 400
        assert "25 Megapixels" in exc_info.value.detail
    finally:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)

@patch("stripe.Subscription.cancel")
def test_gdpr_account_deletion_cancels_stripe_and_purges_files(mock_stripe_cancel):
    """Verify GDPR Art. 17 / Consumer Protection: Account deletion cancels Stripe sub & purges disk files."""
    user, token = create_test_user("sectest_gdpr_del@example.com")
    db = SessionLocal()
    u = db.query(User).filter(User.id == user.id).first()
    u.stripe_subscription_id = "sub_gdpr_active_999"
    u.plan_tier = PlanTier.PRO
    db.commit()

    # Create dummy uploaded file on disk
    temp_dir = getattr(settings, "TEMP_UPLOAD_DIR", "/tmp/ocr_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, "test_gdpr_user_file.pdf")
    with open(file_path, "wb") as f:
        f.write(b"%PDF-1.4 test document content")

    job = OCRJob(
        job_id="00000000-0000-0000-0000-000000000099",
        user_id=user.id,
        filename="test_gdpr.pdf",
        secure_path=file_path,
        status=JobStatus.COMPLETED,
        file_type="pdf"
    )
    db.add(job)
    db.commit()
    db.close()

    assert os.path.exists(file_path)

    # Call DELETE /api/v1/auth/account
    client.cookies.set("access_token", token)
    res = client.delete("/api/v1/auth/account")
    assert res.status_code == 200
    assert "permanently erased" in res.json()["message"]

    # 1. Stripe subscription cancel called
    mock_stripe_cancel.assert_called_once_with("sub_gdpr_active_999", api_key=settings.STRIPE_SECRET_KEY)

    # 2. Disk file purged
    assert not os.path.exists(file_path)

    # 3. User erased from database
    db = SessionLocal()
    assert db.query(User).filter(User.id == user.id).first() is None
    db.close()

def test_gdpr_article_20_data_portability_export():
    """Verify GDPR Art. 20: User can export all personal profile and OCR history as machine-readable JSON."""
    user, token = create_test_user("sectest_export@example.com")
    client.cookies.set("access_token", token)

    res = client.get("/api/v1/auth/export-data")
    assert res.status_code == 200
    assert "scantext_user_data.json" in res.headers.get("content-disposition", "")

    data = res.json()
    assert "exportMetadata" in data
    assert "GDPR Article 20" in data["exportMetadata"]["standard"]
    assert data["userProfile"]["email"] == "sectest_export@example.com"
    assert "dailyUsageHistory" in data
    assert "ocrJobsHistory" in data
    assert "hashed_password" not in data["userProfile"]

def test_validator_allows_large_pdf():
    """Verify file size validator allows PDFs up to MAX_PDF_MB (50MB) rather than hardcoded 10MB."""
    from app.services.validator import validate_upload_file
    pdf_header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3"
    twenty_mb = 20 * 1024 * 1024

    # 20MB PDF should succeed without exception
    validate_upload_file("large_document.pdf", pdf_header, twenty_mb)

    # 51MB PDF exceeds 50MB and should raise 413
    fifty_one_mb = 51 * 1024 * 1024
    with pytest.raises(HTTPException) as exc_info:
        validate_upload_file("huge_document.pdf", pdf_header, fifty_one_mb)
    assert exc_info.value.status_code == 413


def test_anonymous_job_idor_and_proxy_conflation_protection():
    """Verify Vulnerabilities 1 & 2: Anonymous jobs require secret job_token and are never leaked by IP alone."""
    db = SessionLocal()
    try:
        job = OCRJob(
            job_id="00000000-0000-0000-0000-anon00000001",
            user_id=None,
            filename="anon_confidential.pdf",
            secure_path="/tmp/fake_anon.pdf",
            status=JobStatus.COMPLETED,
            file_type="pdf",
            text_result="ANON SECRET DATA",
            ip_address="198.51.100.99",
            job_token="super_secret_anon_token_12345"
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    # 1. Attacker on the SAME IP without token tries GET /{job_id} -> 403 Forbidden
    resp = client.get(
        "/api/v1/jobs/00000000-0000-0000-0000-anon00000001",
        headers={"X-Forwarded-For": "198.51.100.99"}
    )
    assert resp.status_code == 403
    assert "token" in resp.json()["detail"].lower()

    # 2. Attacker on the SAME IP without token tries GET /{job_id}/result -> 403 Forbidden
    resp_result = client.get(
        "/api/v1/jobs/00000000-0000-0000-0000-anon00000001/result",
        headers={"X-Forwarded-For": "198.51.100.99"}
    )
    assert resp_result.status_code == 403

    # 3. Attacker on the SAME IP tries to list anonymous jobs via GET /api/v1/jobs -> receives empty list []
    resp_list = client.get(
        "/api/v1/jobs",
        headers={"X-Forwarded-For": "198.51.100.99"}
    )
    assert resp_list.status_code == 200
    assert resp_list.json() == []

    # 4. Legitimate owner with X-Job-Token header -> 200 OK
    resp_owner = client.get(
        "/api/v1/jobs/00000000-0000-0000-0000-anon00000001/result",
        headers={
            "X-Forwarded-For": "198.51.100.99",
            "X-Job-Token": "super_secret_anon_token_12345"
        }
    )
    assert resp_owner.status_code == 200
    assert resp_owner.json()["text"] == "ANON SECRET DATA"


def test_admin_account_squatting_blocked():
    """Verify Vulnerability 6: Unverified registration with INITIAL_ADMIN_EMAIL cannot claim admin privileges."""
    with patch.object(settings, "INITIAL_ADMIN_EMAIL", "sectest_admin_target@example.com"):
        with patch("app.services.captcha_service.verify_captcha_token", return_value=(True, "OK")):
            with patch("app.api.auth_router.send_verification_email"):
                # Attacker registers with the target admin email
                reg_resp = client.post(
                    "/api/v1/auth/register",
                    json={
                        "email": "sectest_admin_target@example.com",
                        "password": "Password123!"
                    }
                )
                assert reg_resp.status_code == 201

                # Verify user in database is NOT admin
                db = SessionLocal()
                try:
                    user = db.query(User).filter(User.email == "sectest_admin_target@example.com").first()
                    assert user is not None
                    assert user.is_admin is False
                    assert user.is_verified is False
                finally:
                    db.close()


def test_banned_user_blocked_on_password_reset():
    """Verify Vulnerability 7: Banned accounts cannot request or execute password resets."""
    user, _ = create_test_user("sectest_banned_reset@example.com", is_banned=True)
    with patch("app.services.captcha_service.verify_captcha_token", return_value=(True, "OK")):
        resp = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "sectest_banned_reset@example.com"}
        )
        assert resp.status_code == 403
        assert "suspended" in resp.json()["detail"].lower()


