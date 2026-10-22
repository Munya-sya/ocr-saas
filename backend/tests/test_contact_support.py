import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import User, PlanTier, ContactMessage, ContactStatus, AuditLog
from app.core.security import hash_password, create_access_token

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_contact_test_users():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "contact_admin@example.com").first()
        if not admin_user:
            admin_user = User(
                email="contact_admin@example.com",
                hashed_password=hash_password("AdminPass123!"),
                is_admin=True,
                is_verified=True,
                is_banned=False,
                plan_tier=PlanTier.PRO
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        normal_user = db.query(User).filter(User.email == "contact_normal@example.com").first()
        if not normal_user:
            normal_user = User(
                email="contact_normal@example.com",
                hashed_password=hash_password("UserPass123!"),
                is_admin=False,
                is_verified=True,
                is_banned=False,
                plan_tier=PlanTier.FREE
            )
            db.add(normal_user)
            db.commit()
            db.refresh(normal_user)

        yield {
            "admin": admin_user,
            "admin_token": create_access_token({"sub": admin_user.id, "email": admin_user.email, "role": "admin"}),
            "user": normal_user,
            "user_token": create_access_token({"sub": normal_user.id, "email": normal_user.email, "role": "user"}),
        }
    finally:
        db.close()


def test_public_contact_form_submission():
    """Test public submission of contact form."""
    with patch("app.api.router.send_contact_confirmation_email") as mock_email, \
         patch("app.api.router.send_admin_new_inquiry_alert"):
        mock_email.return_value = (True, "OK")

        response = client.post(
            "/api/v1/contact",
            json={
                "name": "Jane Doe",
                "email": "janedoe@example.com",
                "subject": "Enterprise Pricing Inquiry",
                "message": "Hello, I would like to inquire about enterprise high-volume OCR plans."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "messageId" in data
        assert "Thank you" in data["message"]

        # Verify record in DB
        db = SessionLocal()
        try:
            msg = db.query(ContactMessage).filter(ContactMessage.id == data["messageId"]).first()
            assert msg is not None
            assert msg.name == "Jane Doe"
            assert msg.email == "janedoe@example.com"
            assert msg.subject == "Enterprise Pricing Inquiry"
            assert msg.status == ContactStatus.NEW
        finally:
            db.close()


def test_public_contact_form_validation():
    """Test validation errors for invalid payloads."""
    # Invalid email
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Jane Doe",
            "email": "not-an-email",
            "subject": "Test",
            "message": "Testing..."
        }
    )
    assert response.status_code == 422

    # Missing message
    response = client.post(
        "/api/v1/contact",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "subject": "Test"
        }
    )
    assert response.status_code == 422


def test_public_contact_form_rate_limiting():
    """Test rate limiting on contact form (max 10 per hour per IP)."""
    with patch("app.api.router.send_contact_confirmation_email"), \
         patch("app.api.router.send_admin_new_inquiry_alert"):
        for i in range(12):
            resp = client.post(
                "/api/v1/contact",
                headers={"X-Forwarded-For": "198.51.100.42"},
                json={
                    "name": f"Rate Limit Test {i}",
                    "email": f"ratelimit{i}@example.com",
                    "subject": "Testing Limits",
                    "message": "Flood inquiry message"
                }
            )
            if resp.status_code == 429:
                assert "Too many inquiries submitted" in resp.json()["detail"]
                break
        else:
            pytest.fail("Expected 429 Too Many Requests after rapid submissions")


def test_admin_contact_messages_unauthorized(setup_contact_test_users):
    """Test access control: non-admins cannot list support messages."""
    users = setup_contact_test_users

    # Anonymous request
    resp = client.get("/api/v1/admin/contact-messages")
    assert resp.status_code in [401, 403]

    # Standard non-admin user
    resp = client.get(
        "/api/v1/admin/contact-messages",
        headers={"Authorization": f"Bearer {users['user_token']}"}
    )
    assert resp.status_code == 403


