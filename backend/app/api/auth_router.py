import os
import hmac
import secrets
import datetime
import uuid
import logging
import requests
import stripe
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, Cookie
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.db.models import User, EmailVerificationToken, PasswordResetToken, DailyUsage, PlanTier, SystemSetting, AuditLog, OCRJob
from app.core.security import hash_password, verify_password, create_access_token
from app.services.email_service import send_verification_email, send_password_reset_email, send_admin_new_user_alert
from app.services.captcha_service import verify_captcha_token
from app.api.quota_middleware import get_current_user, check_auth_rate_limit, get_client_ip
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication & Account"])
logger = logging.getLogger("scantext.auth")

def get_setting_value(db: Session, key_name: str, default_val: str = "") -> str:
    setting = db.query(SystemSetting).filter(SystemSetting.key == key_name).first()
    if setting and setting.value and setting.value.strip():
        return setting.value.strip()
    return getattr(settings, key_name, default_val)

@router.get("/google/login")
def google_login(response: Response, db: Session = Depends(get_db)):
    """Initiates Google OAuth 2.0 redirect flow with cryptographic CSRF state token."""
    client_id = get_setting_value(db, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth is not configured yet. An administrator must set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Admin Console System Settings."
        )

    redirect_uri = get_setting_value(db, "GOOGLE_REDIRECT_URI", "http://localhost/api/v1/auth/google/callback")
    scope = "openid email profile"
    
    # Generate cryptographic CSRF state token and store in HttpOnly cookie
    state = secrets.token_urlsafe(32)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        max_age=300,
        samesite="lax",
        secure=settings.COOKIE_SECURE
    )

    url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}&state={state}&access_type=offline&prompt=consent"

    return {"url": url}

@router.get("/google/callback")
def google_callback(
    response: Response,
    code: Optional[str] = None,
    error: Optional[str] = None,
    state: Optional[str] = None,
    oauth_state: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
):
    """Exchanges Google authorization code for access token, validates CSRF state, and sets JWT cookie."""
    if error or not code:
        return RedirectResponse(url="/login?error=oauth_cancelled", status_code=302)

    # Verify OAuth state parameter against cookie to prevent CSRF
    if not state or not oauth_state or not hmac.compare_digest(state, oauth_state):
        return RedirectResponse(url="/login?error=oauth_invalid_state", status_code=302)

    response.delete_cookie(key="oauth_state")

    client_id = get_setting_value(db, "GOOGLE_CLIENT_ID", "")
    client_secret = get_setting_value(db, "GOOGLE_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        return RedirectResponse(url="/login?error=oauth_not_configured", status_code=302)

    redirect_uri = get_setting_value(db, "GOOGLE_REDIRECT_URI", "http://localhost/api/v1/auth/google/callback")
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    }

    try:
        token_res = requests.post(token_url, data=data, timeout=10)
    except Exception:
        return RedirectResponse(url="/login?error=oauth_failed", status_code=302)

    if token_res.status_code != 200:
        return RedirectResponse(url="/login?error=oauth_failed", status_code=302)

    token_json = token_res.json()
    access_token_google = token_json.get("access_token")

    try:
        user_info_res = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token_google}"},
            timeout=10
        )
    except Exception:
        return RedirectResponse(url="/login?error=oauth_failed", status_code=302)

    if user_info_res.status_code != 200:
        return RedirectResponse(url="/login?error=oauth_failed", status_code=302)

    user_info = user_info_res.json()
    email = user_info.get("email", "").lower()
    if not email:
        return RedirectResponse(url="/login?error=oauth_no_email", status_code=302)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        is_initial_admin = bool(settings.INITIAL_ADMIN_EMAIL and email == settings.INITIAL_ADMIN_EMAIL.lower())
        if is_initial_admin:
            admin_already_exists = db.query(User).filter(User.is_admin == True).first()
            is_admin = (admin_already_exists is None)
        else:
            is_admin = False

        user = User(
            email=email,
            hashed_password=hash_password(str(uuid.uuid4())),
            is_verified=True,
            is_admin=is_admin,
            plan_tier=PlanTier.FREE
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        try:
            send_admin_new_user_alert(user.email, "free (Google OAuth)")
        except Exception as e:
            print(f"[Admin Alert Notice] {e}")

    if user.is_banned:
        return RedirectResponse(url="/login?error=suspended", status_code=302)

    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    redirect_resp = RedirectResponse(url="/dashboard", status_code=302)
    redirect_resp.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.COOKIE_SECURE
    )
    return redirect_resp

