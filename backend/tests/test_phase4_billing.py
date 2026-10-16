import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import datetime
import stripe

from app.main import app
from app.db.database import Base, get_db
from app.db.models import User, PlanTier, ProcessedWebhookEvent, DailyUsage, OCRJob
from app.core.config import settings
from app.core.security import hash_password, create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_phase4.db"
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


def create_test_user(email="pro_user@example.com", is_verified=True, plan_tier=PlanTier.FREE, stripe_customer_id=None, stripe_sub_id=None, is_admin=False):
    db = TestingSessionLocal()
    user = User(
        email=email.lower(),
        hashed_password=hash_password("Password123!"),
        is_verified=is_verified,
        is_admin=is_admin,
        plan_tier=plan_tier,
        stripe_customer_id=stripe_customer_id,
        stripe_subscription_id=stripe_sub_id,
        subscription_status="active" if plan_tier == PlanTier.PRO else None
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.id, "email": user.email})
    db.close()
    return user, token


def test_unauthenticated_checkout_session_rejected():
    """Unauthenticated access to checkout session creation must be strictly rejected with 401."""
    response = client.post("/api/v1/billing/create-checkout-session")
    assert response.status_code == 401


@patch("stripe.checkout.Session.create")
def test_create_checkout_session_success(mock_session_create):
    """Authenticated user creates checkout session; user ID pulled from authenticated token."""
    user, token = create_test_user()
    mock_session = MagicMock()
    mock_session.id = "cs_test_mocked_session_123"
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_mocked_session_123"
    mock_session_create.return_value = mock_session

    response = client.post(
        "/api/v1/billing/create-checkout-session",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["checkoutUrl"] == "https://checkout.stripe.com/pay/cs_test_mocked_session_123"
    assert data["sessionId"] == "cs_test_mocked_session_123"
    assert data["alreadySubscribed"] is False

    # Verify user ID was passed in client_reference_id & metadata
    mock_session_create.assert_called_once()
    call_kwargs = mock_session_create.call_args.kwargs
    assert call_kwargs["client_reference_id"] == user.id
    assert call_kwargs["metadata"]["user_id"] == user.id


@patch("stripe.checkout.Session.create")
def test_create_checkout_session_already_subscribed(mock_session_create):
    """Active Pro subscribers should be notified without creating redundant checkout session."""
    user, token = create_test_user(plan_tier=PlanTier.PRO, stripe_customer_id="cus_existing_123")
    
    response = client.post(
        "/api/v1/billing/create-checkout-session",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["alreadySubscribed"] is True
    assert data["checkoutUrl"] is None
    mock_session_create.assert_not_called()


def test_create_portal_session_without_customer_id():
    """Users without Stripe customer history cannot open portal session (returns 400)."""
    user, token = create_test_user(stripe_customer_id=None)

    response = client.post(
        "/api/v1/billing/create-portal-session",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 400
    assert "No billing history" in response.json()["detail"]


@patch("stripe.billing_portal.Session.create")
def test_create_portal_session_success(mock_portal_create):
    """Subscribers with customer ID receive valid Customer Portal redirect URL."""
    user, token = create_test_user(stripe_customer_id="cus_existing_pro_456")
    mock_portal = MagicMock()
    mock_portal.url = "https://billing.stripe.com/p/session/test_portal_456"
    mock_portal_create.return_value = mock_portal

    response = client.post(
        "/api/v1/billing/create-portal-session",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["portalUrl"] == "https://billing.stripe.com/p/session/test_portal_456"
    mock_portal_create.assert_called_once_with(
        customer="cus_existing_pro_456",
        return_url=f"{settings.FRONTEND_URL}/dashboard"
    )


def test_webhook_missing_signature():
    """Webhook requests missing Stripe-Signature header return 400 Bad Request."""
    response = client.post("/api/v1/stripe/webhook", content=b"{}")
    assert response.status_code == 400
    assert "Missing stripe-signature" in response.json()["detail"]


@patch("stripe.Webhook.construct_event")
def test_webhook_invalid_signature_rejected(mock_construct_event):
    """Webhook requests with forged or invalid signatures return 400 Bad Request."""
    mock_construct_event.side_effect = stripe.error.SignatureVerificationError("Sig mismatch", "sig_header")

    response = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "invalid_sig"},
        content=b'{"id": "evt_test"}'
    )
    assert response.status_code == 400
    assert "Invalid webhook signature" in response.json()["detail"]


@patch("stripe.Webhook.construct_event")
def test_webhook_checkout_completed_upgrades_user_to_pro(mock_construct_event):
    """checkout.session.completed upgrades user to PlanTier.PRO and records customer & subscription IDs."""
    user, _ = create_test_user(plan_tier=PlanTier.FREE)
    assert user.plan_tier == PlanTier.FREE

    mock_event = {
        "id": "evt_checkout_success_001",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user.id,
                "customer": "cus_new_stripe_id_789",
                "subscription": "sub_active_stripe_999",
                "metadata": {"user_id": user.id}
            }
        }
    }
    mock_construct_event.return_value = mock_event

    response = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(mock_event).encode("utf-8")
    )

    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify user state in database
    db = TestingSessionLocal()
    updated_user = db.query(User).filter(User.id == user.id).first()
    assert updated_user.plan_tier == PlanTier.PRO
    assert updated_user.stripe_customer_id == "cus_new_stripe_id_789"
    assert updated_user.stripe_subscription_id == "sub_active_stripe_999"
    assert updated_user.subscription_status == "active"
    db.close()


