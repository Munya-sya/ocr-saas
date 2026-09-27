import os
from typing import List, Dict, Set
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ScanText OCR SaaS API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # Security & Limits
    MAX_FILE_SIZE_MB: int = 10
    MAX_PDF_MB: int = 50
    MAX_PDF_PAGES: int = 100
    OCR_TIMEOUT_SECONDS: int = 300
    MAX_JOBS_PER_IP_PER_HOUR: int = 30
    RETENTION_HOURS: int = 24

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
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://ocr_user:ocr_password@postgres:5432/ocr_db")
    SQLITE_FALLBACK_URL: str = os.getenv("SQLITE_FALLBACK_URL", "sqlite:///./ocr_jobs.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379/0")

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
