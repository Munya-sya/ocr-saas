import os
import datetime
import uuid
import secrets
import threading
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import OCRJob, JobStatus, User
from app.core.config import settings
from app.services.validator import validate_upload_file
from app.services.captcha_service import verify_captcha_token
from app.worker.tasks import process_ocr_job_async, process_job_pipeline
from app.api.quota_middleware import get_current_user_optional, check_and_increment_quota, get_client_ip

router = APIRouter()

def verify_job_access(job: OCRJob, user: Optional[User], request: Request) -> OCRJob:
    """
    Enforces strict object-level ownership authorization (prevents BOLA/IDOR & Proxy IP Conflation):
    - Authenticated jobs: only the job owner or an administrator can access or delete.
    - Anonymous jobs: caller must present the secret job_token (via X-Job-Token header,
      query param ?token=, or cookie job_token_<id>). Possession of this 256-bit unguessable
      secret token guarantees genuine ownership without leaking data across shared IPs.
    """
    if user:
        if job.user_id == user.id or user.is_admin:
            return job
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have authorization to access or modify this OCR job."
        )

    # Anonymous job access check
    if job.user_id is None:
        token = (
            request.headers.get("X-Job-Token")
            or request.query_params.get("token")
            or request.cookies.get(f"job_token_{job.job_id}")
        )
        if job.job_token:
            if token and secrets.compare_digest(token, job.job_token):
                return job
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or missing job access token. Anonymous jobs require the secret token provided at creation."
            )
        else:
            # Fallback for legacy jobs created prior to tokenization
            client_ip = get_client_ip(request)
            if job.ip_address == client_ip:
                return job

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have authorization to access or modify this OCR job."
    )

@router.post("", status_code=status.HTTP_202_ACCEPTED, tags=["Async Jobs"])
async def create_ocr_job(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    psm: int = Form(3),
    preprocess_mode: str = Form("auto"),
    captcha_token: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Submits a file for asynchronous PDF or batch OCR processing.
    Enforces Free-plan daily quota limits (3 conversions/day, 10MB max, 5 PDF pages max),
    validates file signature, stores securely in private storage under UUID filename,
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

    # Abuse protection: verify CAPTCHA for anonymous submissions when CAPTCHA is enabled
    if not user:
        client_ip = get_client_ip(request)
        captcha_valid, captcha_msg = verify_captcha_token(captcha_token, client_ip)
        if not captcha_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=captcha_msg
            )

    header_bytes = file_bytes[:512]
    file_size_bytes = len(file_bytes)

    # Validate OWASP magic byte signature
    validate_upload_file(
        filename=file.filename,
        header_bytes=header_bytes,
        file_size_bytes=file_size_bytes
    )

    # Enforce daily quota & page limits
    ext = os.path.splitext(file.filename)[1].lower()
    pdf_pages_estimate = 1
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(file_bytes))
            pdf_pages_estimate = len(reader.pages)
        except Exception:
            pdf_pages_estimate = 1

    check_and_increment_quota(
        request=request,
        file_size_bytes=file_size_bytes,
        pdf_pages_count=pdf_pages_estimate,
        user=user,
        db=db
    )

    job_id = str(uuid.uuid4())
    safe_name = os.path.basename(file.filename)

    os.makedirs(settings.TEMP_UPLOAD_DIR, exist_ok=True)
    secure_filename = f"{job_id}{ext}"
    secure_path = os.path.join(settings.TEMP_UPLOAD_DIR, secure_filename)

    with open(secure_path, "wb") as f:
        f.write(file_bytes)

    client_ip = get_client_ip(request)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=settings.RETENTION_HOURS)
    file_type = "pdf" if ext == ".pdf" else "image"
    job_token = secrets.token_urlsafe(32)

    job = OCRJob(
        job_id=job_id,
        user_id=user.id if user else None,
        filename=safe_name,
        secure_path=secure_path,
        status=JobStatus.QUEUED,
        file_type=file_type,
        language=language,
        psm=psm,
        preprocess_mode=preprocess_mode,
        ip_address=client_ip,
        job_token=job_token,
        expires_at=expires_at
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    # Dispatch to Celery background task if Redis is active, or fallback thread
    try:
        process_ocr_job_async.delay(job_id)
    except Exception:
        thread = threading.Thread(target=process_job_pipeline, args=(job_id,), daemon=True)
        thread.start()

    response_payload = {
        "jobId": job_id,
        "jobToken": job_token,
        "filename": safe_name,
        "status": JobStatus.QUEUED.value,
        "message": "OCR job successfully queued for processing."
    }
    json_resp = JSONResponse(content=response_payload, status_code=status.HTTP_202_ACCEPTED)
    # Set secure HTTP cookie for the created job to enable seamless browser status polling
    json_resp.set_cookie(
        key=f"job_token_{job_id}",
        value=job_token,
        max_age=settings.RETENTION_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE
    )
    return json_resp


@router.get("", tags=["Async Jobs"])
async def list_recent_jobs(
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Lists recent OCR jobs for the authenticated user only.
    Anonymous jobs are never listed by IP to prevent proxy IP conflation information disclosure.
    """
    if not user:
        return []

    jobs = db.query(OCRJob).filter(OCRJob.user_id == user.id).order_by(OCRJob.created_at.desc()).limit(20).all()
    return [job.to_dict() for job in jobs]


@router.get("/{job_id}", tags=["Async Jobs"])
async def get_job_status(
    job_id: str,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Returns status, progress, page count, and metadata for an OCR job."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    verify_job_access(job, user, request)
    return job.to_dict()


@router.get("/{job_id}/result", tags=["Async Jobs"])
async def get_job_result(
    job_id: str,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Returns final extracted text for a completed OCR job."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    verify_job_access(job, user, request)

    current_status = job.status.value if hasattr(job.status, 'value') else str(job.status)

    if current_status == JobStatus.FAILED.value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"OCR job failed: {job.error_message or 'Unknown processing error'}"
        )

    if current_status != JobStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OCR job is currently in state '{current_status}'. Results available once completed."
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
async def cancel_or_delete_job(
    job_id: str,
    request: Request,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Cancels a queued/processing job or deletes a completed job's storage file."""
    job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OCR job '{job_id}' not found."
        )

    verify_job_access(job, user, request)

    job.status = JobStatus.CANCELLED
    if os.path.exists(job.secure_path):
        try:
            os.remove(job.secure_path)
        except Exception:
            pass

    db.commit()
    return {"jobId": job_id, "status": "cancelled", "message": "Job cancelled and file storage purged."}
