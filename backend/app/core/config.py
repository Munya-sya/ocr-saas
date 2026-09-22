import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OCR SaaS API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Configuration via Environment Variables
    MAX_FILE_SIZE_MB: int = 10
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "tesseract")
    TEMP_DIR: str = os.getenv("TEMP_DIR", "/tmp/ocr_uploads")
    
    # Allowed File Specifications
    ALLOWED_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    ALLOWED_MIME_TYPES: set[str] = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    }

    # Supported OCR languages
    SUPPORTED_LANGUAGES: dict[str, str] = {
        "eng": "English",
        "deu": "German",
        "fra": "French",
        "spa": "Spanish"
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
