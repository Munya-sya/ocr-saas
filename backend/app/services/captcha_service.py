import os
import urllib.request
import urllib.parse
import json
from typing import Optional, Tuple
from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import SystemSetting

def get_captcha_settings() -> Tuple[bool, str, str, str]:
    """Retrieves CAPTCHA settings dynamically from database with config.py fallback."""
    db = SessionLocal()
    try:
        settings_map = {s.key: s.value for s in db.query(SystemSetting).all()}
        enabled_str = settings_map.get("CAPTCHA_ENABLED", str(getattr(settings, "CAPTCHA_ENABLED", False)))
        enabled = str(enabled_str).lower() == "true"
        provider = settings_map.get("CAPTCHA_PROVIDER", getattr(settings, "CAPTCHA_PROVIDER", "turnstile"))
        site_key = settings_map.get("CAPTCHA_SITE_KEY", getattr(settings, "CAPTCHA_SITE_KEY", ""))
        secret_key = settings_map.get("CAPTCHA_SECRET_KEY", getattr(settings, "CAPTCHA_SECRET_KEY", ""))
        return enabled, provider, site_key, secret_key
    except Exception:
        return (
            getattr(settings, "CAPTCHA_ENABLED", False),
            getattr(settings, "CAPTCHA_PROVIDER", "turnstile"),
            getattr(settings, "CAPTCHA_SITE_KEY", ""),
            getattr(settings, "CAPTCHA_SECRET_KEY", "")
        )
    finally:
        db.close()

def verify_captcha_token(token: Optional[str], client_ip: Optional[str] = None) -> Tuple[bool, str]:
    """
    Verifies a client-provided CAPTCHA token against Cloudflare Turnstile,
    Google reCAPTCHA, or hCaptcha.
    
    Returns (success: bool, message: str).
    """
    enabled, provider, site_key, secret_key = get_captcha_settings()

    # Bypassed if CAPTCHA is disabled
    if not enabled:
        return True, "CAPTCHA verification disabled."

    # Test / Development bypass token (strictly restricted to non-production environments)
    current_env = getattr(settings, "ENVIRONMENT", os.getenv("ENVIRONMENT", "development")).lower()
    if token in ("test-captcha-token", "development-bypass-token"):
        if current_env in ("production", "prod", "staging"):
            return False, "Development bypass tokens are rejected in production environments."
        return True, "Development CAPTCHA bypass accepted."

    if not token:
        return False, "Missing required CAPTCHA verification token."

    if not secret_key:
        # If enabled but secret key missing, fail safe with clear diagnostic
        return False, "CAPTCHA is enabled but CAPTCHA_SECRET_KEY is unconfigured in system settings."

    try:
        # Determine verification endpoint by provider
        if provider.lower() == "recaptcha":
            verify_url = "https://www.google.com/recaptcha/api/siteverify"
        elif provider.lower() == "hcaptcha":
            verify_url = "https://hcaptcha.com/siteverify"
        else:
            # Default: Cloudflare Turnstile
            verify_url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

        post_data = {
            "secret": secret_key,
            "response": token
        }
        if client_ip:
            post_data["remoteip"] = client_ip

        encoded_data = urllib.parse.urlencode(post_data).encode("utf-8")
        req = urllib.request.Request(
            verify_url,
            data=encoded_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

        with urllib.request.urlopen(req, timeout=6) as response:
            result = json.loads(response.read().decode("utf-8"))
            if result.get("success") is True:
                return True, "CAPTCHA verification succeeded."
            else:
                error_codes = result.get("error-codes", ["invalid-input-response"])
                return False, f"CAPTCHA validation rejected: {', '.join(error_codes)}"

    except Exception as e:
        return False, f"CAPTCHA verification network error: {str(e)}"
