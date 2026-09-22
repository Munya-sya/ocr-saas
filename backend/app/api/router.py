import time
import uuid
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from app.core.config import settings
from app.models.schemas import OCRResponse, HealthResponse, LanguagesResponse, LanguageItem
from app.services.validator import validate_upload_file
from app.services.file_manager import temporary_upload_file
from app.services.ocr_engine import process_ocr_request

router = APIRouter()

@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Health check probe endpoint for container orchestration."""
    return HealthResponse()


@router.get("/languages", response_model=LanguagesResponse, tags=["OCR"])
async def list_supported_languages():
    """Returns list of supported OCR language models."""
    langs = [
        LanguageItem(code=code, name=name)
        for code, name in settings.SUPPORTED_LANGUAGES.items()
    ]
    return LanguagesResponse(languages=langs)


@router.post("/ocr", response_model=OCRResponse, tags=["OCR"])
async def extract_text_from_file(
    file: UploadFile = File(...),
    language: str = Form("eng"),
    psm: int = Form(3),
    preprocess_mode: str = Form("auto")
):
    """
    Extracts text from an uploaded image (JPG, PNG, WEBP) or PDF file.
    Validates file signature via magic bytes, applies auto-deskewing, white border padding,
    and adaptive thresholding, performs OCR extraction with configurable language and PSM mode,
    and destroys temporary file upon completion. Never logs raw extracted text.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File parameter is required."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    header_bytes = file_bytes[:512]
    file_size_bytes = len(file_bytes)

    validate_upload_file(
        filename=file.filename,
        header_bytes=header_bytes,
        file_size_bytes=file_size_bytes
    )

    start_time = time.time()
    job_id = str(uuid.uuid4())

    ext = file.filename.rsplit(".", 1)[-1].lower()
    ext_with_dot = f".{ext}"

    with temporary_upload_file(file_bytes, ext_with_dot) as (temp_path, _):
        extracted_text, _ = process_ocr_request(
            file_path=temp_path,
            extension=ext_with_dot,
            language=language,
            psm=psm,
            preprocess_mode=preprocess_mode
        )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)
    safe_name = file.filename.rsplit("/", 1)[-1].rsplit("\\", 1)[-1]

    return OCRResponse(
        jobId=job_id,
        filename=safe_name,
        language=language,
        text=extracted_text,
        processingMs=elapsed_ms
    )
