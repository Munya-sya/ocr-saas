import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger("app.error_monitoring")

def init_error_monitoring():
    """
    Initializes Sentry or error tracking if SENTRY_DSN is configured.
    If unconfigured or placeholder, runs in safe no-op mode without overhead.
    """
    sentry_dsn = ""
    try:
        from app.db.database import SessionLocal
        from app.db.models import SystemSetting
        db = SessionLocal()
        setting = db.query(SystemSetting).filter(SystemSetting.key == "SENTRY_DSN").first()
        if setting and setting.value and not setting.value.startswith("...") and "sentry.io" in setting.value:
            sentry_dsn = setting.value.strip()
        db.close()
    except Exception as e:
        logger.debug(f"[ErrorMonitoring] Could not query Sentry DSN from DB: {e}")

    if not sentry_dsn:
        sentry_dsn = os.getenv("SENTRY_DSN", "")

    if not sentry_dsn or sentry_dsn in ("placeholder_dsn", "https://examplePublicKey@o0.ingest.sentry.io/0"):
        logger.info("[ErrorMonitoring] Sentry DSN unconfigured. Running in local structured logging mode.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration

        def before_send_scrubber(event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
            """Scrubs sensitive headers, cookies, and tokens before transmitting to Sentry."""
            request_data = event.get("request", {})
            headers = request_data.get("headers", {})

            for header_name in ("authorization", "cookie", "set-cookie", "stripe-signature"):
                if header_name in headers:
                    headers[header_name] = "[REDACTED]"

            # Scrub body data if present
            if "data" in request_data and isinstance(request_data["data"], dict):
                for sensitive_field in ("password", "token", "secret", "newPassword"):
                    if sensitive_field in request_data["data"]:
                        request_data["data"][sensitive_field] = "••••••••"

            return event

        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                CeleryIntegration(),
            ],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
            send_default_pii=False,
            before_send=before_send_scrubber,
            environment=os.getenv("ENVIRONMENT", "production"),
        )
        logger.info("[ErrorMonitoring] Sentry error tracking successfully initialized with PII scrubbing.")
        return True
    except ImportError:
        logger.warning("[ErrorMonitoring] sentry-sdk not installed; running in local fallback mode.")
        return False
    except Exception as e:
        logger.error(f"[ErrorMonitoring Warning] Failed to initialize Sentry: {e}")
        return False
