import logging
import re
import json
from datetime import datetime
from typing import Any, Dict

# Regex patterns for sensitive secret redaction
SENSITIVE_PATTERNS = [
    # Passwords in JSON or key-value format
    (re.compile(r'("(?:password|hashed_password|newPassword|current_password|SMTP_PASSWORD)"\s*:\s*)"([^"]+)"', re.IGNORECASE), r'\1"••••••••"'),
    (re.compile(r'(password=)([^\s&,]+)', re.IGNORECASE), r'\1••••••••'),
    # Stripe secret keys & webhook secrets
    (re.compile(r'\b(sk_live_[a-zA-Z0-9_]{10,})\b'), r'sk_live_••••••••'),
    (re.compile(r'\b(sk_test_[a-zA-Z0-9_]{10,})\b'), r'sk_test_••••••••'),
    (re.compile(r'\b(whsec_[a-zA-Z0-9_]{10,})\b'), r'whsec_••••••••'),
    # JWT Bearer tokens
    (re.compile(r'(Bearer\s+)ey[a-zA-Z0-9_\.\-]{20,}'), r'\1ey••••••••[REDACTED_JWT]'),
    # Google Client Secrets
    (re.compile(r'("(?:GOOGLE_CLIENT_SECRET)"\s*:\s*)"([^"]+)"', re.IGNORECASE), r'\1"••••••••"'),
    # 16-character Google App Passwords (e.g. abcd efgh ijkl mnop)
    (re.compile(r'\b[a-z]{4}\s[a-z]{4}\s[a-z]{4}\s[a-z]{4}\b'), r'•••• •••• •••• ••••'),
]

def redact_sensitive_text(text: str) -> str:
    """Scans and redacts sensitive credentials, tokens, and passwords from log strings."""
    if not isinstance(text, str):
        return text
    for pattern, replacement in SENSITIVE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text

class RedactingLogFilter(logging.Filter):
    """Logging filter that scrubs sensitive credentials before log record emission."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_sensitive_text(record.msg)
        if record.args:
            if isinstance(record.args, tuple):
                record.args = tuple(redact_sensitive_text(str(a)) if isinstance(a, str) else a for a in record.args)
            elif isinstance(record.args, dict):
                record.args = {k: redact_sensitive_text(str(v)) if isinstance(v, str) else v for k, v in record.args.items()}
        return True

class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON for enterprise observability systems."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "client_ip"):
            log_obj["client_ip"] = record.client_ip
        if hasattr(record, "request_id"):
            log_obj["request_id"] = record.request_id

        return json.dumps(log_obj)

def setup_logging(structured_json: bool = False, log_level: int = logging.INFO):
    # Check database dynamic setting if available
    try:
        from app.db.database import SessionLocal
        from app.db.models import SystemSetting
        db = SessionLocal()
        setting = db.query(SystemSetting).filter(SystemSetting.key == "STRUCTURED_LOGGING").first()
        if setting and setting.value:
            structured_json = str(setting.value).lower() == "true"
        db.close()
    except Exception:
        pass
    """Configures application-wide logging with secret redaction filters."""
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setLevel(log_level)

    if structured_json:
        handler.setFormatter(StructuredJsonFormatter())
    else:
        standard_format = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(standard_format)

    # Attach secret redacting filter
    redactor = RedactingLogFilter()
    handler.addFilter(redactor)
    root_logger.addHandler(handler)

    # Also attach redactor to uvicorn loggers
    for uvicorn_logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        u_logger = logging.getLogger(uvicorn_logger_name)
        u_logger.addFilter(redactor)
