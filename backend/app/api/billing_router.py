import datetime
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import stripe

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User, PlanTier, ProcessedWebhookEvent, AuditLog, SystemSetting
from app.api.quota_middleware import get_current_user

logger = logging.getLogger("scantext.billing")

billing_router = APIRouter(prefix="/billing", tags=["Billing & Subscriptions"])
stripe_router = APIRouter(prefix="/stripe", tags=["Stripe Webhooks"])

stripe.api_key = settings.STRIPE_SECRET_KEY


def get_effective_setting(db: Session, key: str, default: any = None) -> any:
    """Retrieves a configuration value from the system_settings table, falling back to app settings."""
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row and row.value is not None and row.value.strip() != "":
        return row.value
    return default


def is_placeholder_key(key: Optional[str]) -> bool:
    if not key:
        return True
    lower = key.lower()
    return (
        "placeholder" in lower or
        "replace_with" in lower or
        "your_stripe" in lower or
        "••••" in lower or
        len(key) < 15
    )


def find_user_for_webhook(
    db: Session,
    customer_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Optional[User]:
    """
    Safely queries a user without triggering accidental 'IS NULL' SQL matches.
    Guarantees that Column == None is never evaluated in OR conditions.
    """
    if user_id and str(user_id).strip():
        user = db.query(User).filter(User.id == str(user_id).strip()).first()
        if user:
            return user

    if subscription_id and str(subscription_id).strip():
        user = db.query(User).filter(User.stripe_subscription_id == str(subscription_id).strip()).first()
        if user:
            return user

    if customer_id and str(customer_id).strip():
        user = db.query(User).filter(User.stripe_customer_id == str(customer_id).strip()).first()
        if user:
            return user

    return None


def get_effective_frontend_url(request: Request, db: Session) -> str:
    """Dynamically determines the user's origin host (e.g. https://scantext.dev) for Stripe redirects."""
    # 1. Prefer database SystemSetting if explicitly set
    db_setting = get_effective_setting(db, "FRONTEND_URL", None)
    if db_setting and not str(db_setting).startswith("http://localhost") and not str(db_setting).startswith("http://127.0.0.1"):
        return str(db_setting).rstrip("/")

    # 2. Prefer browser Origin header if accessing from a real domain or IP
    origin = request.headers.get("origin")
    if origin and not origin.startswith("http://localhost") and not origin.startswith("http://127.0.0.1"):
        return origin.rstrip("/")

    # 3. Check proxy/tunnel headers (X-Forwarded-Host or Host)
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    proto = request.headers.get("x-forwarded-proto", "https")
    if host and "localhost" not in host and "127.0.0.1" not in host:
        return f"{proto}://{host}".rstrip("/")

    # 4. Fallback to origin or settings.FRONTEND_URL
    return origin.rstrip("/") if origin else settings.FRONTEND_URL.rstrip("/")


@billing_router.post("/create-checkout-session")
def create_checkout_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe Checkout Session for recurring monthly OCR Pro subscription.
    Strictly uses authenticated server user identity (never user-editable input).
    """
    # 1. If user is already an active Pro subscriber, inform them immediately
    if current_user.plan_tier == PlanTier.PRO and current_user.subscription_status == "active":
        return {
            "message": "You are already an active Pro subscriber.",
            "alreadySubscribed": True,
            "checkoutUrl": None
        }

    stripe_key = get_effective_setting(db, "STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
    price_id = get_effective_setting(db, "STRIPE_PRO_MONTHLY_PRICE_ID", settings.STRIPE_PRO_MONTHLY_PRICE_ID)
    allow_promo = str(get_effective_setting(db, "STRIPE_ALLOW_PROMO_CODES", str(settings.STRIPE_ALLOW_PROMO_CODES))).lower() == "true"

    try:
        stripe.api_key = stripe_key
        base_url = get_effective_frontend_url(request, db)
        checkout_params = {
            "mode": "subscription",
            "line_items": [{
                "price": price_id,
                "quantity": 1,
            }],
            "client_reference_id": current_user.id,
            "metadata": {
                "user_id": current_user.id,
                "user_email": current_user.email,
            },
            "subscription_data": {
                "metadata": {
                    "user_id": current_user.id,
                    "user_email": current_user.email,
                }
            },
            "success_url": f"{base_url}/dashboard?billing=success&session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{base_url}/pricing?billing=canceled",
        }

        if allow_promo:
            checkout_params["allow_promotion_codes"] = True

        # Reuse existing Stripe customer if available; otherwise supply customer_email
        if current_user.stripe_customer_id:
            checkout_params["customer"] = current_user.stripe_customer_id
        else:
            checkout_params["customer_email"] = current_user.email

        session = stripe.checkout.Session.create(**checkout_params)

        return {
            "checkoutUrl": session.url,
            "sessionId": session.id,
            "alreadySubscribed": False
        }
    except stripe.error.AuthenticationError as ae:
        logger.error(f"Stripe authentication failed: {ae}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or placeholder Stripe API Key provided. Please configure a valid Stripe Secret Key (sk_test_...) in the Admin Console (System Settings) or infrastructure/.env."
        )
    except stripe.error.InvalidRequestError as ire:
        logger.error(f"Stripe invalid request: {ire}")
        if "No such price" in str(ire):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Price ID '{price_id}' does not exist in your Stripe account. Please create a recurring monthly product in your Stripe Dashboard and enter its real price ID (starts with price_...) in the Admin Console System Settings."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe request error: {str(ire)}"
        )
    except Exception as e:
        logger.error(f"Failed to create Stripe checkout session: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not initiate checkout session. Please try again or contact support."
        )


@billing_router.post("/create-portal-session")
def create_portal_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a Stripe Customer Portal session allowing subscribers to manage or cancel subscriptions.
    """
    if not current_user.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing history or active Stripe customer found for this account."
        )

    stripe_key = get_effective_setting(db, "STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
    portal_return_path = get_effective_setting(db, "STRIPE_PORTAL_RETURN_URL", settings.STRIPE_PORTAL_RETURN_URL)

    try:
        stripe.api_key = stripe_key
        base_url = get_effective_frontend_url(request, db)
        portal_return_url = f"{base_url}{portal_return_path}"
        portal_session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_customer_id,
            return_url=portal_return_url,
        )
        return {"portalUrl": portal_session.url}
    except stripe.error.AuthenticationError as ae:
        logger.error(f"Stripe portal authentication failed: {ae}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or placeholder Stripe API Key provided. Please configure a valid Stripe Secret Key in Admin Settings."
        )
    except Exception as e:
        logger.error(f"Failed to create customer portal session: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not access customer billing portal. Please contact support."
        )


