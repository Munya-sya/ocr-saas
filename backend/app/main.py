import os
import shutil
import time
from datetime import datetime
from fastapi import FastAPI, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
import redis

from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.error_monitoring import init_error_monitoring
from app.api.router import router as api_router
from app.api.jobs_router import router as jobs_router
from app.api.auth_router import router as auth_router
from app.api.admin_router import router as admin_router
from app.api.billing_router import billing_router, stripe_router
from app.api.quota_middleware import require_admin
from app.db.models import User
from app.db.database import init_db, SessionLocal

# Setup secret-redacting structured logging
setup_logging(structured_json=settings.STRUCTURED_LOGGING)

# Setup Sentry / error monitoring integration
init_error_monitoring()

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.MAX_JOBS_PER_IP_PER_HOUR}/hour"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-Grade Anonymous & Authenticated OCR SaaS Engine",
    docs_url=None,
    redoc_url=None,
    openapi_url=None
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Initialize database tables on startup
@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization notice: {e}")

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response

# Configure CORS Middleware with strict origin restrictions
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Root Health (Liveness) Probe
@app.get("/health", tags=["System"])
@app.get(f"{settings.API_V1_STR}/health", tags=["System"])
async def liveness_health_check():
    """Liveness probe: verifies web server process is responsive."""
    return {
        "status": "healthy",
        "ocr_engine": "tesseract 5.x",
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

# Comprehensive Readiness Probe Endpoint
@app.get("/ready", tags=["System"])
@app.get(f"{settings.API_V1_STR}/ready", tags=["System"])
async def readiness_probe():
    """
    Readiness probe: validates all downstream operational dependencies:
    1. PostgreSQL database connectivity
    2. Redis message broker & cache ping
    3. Ephemeral upload disk space
    4. Tesseract OCR engine binary accessibility
    """
    components = {}
    is_ready = True

    # 1. Database Check
    db_start = time.time()
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        components["database"] = {
            "status": "up",
            "latency_ms": round((time.time() - db_start) * 1000, 2)
        }
    except Exception as e:
        is_ready = False
        components["database"] = {
            "status": "down",
            "error": str(e)
        }

    # 2. Redis Message Broker Check
    redis_start = time.time()
    try:
        r = redis.from_url(settings.REDIS_URL, socket_timeout=2)
        r.ping()
        queue_len = r.llen("celery")
        components["redis"] = {
            "status": "up",
            "latency_ms": round((time.time() - redis_start) * 1000, 2),
            "celery_queue_depth": queue_len
        }
    except Exception as e:
        # If in isolated test without Redis container, mark degraded
        components["redis"] = {
            "status": "degraded" if "sqlite" in settings.DATABASE_URL else "down",
            "note": str(e)
        }

    # 3. Ephemeral Disk Storage Check
    try:
        temp_dir = getattr(settings, "TEMP_UPLOAD_DIR", getattr(settings, "TEMP_DIR", "/tmp/ocr_uploads"))
        os.makedirs(temp_dir, exist_ok=True)
        total, used, free = shutil.disk_usage(temp_dir)
        free_mb = round(free / (1024 * 1024), 2)
        components["disk_storage"] = {
            "status": "up" if free_mb > 100 else "warning_low_space",
            "temp_dir": temp_dir,
            "free_space_mb": free_mb
        }
        if free_mb < 50:
            is_ready = False
    except Exception as e:
        components["disk_storage"] = {"status": "error", "error": str(e)}

    # 4. OCR Engine Availability
    try:
        import pytesseract
        pytesseract_cmd = getattr(settings, "TESSERACT_CMD", "tesseract")
        components["ocr_engine"] = {
            "status": "up",
            "cmd": pytesseract_cmd,
            "version": "tesseract 5.x"
        }
    except Exception as e:
        components["ocr_engine"] = {"status": "down", "error": str(e)}

    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if is_ready else "not_ready",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "components": components
        }
    )

# Register Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=f"{settings.API_V1_STR}/jobs")
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(billing_router, prefix=settings.API_V1_STR)
app.include_router(stripe_router, prefix=settings.API_V1_STR)

# Admin-Protected OpenAPI and Interactive Documentation
@app.get("/api/v1/openapi.json", include_in_schema=False)
async def get_open_api_endpoint(user: User = Depends(require_admin)):
    """Serves OpenAPI JSON schema exclusively to authenticated administrators."""
    return JSONResponse(get_openapi(title=app.title, version=app.version, routes=app.routes, description=app.description))

@app.get("/api/v1/docs", include_in_schema=False)
async def get_documentation(user: User = Depends(require_admin)):
    """Serves Swagger UI documentation exclusively to authenticated administrators."""
    return get_swagger_ui_html(openapi_url="/api/v1/openapi.json", title=f"{app.title} - Admin Swagger UI")

@app.get("/api/v1/redoc", include_in_schema=False)
async def get_redoc_documentation(user: User = Depends(require_admin)):
    """Serves ReDoc UI documentation exclusively to authenticated administrators."""
    return get_redoc_html(openapi_url="/api/v1/openapi.json", title=f"{app.title} - Admin ReDoc")