# Pydantic Schemas
class RegisterSchema(BaseModel):
    email: EmailStr
    password: str
    captchaToken: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordSchema(BaseModel):
    email: EmailStr
    captchaToken: Optional[str] = None

class ResetPasswordSchema(BaseModel):
    token: str
    newPassword: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(request: Request, payload: RegisterSchema, db: Session = Depends(get_db)):
    """Registers new user account and dispatches Mailpit verification email."""
    check_auth_rate_limit(request)
    client_ip = get_client_ip(request)
    captcha_valid, captcha_msg = verify_captcha_token(payload.captchaToken, client_ip)
    if not captcha_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=captcha_msg
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    hashed_pw = hash_password(payload.password)
    # Admin rights are strictly prevented on unverified self-registration (prevents admin squatting)
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hashed_pw,
        is_verified=False,
        is_admin=False,
        plan_tier=PlanTier.FREE
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate verification token
    token_str = str(uuid.uuid4())
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    verify_token = EmailVerificationToken(
        user_id=new_user.id,
        token=token_str,
        expires_at=expires
    )
    db.add(verify_token)
    db.commit()

    # Send verification email via Mailpit / SMTP
    send_verification_email(new_user.email, token_str)

    # Send admin new user notification
    try:
        send_admin_new_user_alert(new_user.email, new_user.plan_tier.value)
    except Exception as e:
        print(f"[Admin Alert Notice] {e}")

    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "user": new_user.to_dict()
    }

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verifies user email address using single-use verification token."""
    verify_token = db.query(EmailVerificationToken).filter(EmailVerificationToken.token == token).first()
    if not verify_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token."
        )

    if verify_token.expires_at < datetime.datetime.utcnow():
        db.delete(verify_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired. Please request a new verification email."
        )

    user = db.query(User).filter(User.id == verify_token.user_id).first()
    if user:
        user.is_verified = True
        # Promote initial system administrator only upon verified email ownership confirmation
        if settings.INITIAL_ADMIN_EMAIL and user.email.lower() == settings.INITIAL_ADMIN_EMAIL.lower():
            verified_admin_exists = db.query(User).filter(User.is_admin == True, User.is_verified == True).first()
            if not verified_admin_exists:
                user.is_admin = True
        db.delete(verify_token)
        db.commit()

    return {"message": "Email address verified successfully. You can now log in."}

@router.post("/resend-verification")
def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resends a fresh email verification link to the logged-in user with rate limit protection."""
    check_auth_rate_limit(request)
    if current_user.is_verified:
        return {"message": "Your email address is already verified."}

    # Delete any existing verification tokens for this user
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == current_user.id).delete()

    # Generate fresh verification token
    token_str = str(uuid.uuid4())
    expires = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    verify_token = EmailVerificationToken(
        user_id=current_user.id,
        token=token_str,
        expires_at=expires
    )
    db.add(verify_token)
    db.commit()

    # Send verification email
    send_verification_email(current_user.email, token_str)

    return {"message": f"Verification email resent to {current_user.email}. Please check your inbox."}