@patch("stripe.Webhook.construct_event")
def test_webhook_idempotency_duplicate_event_handling(mock_construct_event):
    """Duplicate webhook events are processed exactly once and safely ignored on retransmission."""
    user, _ = create_test_user(plan_tier=PlanTier.FREE)

    mock_event = {
        "id": "evt_idempotent_test_002",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": user.id,
                "customer": "cus_idemp_111",
                "subscription": "sub_idemp_222",
                "metadata": {"user_id": user.id}
            }
        }
    }
    mock_construct_event.return_value = mock_event

    # First delivery
    res1 = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(mock_event).encode("utf-8")
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "success"

    # Second delivery (Duplicate event ID)
    res2 = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(mock_event).encode("utf-8")
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "already_processed"
    assert res2.json()["eventId"] == "evt_idempotent_test_002"

    # Confirm only one entry recorded in processed_webhook_events
    db = TestingSessionLocal()
    events = db.query(ProcessedWebhookEvent).filter(ProcessedWebhookEvent.event_id == "evt_idempotent_test_002").all()
    assert len(events) == 1
    db.close()


@patch("stripe.Webhook.construct_event")
def test_webhook_subscription_lifecycle_updates_and_deletion(mock_construct_event):
    """Tests subscription update (active) and subscription deletion (reversion to Free)."""
    user, _ = create_test_user(
        plan_tier=PlanTier.PRO,
        stripe_customer_id="cus_sub_cycle_333",
        stripe_sub_id="sub_cycle_444"
    )

    # 1. customer.subscription.updated (e.g. past_due)
    update_event = {
        "id": "evt_sub_updated_003",
        "type": "customer.subscription.updated",
        "data": {
            "object": {
                "id": "sub_cycle_444",
                "customer": "cus_sub_cycle_333",
                "status": "past_due",
                "current_period_end": 1798765432
            }
        }
    }
    mock_construct_event.return_value = update_event

    res_upd = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(update_event).encode("utf-8")
    )
    assert res_upd.status_code == 200

    db = TestingSessionLocal()
    u = db.query(User).filter(User.id == user.id).first()
    assert u.subscription_status == "past_due"
    assert u.plan_tier == PlanTier.FREE
    db.close()

    # 2. customer.subscription.deleted (downgrade to Free)
    del_event = {
        "id": "evt_sub_deleted_004",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_cycle_444",
                "customer": "cus_sub_cycle_333",
                "status": "canceled"
            }
        }
    }
    mock_construct_event.return_value = del_event

    res_del = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(del_event).encode("utf-8")
    )
    assert res_del.status_code == 200

    db = TestingSessionLocal()
    u = db.query(User).filter(User.id == user.id).first()
    assert u.plan_tier == PlanTier.FREE
    assert u.subscription_status == "canceled"
    assert u.stripe_subscription_id is None
    db.close()


