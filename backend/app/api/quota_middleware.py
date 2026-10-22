import datetime
from typing import Optional
from fastapi import Request, Depends, HTTPException, status, Header, Cookie
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, DailyUsage, PlanTier, SystemSetting
from app.core.security import decode_access_token
from app.core.config import settings

def get_int_setting(db: Session, key: str, default: int) -> int:
    """Reads dynamic integer limit from SystemSetting table with fallback."""
    try:
        setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if setting and setting.value and str(setting.value).strip().isdigit():
            return int(setting.value.strip())
    except Exception:
        pass
    return default

def get_current_user_optional(
    request: Request,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Extracts current authenticated User from HTTP-only Cookie
    or Authorization: Bearer header. Returns None if unauthenticated.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif access_token:
        token = access_token

    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if user and user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact system administrator."
        )
    return user

def get_current_user(
    user: Optional[User] = Depends(get_current_user_optional)
) -> User:
    """Enforces authenticated user access (401 Unauthorized if unauthenticated, 403 Banned if suspended)."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in to access this resource."
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact system administrator."
        )
    return user

def require_admin(
    user: User = Depends(get_current_user)
) -> User:
    """Enforces administrator role requirement and email verification (403 Forbidden)."""
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required for this operation."
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator accounts must complete email verification before accessing administrative resources."
        )
    return user

def get_client_ip(request: Request) -> str:
    """
    Safely extracts client IP address behind trusted reverse proxies (Nginx).
    Falls back to socket host if proxy headers are not present.
    """
    real_ip = request.headers.get("X-Real-IP")
    if real_ip and real_ip.strip():
        return real_ip.split(",")[0].strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and forwarded.strip():
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

def check_and_increment_quota(
    request: Request,
    file_size_bytes: int,
    pdf_pages_count: int = 1,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Enforces tiered daily conversion quotas:
    - Unauthenticated IP: 3 conversions / 24h
    - Logged-in Free Tier User: 3 conversions / 24h
    - Pro User: Unlimited conversions
    """
    if user and user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended."
        )

    client_ip = get_client_ip(request)
    today = datetime.date.today()

    is_pro = (user is not None) and (user.plan_tier == PlanTier.PRO or user.plan_tier == "pro")

    # Dynamic limits from database SystemSetting with config fallbacks
    anon_daily = get_int_setting(db, "ANONYMOUS_DAILY_CONVERSIONS", settings.ANONYMOUS_DAILY_CONVERSIONS)
    free_daily = get_int_setting(db, "FREE_DAILY_CONVERSIONS", settings.FREE_DAILY_CONVERSIONS)
    pro_daily = get_int_setting(db, "PRO_DAILY_CONVERSIONS", settings.PRO_DAILY_CONVERSIONS)
    free_max_mb = get_int_setting(db, "FREE_MAX_FILE_MB", settings.FREE_MAX_FILE_MB)
    pro_max_mb = get_int_setting(db, "PRO_MAX_FILE_MB", settings.PRO_MAX_FILE_MB)
    free_max_pdf = get_int_setting(db, "FREE_MAX_PDF_PAGES", settings.FREE_MAX_PDF_PAGES)
    pro_max_pdf = get_int_setting(db, "PRO_MAX_PDF_PAGES", settings.PRO_MAX_PDF_PAGES)

    if is_pro:
        max_daily = pro_daily
        max_file_mb = pro_max_mb
        max_pdf_pages = pro_max_pdf
    elif user:
        max_daily = free_daily
        max_file_mb = free_max_mb
        max_pdf_pages = free_max_pdf
    else:
        max_daily = anon_daily
        max_file_mb = free_max_mb
        max_pdf_pages = free_max_pdf

    # Enforce file size limit
    max_bytes = max_file_mb * 1024 * 1024
    if file_size_bytes > max_bytes:
        plan_name = "Pro" if is_pro else "Free"
        err_msg = f"File size exceeds {plan_name} plan limit of {max_file_mb}MB."
        if not is_pro:
            err_msg += f" Upgrade to Pro for up to {pro_max_mb}MB files."
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=err_msg
        )

    # Enforce PDF page limit
    if pdf_pages_count > max_pdf_pages:
        plan_name = "Pro" if is_pro else "Free"
        err_msg = f"PDF exceeds {plan_name} plan page limit of {max_pdf_pages} pages."
        if not is_pro:
            err_msg += f" Upgrade to Pro for up to {pro_max_pdf} pages."
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )

    # Check current usage
    usage_query = db.query(DailyUsage).filter(DailyUsage.usage_date == today)
    if user:
        usage = usage_query.filter(DailyUsage.user_id == user.id).first()
    else:
        usage = usage_query.filter(DailyUsage.ip_address == client_ip).first()

    current_conversions = usage.conversion_count if usage else 0

    if current_conversions >= max_daily:
        if is_pro:
            msg = f"Daily Pro quota of {pro_daily} conversions reached. Please contact support or retry tomorrow."
        elif not user:
            msg = f"Anonymous daily limit of {anon_daily} conversions reached. Create a free account or upgrade to Pro for up to {pro_daily} conversions/day."
        else:
            msg = f"Daily free quota of {free_daily} conversions reached. Upgrade to Pro for up to {pro_daily} conversions/day."

        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg
        )

    # Increment usage counter
    if not usage:
        usage = DailyUsage(
            user_id=user.id if user else None,
            ip_address=client_ip,
            usage_date=today,
            conversion_count=1,
            pages_processed=pdf_pages_count
        )
        db.add(usage)
    else:
        usage.conversion_count += 1
        usage.pages_processed += pdf_pages_count
    db.commit()


