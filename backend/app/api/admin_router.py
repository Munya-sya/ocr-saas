import os
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import User, DailyUsage, OCRJob, PlanTier, SystemSetting, AuditLog, JobStatus, ContactMessage, ContactStatus
from app.services.email_service import send_contact_reply_email
from app.api.quota_middleware import require_admin
from app.core.config import settings
import stripe

def mask_secret(secret: Optional[str], prefix_len: int = 7, suffix_len: int = 4) -> str:
    """Masks sensitive credentials for zero plaintext browser leakage."""
    if not secret:
        return ""
    if len(secret) <= prefix_len + suffix_len:
        return "••••••••"
    return f"{secret[:prefix_len]}{'•' * 8}{secret[-suffix_len:]}"

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

class UpdateUserSchema(BaseModel):
    planTier: Optional[str] = None
    isAdmin: Optional[bool] = None
    isBanned: Optional[bool] = None
    isVerified: Optional[bool] = None

class SettingItemSchema(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

def log_admin_action(db: Session, admin_user: User, action: str, details: str, ip_address: Optional[str] = None):
    """Helper to record administrative actions into AuditLog."""
    log_entry = AuditLog(
        user_id=admin_user.id,
        ip_address=ip_address or "127.0.0.1",
        action=action,
        details=details
    )
    db.add(log_entry)
    db.commit()

@router.get("/verify_admin")
def verify_admin_access(
    admin: User = Depends(require_admin)
):
    """Internal auth probe endpoint for Nginx auth_request. Returns 200 OK if admin, 403 Forbidden if not."""
    return {"status": "authorized", "admin": admin.email}

@router.get("/stats")
def get_admin_dashboard_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns platform-wide KPIs for the Admin Portal."""
    today = datetime.date.today()
    total_users = db.query(User).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    banned_users = db.query(User).filter(User.is_banned == True).count()
    pro_users = db.query(User).filter(User.plan_tier == PlanTier.PRO).count()

    total_jobs = db.query(OCRJob).count()
    today_jobs = db.query(DailyUsage).filter(DailyUsage.usage_date == today).all()
    today_conversions = sum(u.conversion_count for u in today_jobs)

    failed_jobs = db.query(OCRJob).filter(OCRJob.status == JobStatus.FAILED).count()

    return {
        "stats": {
            "totalUsers": total_users,
            "verifiedUsers": verified_users,
            "bannedUsers": banned_users,
            "proUsers": pro_users,
            "freeUsers": total_users - pro_users,
            "totalJobsProcessed": total_jobs,
            "todayConversions": today_conversions,
            "failedJobs": failed_jobs,
            "serverTime": datetime.datetime.utcnow().isoformat(),
        }
    }

@router.get("/users")
def list_all_users(
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists registered users with optional email search filter."""
    query = db.query(User)
    if search:
        query = query.filter(User.email.ilike(f"%{search}%"))

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "users": [u.to_dict() for u in users]
    }