@patch("stripe.Webhook.construct_event")
def test_webhook_invoice_paid_and_payment_failed(mock_construct_event):
    """invoice.paid keeps Pro active, invoice.payment_failed marks past_due."""
    user, _ = create_test_user(
        plan_tier=PlanTier.FREE,
        stripe_customer_id="cus_invoice_555"
    )

    # 1. invoice.paid -> upgrades/keeps Pro
    paid_event = {
        "id": "evt_invoice_paid_005",
        "type": "invoice.paid",
        "data": {
            "object": {
                "customer": "cus_invoice_555",
                "subscription": "sub_inv_666"
            }
        }
    }
    mock_construct_event.return_value = paid_event
    res_paid = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(paid_event).encode("utf-8")
    )
    assert res_paid.status_code == 200

    db = TestingSessionLocal()
    u = db.query(User).filter(User.id == user.id).first()
    assert u.plan_tier == PlanTier.PRO
    assert u.subscription_status == "active"
    db.close()

    # 2. invoice.payment_failed -> past_due
    fail_event = {
        "id": "evt_invoice_failed_006",
        "type": "invoice.payment_failed",
        "data": {
            "object": {
                "customer": "cus_invoice_555"
            }
        }
    }
    mock_construct_event.return_value = fail_event
    res_fail = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_test_sig"},
        content=json.dumps(fail_event).encode("utf-8")
    )
    assert res_fail.status_code == 200

    db = TestingSessionLocal()
    u = db.query(User).filter(User.id == user.id).first()
    assert u.subscription_status == "past_due"
    db.close()