def test_admin_contact_messages_list_and_filter(setup_contact_test_users):
    """Test admin list, filters, and KPI counts."""
    users = setup_contact_test_users
    headers = {"Authorization": f"Bearer {users['admin_token']}"}

    resp = client.get("/api/v1/admin/contact-messages", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "messages" in data
    assert "counts" in data
    assert "new" in data["counts"]
    assert "total" in data["counts"]


def test_admin_reply_to_contact_message(setup_contact_test_users):
    """Test admin composing and sending a reply to a contact inquiry."""
    users = setup_contact_test_users
    headers = {"Authorization": f"Bearer {users['admin_token']}"}

    # First insert a test message
    db = SessionLocal()
    try:
        msg = ContactMessage(
            name="Alice Smith",
            email="alice@example.com",
            subject="Question about API integration",
            message="Do you provide a Python SDK for batch processing?",
            status=ContactStatus.NEW
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        msg_id = msg.id
    finally:
        db.close()

    with patch("app.api.admin_router.send_contact_reply_email") as mock_reply:
        mock_reply.return_value = (True, "Message delivered")

        reply_resp = client.post(
            f"/api/v1/admin/contact-messages/{msg_id}/reply",
            headers=headers,
            json={
                "subject": "Re: Question about API integration",
                "replyMessage": "Hello Alice, yes! We offer full async batch endpoints and code snippets in our docs."
            }
        )
        assert reply_resp.status_code == 200
        reply_data = reply_resp.json()
        assert reply_data["contactMessage"]["status"] == "replied"
        assert reply_data["contactMessage"]["repliedBy"] == "contact_admin@example.com"

        # Verify DB updated
        db = SessionLocal()
        try:
            updated_msg = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
            assert updated_msg.status == ContactStatus.REPLIED
            assert updated_msg.reply_message == "Hello Alice, yes! We offer full async batch endpoints and code snippets in our docs."

            # Verify AuditLog created
            audit = db.query(AuditLog).filter(
                AuditLog.action == "REPLY_CONTACT_MESSAGE",
                AuditLog.user_id == users["admin"].id
            ).order_by(AuditLog.created_at.desc()).first()
            assert audit is not None
            assert msg_id in audit.details
        finally:
            db.close()


def test_admin_update_contact_message_status_and_notes(setup_contact_test_users):
    """Test admin updating status and internal notes on an inquiry."""
    users = setup_contact_test_users
    headers = {"Authorization": f"Bearer {users['admin_token']}"}

    db = SessionLocal()
    try:
        msg = ContactMessage(
            name="Bob Brown",
            email="bob@example.com",
            subject="Bug report",
            message="PDF rotated 90 degrees was not auto-oriented.",
            status=ContactStatus.NEW
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        msg_id = msg.id
    finally:
        db.close()

    patch_resp = client.patch(
        f"/api/v1/admin/contact-messages/{msg_id}",
        headers=headers,
        json={
            "status": "in_progress",
            "adminNotes": "Forwarded sample image to the OCR CV engineering team for inspection."
        }
    )
    assert patch_resp.status_code == 200
    data = patch_resp.json()
    assert data["contactMessage"]["status"] == "in_progress"
    assert "Forwarded sample image" in data["contactMessage"]["adminNotes"]

    # Verify DB
    db = SessionLocal()
    try:
        updated = db.query(ContactMessage).filter(ContactMessage.id == msg_id).first()
        assert updated.status == ContactStatus.IN_PROGRESS
        assert updated.admin_notes == "Forwarded sample image to the OCR CV engineering team for inspection."

        # Verify Audit Log
        audit = db.query(AuditLog).filter(
            AuditLog.action == "UPDATE_CONTACT_MESSAGE",
            AuditLog.user_id == users["admin"].id
        ).order_by(AuditLog.created_at.desc()).first()
        assert audit is not None
        assert msg_id in audit.details
    finally:
        db.close()