@router.post("/login")
def login_user(request: Request, payload: LoginSchema, response: Response, db: Session = Depends(get_db)):
    """Authenticates user credentials and sets secure HTTP-only JWT access cookie."""
    check_auth_rate_limit(request)
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact system administrator."
        )

    access_token = create_access_token(data={"sub": user.id, "email": user.email})

    # Set HTTP-only secure cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=settings.COOKIE_SECURE
    )

    return {
        "message": "Login successful.",
        "accessToken": access_token,
        "tokenType": "bearer",
        "user": user.to_dict()
    }

@router.post("/logout")
def logout_user(response: Response):
    """Clears JWT access token cookie."""
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully."}

@router.post("/forgot-password")
def forgot_password(request: Request, payload: ForgotPasswordSchema, db: Session = Depends(get_db)):
    """Generates single-use password reset token and dispatches reset email."""
    check_auth_rate_limit(request)
    client_ip = get_client_ip(request)
    captcha_valid, captcha_msg = verify_captcha_token(payload.captchaToken, client_ip)
    if not captcha_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=captcha_msg
        )

    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended. Please contact system administrator."
            )
        # Delete existing reset tokens for user
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()

        token_str = str(uuid.uuid4())
        expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token_str,
            expires_at=expires
        )
        db.add(reset_token)
        db.commit()

        send_password_reset_email(user.email, token_str)

    return {"message": "If an account with that email exists, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordSchema, db: Session = Depends(get_db)):
    """Resets user password using single-use expiring token."""
    if len(payload.newPassword) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    reset_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    if not reset_token or not hmac.compare_digest(reset_token.token, payload.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token."
        )

    if reset_token.expires_at < datetime.datetime.utcnow():
        db.delete(reset_token)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new link."
        )

    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if user:
        if user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is suspended. Please contact system administrator."
            )
        user.hashed_password = hash_password(payload.newPassword)
        db.delete(reset_token)
        db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}

