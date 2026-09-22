from pydantic import BaseModel, Field

class OCRResponse(BaseModel):
    jobId: str = Field(..., description="Unique UUID for the OCR job")
    filename: str = Field(..., description="Safe filename or secure identifier")
    language: str = Field(..., description="Language code used for extraction")
    text: str = Field(..., description="Extracted OCR plain text output")
    processingMs: float = Field(..., description="Processing duration in milliseconds")

class HealthResponse(BaseModel):
    status: str = "healthy"
    ocr_engine: str = "tesseract 5.x"
    version: str = "1.0.0"

class LanguageItem(BaseModel):
    code: str
    name: str

class LanguagesResponse(BaseModel):
    languages: list[LanguageItem]