@router.patch("/users/{user_id}")
def update_user_status(
    user_id: str,
    payload: UpdateUserSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Modifies user plan tier, admin role, or suspension/ban status."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    changes = []
    if payload.planTier:
        try:
            target_user.plan_tier = PlanTier(payload.planTier.lower())
            changes.append(f"planTier -> {payload.planTier}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid plan tier value.")

    if payload.isAdmin is not None:
        target_user.is_admin = payload.isAdmin
        changes.append(f"isAdmin -> {payload.isAdmin}")

    if payload.isBanned is not None:
        target_user.is_banned = payload.isBanned
        changes.append(f"isBanned -> {payload.isBanned}")

    if payload.isVerified is not None:
        target_user.is_verified = payload.isVerified
        changes.append(f"isVerified -> {payload.isVerified}")

    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_admin_action(
        db, admin, "UPDATE_USER",
        f"Updated user {target_user.email} ({user_id}): {', '.join(changes)}",
        client_ip
    )

    return {
        "message": f"Successfully updated user {target_user.email}.",
        "user": target_user.to_dict()
    }

@router.get("/settings")
def get_system_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetches dynamic system configuration settings (with zero-plaintext secret masking)."""
    db_settings = db.query(SystemSetting).all()
    setting_map = {s.key: s.value for s in db_settings}

    raw_stripe_key = setting_map.get("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
    raw_webhook_secret = setting_map.get("STRIPE_WEBHOOK_SECRET", settings.STRIPE_WEBHOOK_SECRET)
    raw_smtp_pass = setting_map.get("SMTP_PASSWORD", settings.SMTP_PASSWORD)
    raw_google_secret = setting_map.get("GOOGLE_CLIENT_SECRET", getattr(settings, "GOOGLE_CLIENT_SECRET", ""))

    is_test_mode = "test" in (raw_stripe_key or "").lower()
    is_placeholder = raw_stripe_key in ("", "sk_test_placeholder_key")

    return {
        "settings": {
            "SMTP_HOST": setting_map.get("SMTP_HOST", settings.SMTP_HOST),
            "SMTP_PORT": setting_map.get("SMTP_PORT", str(settings.SMTP_PORT)),
            "SMTP_USER": setting_map.get("SMTP_USER", settings.SMTP_USER),
            "SMTP_PASSWORD": mask_secret(raw_smtp_pass, 0, 0) if raw_smtp_pass else "",
            "EMAILS_FROM_EMAIL": setting_map.get("EMAILS_FROM_EMAIL", settings.EMAILS_FROM_EMAIL),
            "ANONYMOUS_DAILY_CONVERSIONS": setting_map.get("ANONYMOUS_DAILY_CONVERSIONS", str(settings.ANONYMOUS_DAILY_CONVERSIONS)),
            "FREE_DAILY_CONVERSIONS": setting_map.get("FREE_DAILY_CONVERSIONS", str(settings.FREE_DAILY_CONVERSIONS)),
            "FREE_MAX_FILE_MB": setting_map.get("FREE_MAX_FILE_MB", str(settings.FREE_MAX_FILE_MB)),
            "FREE_MAX_PDF_PAGES": setting_map.get("FREE_MAX_PDF_PAGES", str(settings.FREE_MAX_PDF_PAGES)),
            "PRO_DAILY_CONVERSIONS": setting_map.get("PRO_DAILY_CONVERSIONS", str(settings.PRO_DAILY_CONVERSIONS)),
            "PRO_MAX_FILE_MB": setting_map.get("PRO_MAX_FILE_MB", str(settings.PRO_MAX_FILE_MB)),
            "PRO_MAX_PDF_PAGES": setting_map.get("PRO_MAX_PDF_PAGES", str(settings.PRO_MAX_PDF_PAGES)),
            "GOOGLE_CLIENT_ID": setting_map.get("GOOGLE_CLIENT_ID", getattr(settings, "GOOGLE_CLIENT_ID", "")),
            "GOOGLE_CLIENT_SECRET": mask_secret(raw_google_secret, 7, 4) if raw_google_secret else "",
            "GOOGLE_REDIRECT_URI": setting_map.get("GOOGLE_REDIRECT_URI", getattr(settings, "GOOGLE_REDIRECT_URI", "http://localhost/api/v1/auth/google/callback")),
            "STRIPE_SECRET_KEY": mask_secret(raw_stripe_key, 7, 4) if raw_stripe_key else "",
            "STRIPE_PUBLISHABLE_KEY": setting_map.get("STRIPE_PUBLISHABLE_KEY", getattr(settings, "STRIPE_PUBLISHABLE_KEY", "")),
            "STRIPE_WEBHOOK_SECRET": mask_secret(raw_webhook_secret, 6, 4) if raw_webhook_secret else "",
            "STRIPE_PRO_MONTHLY_PRICE_ID": setting_map.get("STRIPE_PRO_MONTHLY_PRICE_ID", getattr(settings, "STRIPE_PRO_MONTHLY_PRICE_ID", "")),
            "STRIPE_DISPLAY_PRICE": setting_map.get("STRIPE_DISPLAY_PRICE", getattr(settings, "STRIPE_DISPLAY_PRICE", "19.00")),
            "STRIPE_CURRENCY": setting_map.get("STRIPE_CURRENCY", getattr(settings, "STRIPE_CURRENCY", "USD")),
            "STRIPE_ALLOW_PROMO_CODES": setting_map.get("STRIPE_ALLOW_PROMO_CODES", str(getattr(settings, "STRIPE_ALLOW_PROMO_CODES", True))),
            "STRIPE_GRACE_PERIOD_DAYS": setting_map.get("STRIPE_GRACE_PERIOD_DAYS", str(getattr(settings, "STRIPE_GRACE_PERIOD_DAYS", 3))),
            "STRIPE_PORTAL_ALLOW_CANCEL": setting_map.get("STRIPE_PORTAL_ALLOW_CANCEL", str(getattr(settings, "STRIPE_PORTAL_ALLOW_CANCEL", True))),
            "STRIPE_PORTAL_RETURN_URL": setting_map.get("STRIPE_PORTAL_RETURN_URL", getattr(settings, "STRIPE_PORTAL_RETURN_URL", "/dashboard")),
            "CAPTCHA_ENABLED": setting_map.get("CAPTCHA_ENABLED", str(getattr(settings, "CAPTCHA_ENABLED", False))),
            "CAPTCHA_PROVIDER": setting_map.get("CAPTCHA_PROVIDER", getattr(settings, "CAPTCHA_PROVIDER", "turnstile")),
            "CAPTCHA_SITE_KEY": setting_map.get("CAPTCHA_SITE_KEY", getattr(settings, "CAPTCHA_SITE_KEY", "")),
            "CAPTCHA_SECRET_KEY": mask_secret(setting_map.get("CAPTCHA_SECRET_KEY", getattr(settings, "CAPTCHA_SECRET_KEY", "")), 4, 4),
            "SENTRY_DSN": mask_secret(setting_map.get("SENTRY_DSN", getattr(settings, "SENTRY_DSN", "")), 8, 4),
            "STRUCTURED_LOGGING": setting_map.get("STRUCTURED_LOGGING", str(getattr(settings, "STRUCTURED_LOGGING", False))),
            "ADSENSE_ENABLED": setting_map.get("ADSENSE_ENABLED", str(getattr(settings, "ADSENSE_ENABLED", False))),
            "ADSENSE_CLIENT_ID": setting_map.get("ADSENSE_CLIENT_ID", getattr(settings, "ADSENSE_CLIENT_ID", "")),
            "ADSENSE_SLOT_BELOW_UPLOAD": setting_map.get("ADSENSE_SLOT_BELOW_UPLOAD", getattr(settings, "ADSENSE_SLOT_BELOW_UPLOAD", "")),
            "ADSENSE_SLOT_BELOW_RESULTS": setting_map.get("ADSENSE_SLOT_BELOW_RESULTS", getattr(settings, "ADSENSE_SLOT_BELOW_RESULTS", "")),
        },
        "meta": {
            "stripe_mode": "test" if is_test_mode else "live",
            "stripe_configured": not is_placeholder,
        }
    }

@router.post("/settings")
def update_system_setting(
    payload: SettingItemSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Upserts dynamic system settings into the database (safely ignores masked values)."""
    # If the admin submits a masked placeholder (contains '••••'), preserve the existing secret
    if "••••" in payload.value:
        return {"message": f"Masked secret for '{payload.key}' retained without changes."}

    item = db.query(SystemSetting).filter(SystemSetting.key == payload.key).first()
    if not item:
        item = SystemSetting(
            key=payload.key,
            value=payload.value,
            description=payload.description
        )
        db.add(item)
    else:
        item.value = payload.value
        if payload.description:
            item.description = payload.description

    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    masked_log_val = mask_secret(payload.value) if ("KEY" in payload.key or "SECRET" in payload.key or "PASSWORD" in payload.key) else payload.value
    log_admin_action(
        db, admin, "UPDATE_SETTING",
        f"Updated system setting '{payload.key}' to '{masked_log_val}'",
        client_ip
    )

    return {"message": f"System setting '{payload.key}' updated successfully."}

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

@router.post("/billing/test-connection")
def test_stripe_connection(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Tests live Stripe API connectivity and verifies the Pro Price ID.
    Does NOT expose raw secret keys.
    """
    db_settings = db.query(SystemSetting).all()
    setting_map = {s.key: s.value for s in db_settings}

    stripe_key = setting_map.get("STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
    price_id = setting_map.get("STRIPE_PRO_MONTHLY_PRICE_ID", settings.STRIPE_PRO_MONTHLY_PRICE_ID)

    if is_placeholder_key(stripe_key):
        return {
            "connected": False,
            "mode": "test",
            "priceValid": False,
            "error": "Stripe secret key is currently set to placeholder. Configure a real test key (sk_test_...) to connect."
        }

    try:
        balance = stripe.Balance.retrieve(api_key=stripe_key)
        balance_dict = balance.to_dict() if hasattr(balance, "to_dict") else balance
        mode = "test" if balance_dict.get("livemode") is False else "live"

        price_valid = False
        price_display = None
        currency = None
        if price_id and not is_placeholder_key(price_id):
            try:
                price = stripe.Price.retrieve(price_id, api_key=stripe_key)
                price_dict = price.to_dict() if hasattr(price, "to_dict") else price
                price_valid = price_dict.get("active", False)
                unit_amount = (price_dict.get("unit_amount") or 0) / 100
                currency = (price_dict.get("currency") or "usd").upper()
                recurring = price_dict.get("recurring") or {}
                interval = recurring.get("interval", "month") if isinstance(recurring, dict) else getattr(recurring, "interval", "month")
                price_display = f"${unit_amount:.2f} {currency} / {interval}"
            except Exception as pe:
                return {
                    "connected": True,
                    "mode": mode,
                    "priceValid": False,
                    "error": f"Connected to Stripe ({mode.upper()} mode), but Price ID '{price_id}' was not found: {str(pe)}"
                }
        elif price_id:
            price_display = "(Placeholder Price ID)"

        return {
            "connected": True,
            "mode": mode,
            "priceValid": price_valid,
            "priceDisplay": price_display,
            "currency": currency or "USD",
            "message": f"Successfully authenticated with Stripe API in {mode.upper()} mode."
        }
    except stripe.error.AuthenticationError:
        return {
            "connected": False,
            "mode": "unknown",
            "priceValid": False,
            "error": "Authentication failed: Invalid Stripe API key."
        }
    except Exception as e:
        return {
            "connected": False,
            "mode": "unknown",
            "priceValid": False,
            "error": f"Stripe connection error: {str(e)}"
        }

@router.post("/smtp/test-connection")
def test_smtp_connection(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Tests live SMTP mailer connectivity by sending a test diagnostic email to the admin.
    """
    from app.services.email_service import send_smtp_email, get_smtp_settings
    host, port, user, _, from_email = get_smtp_settings()

    test_subject = "ScanText OCR - SMTP Mailer Test"
    test_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #10b981; border-radius: 8px;">
        <h2 style="color: #10b981;">SMTP Configuration Verified!</h2>
        <p>This is a test verification email sent from your ScanText OCR Admin Console.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr><td style="padding: 6px; color: #64748b;">SMTP Server:</td><td style="padding: 6px; font-weight: bold;">{host}:{port}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Sender:</td><td style="padding: 6px; font-weight: bold;">{from_email}</td></tr>
            <tr><td style="padding: 6px; color: #64748b;">Recipient:</td><td style="padding: 6px; font-weight: bold;">{admin.email}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 13px;">If you see this email, your verification and password reset emails are working correctly.</p>
    </div>
    """
    success, msg = send_smtp_email(admin.email, test_subject, test_body)
    return {
        "success": success,
        "recipient": admin.email,
        "host": f"{host}:{port}",
        "message": msg
    }

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetches security & administrative audit logs."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {
        "logs": [l.to_dict() for l in logs]
    }

@router.post("/users/{user_id}/reset-quota")
def reset_user_quota(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Resets today's conversion usage quota for a specific user and records an audit log entry."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found."
        )

    today = datetime.date.today()
    daily_usage = db.query(DailyUsage).filter(
        DailyUsage.user_id == user_id,
        DailyUsage.usage_date == today
    ).first()

    conversions_reset = 0
    pages_reset = 0
    if daily_usage:
        conversions_reset = daily_usage.conversion_count
        pages_reset = daily_usage.pages_processed
        daily_usage.conversion_count = 0
        daily_usage.pages_processed = 0
        db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_admin_action(
        db, admin, "RESET_QUOTA",
        f"Reset daily usage for user {target_user.email} ({user_id}): cleared {conversions_reset} conversions and {pages_reset} pages",
        client_ip
    )

    return {
        "message": f"Successfully reset quota for {target_user.email}.",
        "userId": user_id,
        "conversionsReset": conversions_reset,
        "pagesReset": pages_reset
    }

@router.get("/jobs")
def list_ocr_jobs(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Lists OCR jobs with status, processing time, and error diagnostics.
    Zero-Retention Policy: Raw user documents and extracted text are strictly omitted.
    """
    query = db.query(OCRJob)
    if status_filter:
        try:
            target_status = JobStatus(status_filter.lower())
            query = query.filter(OCRJob.status == target_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter '{status_filter}'."
            )

    total = query.count()
    jobs = query.order_by(OCRJob.created_at.desc()).offset(offset).limit(limit).all()

    user_ids = {j.user_id for j in jobs if j.user_id}
    users_map = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_map = {u.id: u.email for u in users}

    result = []
    for j in jobs:
        item = j.to_dict()
        item["userEmail"] = users_map.get(j.user_id, "Anonymous")
        result.append(item)

    return {
        "total": total,
        "jobs": result
    }

@router.get("/queue-stats")
def get_queue_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns current Celery/Redis queue depth and processing job metrics.
    """
    import redis
    redis_connected = False
    queue_length = 0

    try:
        r = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        r.ping()
        redis_connected = True
        queue_length = r.llen("celery")
    except Exception:
        redis_connected = False

    active_count = db.query(OCRJob).filter(OCRJob.status == JobStatus.PROCESSING).count()
    queued_count = db.query(OCRJob).filter(OCRJob.status == JobStatus.QUEUED).count()

    return {
        "redisConnected": redis_connected,
        "celeryQueueLength": queue_length,
        "processingJobs": active_count,
        "queuedJobs": queued_count
    }

@router.post("/cleanup/trigger")
def trigger_expired_cleanup(
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Manually triggers the zero-retention expired job purge task.
    Deletes files on disk past expires_at and clears text_result from database.
    """
    now = datetime.datetime.utcnow()
    expired_jobs = db.query(OCRJob).filter(OCRJob.expires_at <= now, OCRJob.status != JobStatus.EXPIRED).all()
    purged_count = 0

    for job in expired_jobs:
        if os.path.exists(job.secure_path):
            try:
                os.remove(job.secure_path)
            except Exception:
                pass
        job.text_result = None
        job.status = JobStatus.EXPIRED
        job.updated_at = now
        purged_count += 1

    db.commit()

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_admin_action(
        db, admin, "CLEANUP_EXPIRED_JOBS",
        f"Manually triggered expired job cleanup: purged {purged_count} records",
        client_ip
    )

    return {
        "message": f"Successfully purged {purged_count} expired OCR jobs.",
        "purgedCount": purged_count
    }


class ContactReplySchema(BaseModel):
    replyMessage: str
    subject: Optional[str] = None


class UpdateContactStatusSchema(BaseModel):
    status: Optional[str] = None
    adminNotes: Optional[str] = None


@router.get("/contact-messages")
def list_contact_messages(
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Lists support inquiries submitted via the Contact Us form.
    Includes status filter, sender search, and aggregate status counts.
    """
    query = db.query(ContactMessage)
    if status_filter and status_filter.lower() != "all":
        try:
            target_status = ContactStatus(status_filter.lower())
            query = query.filter(ContactMessage.status == target_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter '{status_filter}'."
            )

    if search:
        query = query.filter(
            (ContactMessage.email.ilike(f"%{search}%")) |
            (ContactMessage.name.ilike(f"%{search}%")) |
            (ContactMessage.subject.ilike(f"%{search}%"))
        )

    total = query.count()
    messages = query.order_by(ContactMessage.created_at.desc()).offset(offset).limit(limit).all()

    # Aggregate counts for quick dashboard badges
    new_count = db.query(ContactMessage).filter(ContactMessage.status == ContactStatus.NEW).count()
    in_progress_count = db.query(ContactMessage).filter(ContactMessage.status == ContactStatus.IN_PROGRESS).count()
    replied_count = db.query(ContactMessage).filter(ContactMessage.status == ContactStatus.REPLIED).count()
    closed_count = db.query(ContactMessage).filter(ContactMessage.status == ContactStatus.CLOSED).count()

    return {
        "total": total,
        "messages": [m.to_dict() for m in messages],
        "counts": {
            "new": new_count,
            "inProgress": in_progress_count,
            "replied": replied_count,
            "closed": closed_count,
            "total": new_count + in_progress_count + replied_count + closed_count
        }
    }


@router.get("/contact-messages/{message_id}")
def get_contact_message(
    message_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Fetches full details of a specific contact inquiry."""
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )
    return msg.to_dict()


@router.post("/contact-messages/{message_id}/reply")
def reply_to_contact_message(
    message_id: str,
    payload: ContactReplySchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Sends an email response directly to the user who submitted the contact form,
    updates message status to 'replied', and logs the action in the audit log.
    """
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )

    if not payload.replyMessage or not payload.replyMessage.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply message content cannot be empty."
        )

    # Dispatch email response to user via configured SMTP
    reply_subj = payload.subject.strip() if payload.subject and payload.subject.strip() else f"Re: {msg.subject}"
    success, email_status_msg = send_contact_reply_email(
        to_email=msg.email,
        recipient_name=msg.name,
        original_subject=msg.subject,
        reply_body=payload.replyMessage.strip(),
        custom_subject=reply_subj
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email reply: {email_status_msg}"
        )

    # Update database record
    msg.reply_subject = reply_subj
    msg.reply_message = payload.replyMessage.strip()
    msg.replied_at = datetime.datetime.utcnow()
    msg.replied_by = admin.email
    msg.status = ContactStatus.REPLIED
    db.commit()
    db.refresh(msg)

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_admin_action(
        db, admin, "REPLY_CONTACT_MESSAGE",
        f"Sent support email reply to {msg.email} regarding inquiry '{msg.subject}' ({msg.id})",
        client_ip
    )

    return {
        "message": f"Reply successfully sent to {msg.email}.",
        "contactMessage": msg.to_dict()
    }


@router.patch("/contact-messages/{message_id}")
def update_contact_message(
    message_id: str,
    payload: UpdateContactStatusSchema,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates status ('new', 'in_progress', 'replied', 'closed') or internal staff notes."""
    msg = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found."
        )

    changes = []
    if payload.status:
        try:
            msg.status = ContactStatus(payload.status.lower())
            changes.append(f"status -> {payload.status}")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value '{payload.status}'."
            )

    if payload.adminNotes is not None:
        msg.admin_notes = payload.adminNotes
        changes.append("updated internal notes")

    db.commit()
    db.refresh(msg)

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_admin_action(
        db, admin, "UPDATE_CONTACT_MESSAGE",
        f"Updated contact message from {msg.email} ({msg.id}): {', '.join(changes)}",
        client_ip
    )

    return {
        "message": f"Successfully updated contact inquiry {msg.id}.",
        "contactMessage": msg.to_dict()
    }