@patch("app.api.router.process_ocr_request", return_value=("Pro OCR text", 1))
def test_pro_quota_and_limit_enforcement(mock_ocr):
    """Verifies Pro users can process up to 100 conversions and larger files, then throttled at 100."""
    user, token = create_test_user(plan_tier=PlanTier.PRO)

    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + (b"\x00" * 50)
    files = {"file": ("pro_doc.png", png_bytes, "image/png")}
    data = {"language": "eng", "psm": "3"}

    # Simulate 99 conversions already used today
    db = TestingSessionLocal()
    usage = DailyUsage(
        user_id=user.id,
        usage_date=datetime.date.today(),
        conversion_count=99,
        pages_processed=99
    )
    db.add(usage)
    db.commit()
    db.close()

    # Conversion #100 should succeed
    res100 = client.post(
        "/api/v1/ocr",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    assert res100.status_code == 200

    # Conversion #101 should be rejected with 429
    res101 = client.post(
        "/api/v1/ocr",
        headers={"Authorization": f"Bearer {token}"},
        files=files,
        data=data
    )
    assert res101.status_code == 429
    assert "Daily Pro quota of 100 conversions reached" in res101.json()["detail"]


def test_admin_settings_secret_masking_and_billing_policies():
    """Verifies that admin settings endpoint masks raw secrets and returns billing policies."""
    admin_user, admin_token = create_test_user(email="admin_billing@example.com", is_admin=True)

    res = client.get(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    settings_data = data["settings"]

    # Raw secrets must never be exposed; must be masked with bullet characters
    assert "••••" in settings_data["STRIPE_SECRET_KEY"]
    assert settings_data["STRIPE_SECRET_KEY"] != settings.STRIPE_SECRET_KEY
    assert "••••" in settings_data["STRIPE_WEBHOOK_SECRET"]
    assert settings_data["STRIPE_WEBHOOK_SECRET"] != settings.STRIPE_WEBHOOK_SECRET

    # Billing policies must be present
    assert "STRIPE_DISPLAY_PRICE" in settings_data
    assert "STRIPE_CURRENCY" in settings_data
    assert "STRIPE_ALLOW_PROMO_CODES" in settings_data
    assert "STRIPE_GRACE_PERIOD_DAYS" in settings_data
    assert data["meta"]["stripe_mode"] in ("test", "live")


def test_admin_settings_preserve_masked_secret_on_save():
    """Verifies that submitting a masked secret placeholder does not overwrite the actual secret."""
    admin_user, admin_token = create_test_user(email="admin_save@example.com", is_admin=True)

    # Submitting a masked string containing '••••' must be safely ignored
    res = client.post(
        "/api/v1/admin/settings",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"key": "STRIPE_SECRET_KEY", "value": "sk_test_••••••••ABCD"}
    )
    assert res.status_code == 200
    assert "retained without changes" in res.json()["message"]


@patch("stripe.Price.retrieve")
@patch("stripe.Balance.retrieve")
def test_admin_billing_test_connection_diagnostics(mock_balance, mock_price):
    """Verifies that the live Stripe diagnostic probe tests connection and validates price without leaking keys."""
    admin_user, admin_token = create_test_user(email="admin_diag@example.com", is_admin=True)

    # 1. When key is placeholder
    res_placeholder = client.post(
        "/api/v1/admin/billing/test-connection",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_placeholder.status_code == 200
    assert res_placeholder.json()["connected"] is False
    assert "placeholder" in res_placeholder.json()["error"]

    # 2. When key is configured in SystemSetting DB
    from app.db.models import SystemSetting
    db = TestingSessionLocal()
    db.add(SystemSetting(key="STRIPE_SECRET_KEY", value="sk_test_mock_valid_key_12345"))
    db.add(SystemSetting(key="STRIPE_PRO_MONTHLY_PRICE_ID", value="price_valid_12345"))
    db.commit()
    db.close()

    mock_balance.return_value = {"livemode": False}
    mock_price.return_value = {
        "active": True,
        "unit_amount": 1900,
        "currency": "usd",
        "recurring": {"interval": "month"}
    }

    res = client.post(
        "/api/v1/admin/billing/test-connection",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["connected"] is True
    assert data["mode"] == "test"
    assert data["priceValid"] is True
    assert "$19.00 USD / month" in data["priceDisplay"]


@patch("stripe.Webhook.construct_event")
def test_webhook_no_accidental_null_matching(mock_construct_event):
    """
    Security Regression: A one-off invoice with subscription=None and unknown customer
    must NOT match Free users who have stripe_subscription_id=NULL.
    """
    user_free, _ = create_test_user(email="unrelated_free@example.com", plan_tier=PlanTier.FREE)

    mock_event = {
        "id": "evt_one_off_invoice_test_101",
        "type": "invoice.paid",
        "data": {
            "object": {
                "customer": "cus_random_unknown_999",
                "subscription": None
            }
        }
    }
    mock_construct_event.return_value = mock_event

    res = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_sig"},
        content=json.dumps(mock_event).encode("utf-8")
    )
    assert res.status_code == 200

    # Ensure the unrelated free user was NOT upgraded to Pro
    db = TestingSessionLocal()
    check_user = db.query(User).filter(User.id == user_free.id).first()
    assert check_user.plan_tier == PlanTier.FREE
    assert check_user.stripe_customer_id is None
    db.close()


@patch("stripe.Subscription.modify")
def test_cancel_pro_invokes_stripe_subscription_modify(mock_sub_modify):
    """
    Security Regression: Cancelling Pro subscription modifies Stripe subscription
    with cancel_at_period_end=True to prevent ghost charges.
    """
    user_pro, token = create_test_user(
        email="pro_cancel_sync@example.com",
        plan_tier=PlanTier.PRO,
        stripe_sub_id="sub_active_to_cancel_888"
    )

    mock_sub_modify.return_value = MagicMock()

    res = client.post(
        "/api/v1/auth/cancel-pro",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert "cancel at the end of the current billing period" in res.json()["message"]

    mock_sub_modify.assert_called_once()
    args, kwargs = mock_sub_modify.call_args
    assert args[0] == "sub_active_to_cancel_888"
    assert kwargs["cancel_at_period_end"] is True


@patch("stripe.Webhook.construct_event")
def test_webhook_out_of_order_stale_event_ignored(mock_construct_event):
    """
    Security Regression: A stale customer.subscription.updated event created in the past
    does not resurrect an already cancelled subscription.
    """
    user_canceled, _ = create_test_user(
        email="canceled_sub@example.com",
        plan_tier=PlanTier.FREE,
        stripe_customer_id="cus_stale_test_123",
        stripe_sub_id="sub_stale_test_123"
    )
    db = TestingSessionLocal()
    u = db.query(User).filter(User.id == user_canceled.id).first()
    u.subscription_status = "canceled"
    u.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.close()

    # Event with creation time 2 hours in the past
    stale_ts = int((datetime.datetime.utcnow() - datetime.timedelta(hours=2)).timestamp())
    mock_event = {
        "id": "evt_stale_sub_update_555",
        "type": "customer.subscription.updated",
        "created": stale_ts,
        "data": {
            "object": {
                "id": "sub_stale_test_123",
                "customer": "cus_stale_test_123",
                "status": "active"
            }
        }
    }
    mock_construct_event.return_value = mock_event

    res = client.post(
        "/api/v1/stripe/webhook",
        headers={"stripe-signature": "valid_sig"},
        content=json.dumps(mock_event).encode("utf-8")
    )
    assert res.status_code == 200

    # User must remain on Free plan and canceled status
    db = TestingSessionLocal()
    u_after = db.query(User).filter(User.id == user_canceled.id).first()
    assert u_after.plan_tier == PlanTier.FREE
    assert u_after.subscription_status == "canceled"
    db.close()

