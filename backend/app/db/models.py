import enum
import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Enum
from app.db.database import Base

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class OCRJob(Base):
    __tablename__ = "ocr_jobs"

    job_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    filename = Column(String(255), nullable=False)
    secure_path = Column(String(512), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED, nullable=False, index=True)
    file_type = Column(String(10), nullable=False, default="pdf")
    language = Column(String(10), default="eng", nullable=False)
    psm = Column(Integer, default=3, nullable=False)
    preprocess_mode = Column(String(20), default="auto", nullable=False)
    page_count = Column(Integer, default=0, nullable=False)
    processed_pages = Column(Integer, default=0, nullable=False)
    text_result = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True, index=True)
    processing_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)

    def to_dict(self):
        return {
            "jobId": self.job_id,
            "filename": self.filename,
            "status": self.status.value if isinstance(self.status, JobStatus) else self.status,
            "fileType": self.file_type,
            "language": self.language,
            "psm": self.psm,
            "preprocessMode": self.preprocess_mode,
            "pageCount": self.page_count,
            "processedPages": self.processed_pages,
            "errorMessage": self.error_message,
            "processingMs": self.processing_ms,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "expiresAt": self.expires_at.isoformat() if self.expires_at else None,
        }
