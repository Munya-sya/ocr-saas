import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.router import router as api_router
from app.api.jobs_router import router as jobs_router
from app.db.database import init_db

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.MAX_JOBS_PER_IP_PER_HOUR}/hour"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise-Grade Anonymous Image & PDF OCR SaaS Engine",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
    openapi_url="/api/v1/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Initialize database tables
@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"Database initialization notice: {e}")

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Health Probe Endpoint
@app.get("/health", tags=["System"])
async def root_health_check():
    """Health check endpoint for root orchestrator probes."""
    return {
        "status": "healthy",
        "ocr_engine": "tesseract 5.x",
        "pdf_engine": "pypdf + pdf2image",
        "database": "postgresql / sqlite fallback",
        "version": settings.VERSION
    }

# Register Routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=f"{settings.API_V1_STR}/jobs")
