from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import router as api_router
from app.models.schemas import HealthResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production OCR SaaS REST API engine powered by FastAPI and Tesseract OCR."
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Health Probe endpoint (GET /health)
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def root_health_check():
    return HealthResponse()

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "Welcome to OCR SaaS API Server",
        "docs": "/docs",
        "version": settings.VERSION
    }