@router.get("/me")
def get_current_user_profile(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns current user profile, plan tier, and daily quota statistics."""
    today = datetime.date.today()
    usage = db.query(DailyUsage).filter(
        DailyUsage.user_id == user.id,
        DailyUsage.usage_date == today
    ).first()

    is_pro = (user.plan_tier == PlanTier.PRO) or (user.plan_tier == "pro")
    conversions_used = usage.conversion_count if usage else 0
    max_daily = settings.PRO_DAILY_CONVERSIONS if is_pro else settings.FREE_DAILY_CONVERSIONS
    remaining = max(0, max_daily - conversions_used)

    return {
        "user": user.to_dict(),
        "quota": {
            "planTier": user.plan_tier.value if isinstance(user.plan_tier, PlanTier) else user.plan_tier,
            "conversionsUsedToday": conversions_used,
            "maxDailyConversions": max_daily,
            "conversionsRemaining": remaining,
            "maxFileMb": settings.PRO_MAX_FILE_MB if is_pro else settings.FREE_MAX_FILE_MB,
            "maxPdfPages": settings.PRO_MAX_PDF_PAGES if is_pro else settings.FREE_MAX_PDF_PAGES,
            "hasAds": not is_pro,
            "batchProcessing": is_pro,
        }
    }

@router.post("/cancel-pro")
def cancel_pro_subscription(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancels Pro subscription in Stripe and reverts user account back to Free plan tier."""
    current_tier = user.plan_tier.value if hasattr(user.plan_tier, 'value') else str(user.plan_tier)
    if current_tier.lower() == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is already on the Free tier."
        )

    # Cancel active subscription in Stripe to stop recurring charges
    if user.stripe_subscription_id:
        stripe_key = get_setting_value(db, "STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
        try:
            stripe.Subscription.modify(
                user.stripe_subscription_id,
                cancel_at_period_end=True,
                api_key=stripe_key
            )
            user.subscription_status = "canceling"
            db.commit()
            db.refresh(user)
            return {
                "message": "Pro subscription set to cancel at the end of the current billing period. No further charges will occur.",
                "user": user.to_dict()
            }
        except stripe.error.InvalidRequestError as ire:
            logger.warning(f"Stripe subscription modify notice for {user.email}: {ire}")
        except Exception as e:
            logger.error(f"Failed to cancel Stripe subscription for {user.email}: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to communicate cancellation with payment processor. Please manage via Customer Portal or contact support."
            )

    user.plan_tier = PlanTier.FREE
    user.subscription_status = "canceled"
    user.stripe_subscription_id = None
    db.commit()
    db.refresh(user)

    return {
        "message": "Pro subscription cancelled successfully. Account reverted to Free tier.",
        "user": user.to_dict()
    }

@router.get("/export-data")
def export_user_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GDPR Article 20 / CCPA Data Portability Compliance:
    Exports all personal data, subscription details, usage metrics, and OCR job history
    in a structured, machine-readable JSON format.
    """
    usages = db.query(DailyUsage).filter(DailyUsage.user_id == user.id).all()
    jobs = db.query(OCRJob).filter(OCRJob.user_id == user.id).all()
    audit_logs = db.query(AuditLog).filter(AuditLog.user_id == user.id).all()

    export_payload = {
        "exportMetadata": {
            "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "standard": "GDPR Article 20 / CCPA § 1798.100 Compliant Data Portability Export",
            "service": "ScanText OCR SaaS"
        },
        "userProfile": user.to_dict(),
        "dailyUsageHistory": [
            {
                "date": u.usage_date.isoformat(),
                "conversions": u.conversion_count,
                "pagesProcessed": u.pages_processed
            } for u in usages
        ],
        "ocrJobsHistory": [
            {
                "jobId": j.job_id,
                "filename": j.filename,
                "status": j.status.value if hasattr(j.status, 'value') else str(j.status),
                "fileType": j.file_type,
                "language": j.language,
                "pageCount": j.page_count,
                "processingMs": j.processing_ms,
                "createdAt": j.created_at.isoformat() if j.created_at else None
            } for j in jobs
        ],
        "auditLogs": [l.to_dict() for l in audit_logs]
    }
    return JSONResponse(
        content=export_payload,
        headers={"Content-Disposition": 'attachment; filename="scantext_user_data.json"'}
    )

@router.delete("/account")
def delete_account(
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GDPR Article 17 (Right to Erasure) & Consumer Protection Compliance:
    1. Cancels active recurring Stripe subscription immediately to eliminate ghost billing.
    2. Wipes all physical uploaded and processed document files from disk.
    3. Permanently deletes user account, tokens, usage, and job database records.
    4. Clears authentication cookie.
    """
    # 1. Immediately cancel any active Stripe subscription so user is never billed again
    if user.stripe_subscription_id:
        stripe_key = get_setting_value(db, "STRIPE_SECRET_KEY", settings.STRIPE_SECRET_KEY)
        try:
            stripe.Subscription.cancel(user.stripe_subscription_id, api_key=stripe_key)
            logger.info(f"Canceled Stripe subscription {user.stripe_subscription_id} for deleted user {user.email}")
        except stripe.error.InvalidRequestError:
            # Subscription already canceled or does not exist on Stripe
            pass
        except Exception as e:
            logger.error(f"Error canceling Stripe subscription for deleted user {user.email}: {e}", exc_info=True)

    # 2. Securely purge all physical document and image files from server disk
    jobs = db.query(OCRJob).filter(OCRJob.user_id == user.id).all()
    for job in jobs:
        if job.secure_path and os.path.exists(job.secure_path):
            try:
                os.remove(job.secure_path)
            except Exception as e:
                logger.warning(f"Could not remove file {job.secure_path}: {e}")

    # 3. Delete database record (cascade deletes jobs, tokens, daily usage, etc.)
    db.delete(user)
    db.commit()

    # 4. Clear auth cookie
    response.delete_cookie(key="access_token")
    return {"message": "Account, subscriptions, and all saved document files permanently erased."}