# Distributed Redis-backed rate limiter with sliding window fallback
_RATE_LIMIT_BUCKETS: dict = {}
_redis_pool = None

def get_redis_client():
    global _redis_pool
    try:
        import redis
        if _redis_pool is None:
            _redis_pool = redis.ConnectionPool.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=1,
                socket_timeout=1,
                max_connections=10
            )
        client = redis.Redis(connection_pool=_redis_pool)
        client.ping()
        return client
    except Exception:
        return None

def enforce_distributed_rate_limit(
    key: str,
    max_attempts: int,
    window_seconds: int = 60,
    error_message: str = "Rate limit exceeded. Please try again later."
):
    """
    Enforces a distributed rate limit across all worker processes using Redis INCR with TTL.
    Gracefully falls back to thread-safe local in-memory sliding window when Redis is unavailable.
    """
    r = get_redis_client()
    if r:
        try:
            redis_key = f"rl:{key}"
            attempts = r.incr(redis_key)
            if attempts == 1:
                r.expire(redis_key, window_seconds)
            if attempts > max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=error_message
                )
            return
        except HTTPException:
            raise
        except Exception:
            pass

    now = datetime.datetime.utcnow().timestamp()
    timestamps = [ts for ts in _RATE_LIMIT_BUCKETS.get(key, []) if now - ts < window_seconds]
    if len(timestamps) >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=error_message
        )
    timestamps.append(now)
    _RATE_LIMIT_BUCKETS[key] = timestamps

    if len(_RATE_LIMIT_BUCKETS) > 1000:
        dormant = [k for k, ts_list in _RATE_LIMIT_BUCKETS.items() if not ts_list or now - ts_list[-1] >= window_seconds]
        for k in dormant:
            _RATE_LIMIT_BUCKETS.pop(k, None)

def check_auth_rate_limit(request: Request):
    """
    Enforces distributed rate limit on authentication endpoints (10 attempts / minute).
    """
    client_ip = get_client_ip(request)
    enforce_distributed_rate_limit(
        key=f"auth:{client_ip}",
        max_attempts=settings.LOGIN_RATE_LIMIT_PER_MINUTE,
        window_seconds=60,
        error_message="Too many authentication attempts from your IP. Please try again in 1 minute."
    )
