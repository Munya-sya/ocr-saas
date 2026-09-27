import os
import time
import datetime
from PIL import Image
from app.worker.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.models import OCRJob, JobStatus
from app.core.config import settings
from app.services.pdf_engine import process_pdf_file
from app.services.ocr_engine import perform_ocr_on_pil_image

def process_job_pipeline(job_id: str):
    """Executes OCR job pipeline synchronously inside worker context."""
    db = SessionLocal()
    start_time = time.time()

    try:
        job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
        if not job:
            return

        if job.status == JobStatus.CANCELLED:
            return

        # Update status to processing
        job.status = JobStatus.PROCESSING
        job.updated_at = datetime.datetime.utcnow()
        db.commit()

        if not os.path.exists(job.secure_path):
            job.status = JobStatus.FAILED
            job.error_message = f"Storage file missing at path '{job.secure_path}'"
            db.commit()
            return

        ext = os.path.splitext(job.secure_path)[1].lower()

        if ext == ".pdf":
            def update_progress(page_num, total_pages):
                job.processed_pages = page_num
                job.page_count = total_pages
                db.commit()

            text, total_pages = process_pdf_file(
                file_path=job.secure_path,
                language=job.language,
                psm=job.psm,
                preprocess_mode=job.preprocess_mode,
                on_page_complete=update_progress
            )
            job.page_count = total_pages
            job.processed_pages = total_pages
            job.text_result = text

        else:
            # Single Image File
            with Image.open(job.secure_path) as pil_img:
                text = perform_ocr_on_pil_image(
                    pil_img,
                    language=job.language,
                    psm=job.psm,
                    preprocess_mode=job.preprocess_mode
                )
            job.page_count = 1
            job.processed_pages = 1
            job.text_result = text

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        job.processing_ms = elapsed_ms
        job.status = JobStatus.COMPLETED
        job.updated_at = datetime.datetime.utcnow()
        db.commit()

    except Exception as err:
        db.rollback()
        job = db.query(OCRJob).filter(OCRJob.job_id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(err)
            job.updated_at = datetime.datetime.utcnow()
            db.commit()
    finally:
        db.close()


@celery_app.task(name="app.worker.tasks.process_ocr_job_async")
def process_ocr_job_async(job_id: str):
    """Celery background task wrapper for processing OCR jobs."""
    process_job_pipeline(job_id)


@celery_app.task(name="app.worker.tasks.cleanup_expired_jobs")
def cleanup_expired_jobs():
    """Periodic Celery task for purging expired job files and database records."""
    db = SessionLocal()
    now = datetime.datetime.utcnow()
    try:
        expired_jobs = db.query(OCRJob).filter(OCRJob.expires_at <= now).all()
        for job in expired_jobs:
            if os.path.exists(job.secure_path):
                try:
                    os.remove(job.secure_path)
                except Exception:
                    pass
            job.status = JobStatus.EXPIRED
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