@stripe_router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Stripe Webhook handler with cryptographic signature verification, safe user lookup,
    out-of-order delivery protection, and idempotent event handling.
    Grants Pro access ONLY upon verified Stripe events (never upon landing on success redirect).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header."
        )

    webhook_secret = get_effective_setting(db, "STRIPE_WEBHOOK_SECRET", settings.STRIPE_WEBHOOK_SECRET)

    try:
        raw_event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        event = raw_event.to_dict() if hasattr(raw_event, "to_dict") else raw_event
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload.")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Stripe signature verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature.")
    except Exception as e:
        logger.error(f"Webhook processing error: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Webhook payload processing failed.")

    event_id = event.get("id")
    event_type = event.get("type")

    if not event_id or not event_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed event data.")

    # 1. Idempotency Check: Return 200 immediately if event already processed
    existing_event = db.query(ProcessedWebhookEvent).filter(
        ProcessedWebhookEvent.event_id == event_id
    ).first()

    if existing_event:
        logger.info(f"Stripe event {event_id} already processed. Skipping.")
        return {"status": "already_processed", "eventId": event_id}

    # Extract event timestamp to guard against out-of-order event delivery
    event_created_ts = event.get("created")
    event_dt = datetime.datetime.fromtimestamp(event_created_ts) if event_created_ts else None

    # 2. Process Webhook Event Types
    try:
        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session.get("client_reference_id") or (session.get("metadata") or {}).get("user_id")
            customer_id = session.get("customer")
            subscription_id = session.get("subscription")

            user = find_user_for_webhook(db, customer_id=customer_id, subscription_id=subscription_id, user_id=user_id)
            if not user and session.get("customer_email"):
                candidate = db.query(User).filter(User.email == session.get("customer_email").lower()).first()
                # Safe matching: candidate must not be bound to a different customer
                if candidate and (not candidate.stripe_customer_id or candidate.stripe_customer_id == customer_id):
                    user = candidate

            if user:
                user.stripe_customer_id = customer_id
                user.stripe_subscription_id = subscription_id
                user.plan_tier = PlanTier.PRO
                user.subscription_status = "active"

                # Log billing event
                audit = AuditLog(
                    user_id=user.id,
                    action="STRIPE_CHECKOUT_COMPLETED",
                    details=f"Customer {customer_id} subscribed via Checkout. Subscription: {subscription_id}"
                )
                db.add(audit)
                db.commit()
                logger.info(f"User {user.email} successfully upgraded to Pro via Checkout Session.")

        elif event_type in ["customer.subscription.created", "customer.subscription.updated"]:
            subscription = event["data"]["object"]
            subscription_id = subscription.get("id")
            customer_id = subscription.get("customer")
            status_val = subscription.get("status")
            period_end_ts = subscription.get("current_period_end")
            metadata_uid = (subscription.get("metadata") or {}).get("user_id")

            user = find_user_for_webhook(db, customer_id=customer_id, subscription_id=subscription_id, user_id=metadata_uid)

            if user:
                # Out-of-order protection: Do not revive an already canceled subscription from a stale created event
                if user.subscription_status == "canceled" and event_dt and user.updated_at and event_dt < user.updated_at:
                    logger.warning(f"Ignored stale subscription update event {event_id} for user {user.email}")
                else:
                    user.stripe_customer_id = customer_id
                    user.stripe_subscription_id = subscription_id
                    user.subscription_status = status_val

                    if period_end_ts:
                        user.current_period_end = datetime.datetime.fromtimestamp(period_end_ts)

                    if status_val in ["active", "trialing"]:
                        user.plan_tier = PlanTier.PRO
                    elif status_val in ["canceled", "unpaid", "incomplete_expired", "past_due"]:
                        user.plan_tier = PlanTier.FREE

                    audit = AuditLog(
                        user_id=user.id,
                        action=f"STRIPE_SUBSCRIPTION_{status_val.upper()}",
                        details=f"Subscription {subscription_id} status updated to {status_val}"
                    )
                    db.add(audit)
                    db.commit()
                    logger.info(f"User {user.email} subscription status updated to {status_val}.")

        elif event_type == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            subscription_id = subscription.get("id")
            customer_id = subscription.get("customer")
            metadata_uid = (subscription.get("metadata") or {}).get("user_id")

            user = find_user_for_webhook(db, customer_id=customer_id, subscription_id=subscription_id, user_id=metadata_uid)

            if user:
                user.plan_tier = PlanTier.FREE
                user.subscription_status = "canceled"
                user.stripe_subscription_id = None

                audit = AuditLog(
                    user_id=user.id,
                    action="STRIPE_SUBSCRIPTION_DELETED",
                    details=f"Subscription {subscription_id} cancelled/deleted. Reverted to Free plan."
                )
                db.add(audit)
                db.commit()
                logger.info(f"User {user.email} reverted to Free plan after subscription deletion.")

        elif event_type == "invoice.paid":
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")
            subscription_id = invoice.get("subscription")

            user = find_user_for_webhook(db, customer_id=customer_id, subscription_id=subscription_id)

            if user:
                user.plan_tier = PlanTier.PRO
                user.subscription_status = "active"
                db.commit()
                logger.info(f"Invoice paid for user {user.email}. Pro tier active.")

        elif event_type == "invoice.payment_failed":
            invoice = event["data"]["object"]
            customer_id = invoice.get("customer")

            user = find_user_for_webhook(db, customer_id=customer_id)
            if user:
                user.subscription_status = "past_due"
                audit = AuditLog(
                    user_id=user.id,
                    action="STRIPE_PAYMENT_FAILED",
                    details=f"Invoice payment failed for customer {customer_id}"
                )
                db.add(audit)
                db.commit()
                logger.warning(f"Payment failed for user {user.email}. Status set to past_due.")

        # 3. Record event in idempotency table
        processed_record = ProcessedWebhookEvent(
            event_id=event_id,
            event_type=event_type,
            processed_at=datetime.datetime.utcnow()
        )
        db.add(processed_record)
        db.commit()

        return {"status": "success", "received": True, "eventId": event_id}

    except IntegrityError:
        # Race condition defense: another concurrent worker already inserted this event_id
        db.rollback()
        logger.info(f"Stripe event {event_id} already committed by a concurrent worker. Returning success.")
        return {"status": "already_processed", "eventId": event_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error handling webhook event {event_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook handling encountered an internal error."
        )
