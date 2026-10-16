import os
import json
import logging
from typing import List, Dict, Set, Optional
from pydantic_settings import BaseSettings

logger = logging.getLogger("scantext.config")

def load_vault_secrets(vault_path: Optional[str] = None) -> Dict[str, str]:
    """
    Explicitly loads runtime secrets rendered by Vault Agent into a restricted JSON file.
    Falls back gracefully to an empty dictionary if file does not exist (dev/test mode).
    """
    file_path = vault_path or os.getenv("VAULT_SECRETS_FILE", "/vault/secrets/secrets.json")
    if file_path and os.path.isfile(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    logger.info("Successfully loaded runtime secrets from Vault Agent file: %s", file_path)
                    return {k: str(v) for k, v in data.items() if v is not None}
                logger.warning("Vault secrets file %s does not contain a JSON dictionary object", file_path)
        except Exception as exc:
            logger.error("Failed to parse Vault secrets file %s: %s", file_path, exc)
    return {}

_vault_secrets = load_vault_secrets()

class Settings(BaseSettings):
    PROJECT_NAME: str = "ScanText OCR SaaS API"
    VERSION: str = "3.1.0"
    API_V1_STR: str = "/api/v1"
    VAULT_SECRETS_FILE: str = os.getenv("VAULT_SECRETS_FILE", "/vault/secrets/secrets.json")
    VAULT_SECRETS_LOADED: bool = bool(_vault_secrets)

    # Security & Limits
    MAX_FILE_SIZE_MB: int = 10
    MAX_PDF_MB: int = 50
    MAX_PDF_PAGES: int = 100
    OCR_TIMEOUT_SECONDS: int = 300
    MAX_JOBS_PER_IP_PER_HOUR: int = 30
    RETENTION_HOURS: int = 24

    # Tiered Free Plan Quotas (24h Window)
    ANONYMOUS_DAILY_CONVERSIONS: int = int(os.getenv("ANONYMOUS_DAILY_CONVERSIONS", "3"))  # 3 free conversions for unauthenticated IP
    FREE_DAILY_CONVERSIONS: int = int(os.getenv("FREE_DAILY_CONVERSIONS", "3"))           # 3 free conversions for logged-in free user
    FREE_MAX_FILE_MB: int = int(os.getenv("FREE_MAX_FILE_MB", "10"))                      # 10 MB file maximum
    FREE_MAX_PDF_PAGES: int = int(os.getenv("FREE_MAX_PDF_PAGES", "5"))                   # 5 PDF pages maximum

    # Pro Plan Limits (Phase 4)
    PRO_DAILY_CONVERSIONS: int = int(os.getenv("PRO_DAILY_CONVERSIONS", "100"))
    PRO_MAX_FILE_MB: int = int(os.getenv("PRO_MAX_FILE_MB", "50"))
    PRO_MAX_PDF_PAGES: int = int(os.getenv("PRO_MAX_PDF_PAGES", "100"))

    # Stripe Subscriptions & Billing (Secrets loaded from Vault first, then env)
    STRIPE_SECRET_KEY: str = _vault_secrets.get("STRIPE_SECRET_KEY") or os.getenv("STRIPE_SECRET_KEY", "sk_test_placeholder_key")
    STRIPE_PUBLISHABLE_KEY: str = _vault_secrets.get("STRIPE_PUBLISHABLE_KEY") or os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_placeholder_key")
    STRIPE_WEBHOOK_SECRET: str = _vault_secrets.get("STRIPE_WEBHOOK_SECRET") or os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder_secret")
    STRIPE_PRO_MONTHLY_PRICE_ID: str = _vault_secrets.get("STRIPE_PRO_MONTHLY_PRICE_ID") or os.getenv("STRIPE_PRO_MONTHLY_PRICE_ID", "price_ocr_pro_monthly_test")
    STRIPE_DISPLAY_PRICE: str = os.getenv("STRIPE_DISPLAY_PRICE", "19.00")
    STRIPE_CURRENCY: str = os.getenv("STRIPE_CURRENCY", "USD")
    STRIPE_ALLOW_PROMO_CODES: bool = os.getenv("STRIPE_ALLOW_PROMO_CODES", "true").lower() == "true"
    STRIPE_GRACE_PERIOD_DAYS: int = int(os.getenv("STRIPE_GRACE_PERIOD_DAYS", "3"))
    STRIPE_PORTAL_ALLOW_CANCEL: bool = os.getenv("STRIPE_PORTAL_ALLOW_CANCEL", "true").lower() == "true"
    STRIPE_PORTAL_RETURN_URL: str = os.getenv("STRIPE_PORTAL_RETURN_URL", "/dashboard")

    # Auth & JWT Configuration
    JWT_SECRET: str = _vault_secrets.get("JWT_SECRET") or os.getenv("JWT_SECRET", "super_secret_jwt_key_ocr_saas_2026_dev_key")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    INITIAL_ADMIN_EMAIL: str = _vault_secrets.get("INITIAL_ADMIN_EMAIL") or os.getenv("INITIAL_ADMIN_EMAIL", "")
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 10
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # SMTP Local Mail Catcher Settings (Mailpit)
    SMTP_HOST: str = _vault_secrets.get("SMTP_HOST") or os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(_vault_secrets.get("SMTP_PORT") or os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = _vault_secrets.get("SMTP_USER") or os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = _vault_secrets.get("SMTP_PASSWORD") or os.getenv("SMTP_PASSWORD", "")
    EMAILS_FROM_EMAIL: str = "noreply@scantext-ocr.com"
    EMAILS_FROM_NAME: str = "ScanText OCR SaaS"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost")

    # Google OAuth 2.0 Settings
    GOOGLE_CLIENT_ID: str = _vault_secrets.get("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = _vault_secrets.get("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost/api/v1/auth/google/callback")

    # CAPTCHA Protection Settings (Turnstile / reCAPTCHA / hCaptcha)
    CAPTCHA_ENABLED: bool = os.getenv("CAPTCHA_ENABLED", "false").lower() == "true"
    CAPTCHA_PROVIDER: str = os.getenv("CAPTCHA_PROVIDER", "turnstile")
    CAPTCHA_SITE_KEY: str = _vault_secrets.get("CAPTCHA_SITE_KEY") or os.getenv("CAPTCHA_SITE_KEY", "")
    CAPTCHA_SECRET_KEY: str = _vault_secrets.get("CAPTCHA_SECRET_KEY") or os.getenv("CAPTCHA_SECRET_KEY", "")

    # Observability & Production Hardening
    SENTRY_DSN: str = _vault_secrets.get("SENTRY_DSN") or os.getenv("SENTRY_DSN", "")
    STRUCTURED_LOGGING: bool = os.getenv("STRUCTURED_LOGGING", "false").lower() == "true"

    # Google AdSense Monetization (Free / Anonymous Tier Only)
    ADSENSE_ENABLED: bool = os.getenv("ADSENSE_ENABLED", "false").lower() == "true"
    ADSENSE_CLIENT_ID: str = _vault_secrets.get("ADSENSE_CLIENT_ID") or os.getenv("ADSENSE_CLIENT_ID", "")
    ADSENSE_SLOT_BELOW_UPLOAD: str = os.getenv("ADSENSE_SLOT_BELOW_UPLOAD", "")
    ADSENSE_SLOT_BELOW_RESULTS: str = os.getenv("ADSENSE_SLOT_BELOW_RESULTS", "")

    # Allowed File Extensions & Magic Byte Headers
    ALLOWED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

    ALLOWED_MIME_TYPES: Set[str] = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
    }

    # Supported Tesseract Language Packs
    SUPPORTED_LANGUAGES: Dict[str, str] = {
        "eng": "English",
        "deu": "German",
        "fra": "French",
        "spa": "Spanish",
    }

    # Tesseract Binary Path Override
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "tesseract")

    # Storage Paths
    TEMP_UPLOAD_DIR: str = os.getenv("TEMP_UPLOAD_DIR", "/tmp/ocr_uploads")

    # CORS Allowed Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1",
    ]

    # Database & Redis Connection Settings
    DATABASE_URL: str = _vault_secrets.get("DATABASE_URL") or os.getenv("DATABASE_URL", "postgresql://ocr_user:ocr_password@postgres:5432/ocr_db")
    SQLITE_FALLBACK_URL: str = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./ocr_jobs.db")
    REDIS_URL: str = _vault_secrets.get("REDIS_URL") or os.getenv("REDIS_URL", "redis://redis:6379/0")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Production Security Gate: Prevent deployment with known default dev secrets & insecure defaults
if settings.ENVIRONMENT.lower() in ("production", "prod"):
    if not settings.JWT_SECRET or settings.JWT_SECRET in ("super_secret_jwt_key_ocr_saas_2026_dev_key", "secret", "change_me") or len(settings.JWT_SECRET) < 32:
        raise RuntimeError("CRITICAL SECURITY ERROR: Production deployment requires a secure, non-default JWT_SECRET of at least 32 characters in environment variables or Vault.")
    if "ocr_password" in settings.DATABASE_URL:
        import logging
        logging.getLogger("scantext.security").warning("SECURITY WARNING: Production DATABASE_URL contains default postgres password 'ocr_password'. Ensure production credentials are provisioned in HashiCorp Vault.")

