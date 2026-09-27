import os
import datetime
import uuid
import threading
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import OCRJob, JobStatus
from app.core.config import settings
from app.services.validator import validate_upload_file
from app.worker.tasks import process_ocr_job_async, process_job_pipeline

router = APIRouter()

@router.post("", status_code=status.HTTP_202_ACCEPTED, tags=["Async Jobs"])
async def create_ocr_job(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    psm: int = Form(3),
    preprocess_mode: str = Form("auto"),
    db: Session = Depends(get_db)
):
    """
    Submits a file for asynchronous PDF or batch OCR processing.
    Validates file signature, stores securely in private storage under UUID filename,
    creates database record, dispatches background worker task, and returns job_id.
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

    # Validate OWASP magic byte signature & file size limit
    validate_upload_file(
        filename=file.filename,
        header_bytes=header_bytes,
        file_size_bytes=file_size_bytes
    )

    job_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()
    safe_name = os.path.basename(file.filename)

    os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)
    secure_filename = f"{job_id}{ext}"
    secure_path = os.path.join(settings.TEMP_UPLOAD_DIR, secure_filename)

    with open(secure_path, "wb") as f:
        f.write(file_bytes)

    client_ip = request.client.host if request.client else "unknown"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=settings.RETENTION_HOURS)
    file_type = "pdf" if ext == ".pdf" else "image"

    job = OCRJob(
        job_id=job_id,
        filename=safe_name,
        secure_path=secure_path,
        status=JobStatus.QUEUED,
        file_type=file_type,
        language=language,
        psm=psm,
        preprocess_mode=preprocess_mode,
        ip_address=client_ip,
        expires_at=expires_at
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch to Celery background task if Redis is active, or fallback thread
    try:
        process_ocr_job_async.delay(job_id)
    except Exception:
        # Fallback thread runner for standalone development mode
        thread = threading.Thread(target=process_job_pipeline, args=(job_id,), daemon=True)
        thread.start()

    return {
        "jobId": job_id,
        "filename": safe_name,
        "status": JobStatus.QUEUED.value,
        "message": "OCR job successfully queued for processing."
    }


@router.get("/{job_id}", tags=["Async Jobs"])
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    """Returns status, progress, page count, and metadata for an OCR job."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    return job.to_dict()


@router.get("/{job_id}/result", tags=["Async Jobs"])
async def get_job_result(job_id: str, db: Session = Depends(get_db)):
    """Returns final extracted text for a completed OCR job."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    if job.status == JobStatus.FAILED:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"OCR job failed: {job.error_message or 'Unknown processing error'}"
        )

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OCR job is currently in state '{job.status.value}'. Results available once completed."
        )

    return {
        "jobId": job.job_id,
        "filename": job.filename,
        "status": job.status.value,
        "language": job.language,
        "pageCount": job.page_count,
        "text": job.text_result or "",
        "processingMs": job.processing_ms
    }


@router.delete("/{job_id}", tags=["Async Jobs"])
async def cancel_or_delete_job(job_id: str, db: Session = Depends(get_db)):
    """Cancels a queued/processing job or deletes a completed job's storage file."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    job.status = JobStatus.CANCELLED
    if os.path.exists(job.secure_path):
        try:
            os.remove(job.secure_path)
        except Exception:
            pass

    db.commit()
    return {"jobId": job_id, "status": "cancelled", "message": "Job cancelled and file storage purged."}
