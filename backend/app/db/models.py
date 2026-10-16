import enum
import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Enum, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.database import Base

class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_banned = Column(Boolean, default=False, nullable=False)
    plan_tier = Column(Enum(PlanTier), default=PlanTier.FREE, nullable=False)
    stripe_customer_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True, index=True)
    subscription_status = Column(String(50), nullable=True) # active, trialing, past_due, canceled, incomplete, unpaid
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    jobs = relationship("OCRJob", back_populates="user", cascade="all, delete-orphan")
    verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def to_dict(self):
        is_pro = (self.plan_tier == PlanTier.PRO) or (self.plan_tier == "pro")
        return {
            "id": self.id,
            "email": self.email,
            "isVerified": self.is_verified,
            "isAdmin": self.is_admin,
            "isBanned": self.is_banned,
            "planTier": self.plan_tier.value if isinstance(self.plan_tier, PlanTier) else self.plan_tier,
            "stripeCustomerId": self.stripe_customer_id,
            "stripeSubscriptionId": self.stripe_subscription_id,
            "subscriptionStatus": self.subscription_status,
            "currentPeriodEnd": self.current_period_end.isoformat() if self.current_period_end else None,
            "hasAds": not is_pro,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="verification_tokens")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="reset_tokens")

class DailyUsage(Base):
    __tablename__ = "daily_usages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)
    usage_date = Column(Date, default=datetime.date.today, nullable=False, index=True)
    conversion_count = Column(Integer, default=0, nullable=False)
    pages_processed = Column(Integer, default=0, nullable=False)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "description": self.description,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "userEmail": self.user.email if self.user else "Anonymous",
            "ipAddress": self.ip_address,
            "action": self.action,
            "details": self.details,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

class OCRJob(Base):
    __tablename__ = "ocr_jobs"

    job_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
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
    job_token = Column(String(64), nullable=True, index=True)
    processing_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True, index=True)

    user = relationship("User", back_populates="jobs")

    def to_dict(self):
        return {
            "jobId": self.job_id,
            "userId": self.user_id,
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

class ProcessedWebhookEvent(Base):
    __tablename__ = "processed_webhook_events"

    event_id = Column(String(255), primary_key=True, index=True)
    event_type = Column(String(100), nullable=False)
    processed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "eventId": self.event_id,
            "eventType": self.event_type,
            "processedAt": self.processed_at.isoformat() if self.processed_at else None,
        }

class ContactStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    REPLIED = "replied"
    CLOSED = "closed"

class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum(ContactStatus), default=ContactStatus.NEW, nullable=False, index=True)
    admin_notes = Column(Text, nullable=True)
    reply_subject = Column(String(255), nullable=True)
    reply_message = Column(Text, nullable=True)
    replied_at = Column(DateTime, nullable=True)
    replied_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)

    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "ipAddress": self.ip_address,
            "userId": self.user_id,
            "status": self.status.value if isinstance(self.status, ContactStatus) else str(self.status),
            "adminNotes": self.admin_notes,
            "replySubject": self.reply_subject,
            "replyMessage": self.reply_message,
            "repliedAt": self.replied_at.isoformat() if self.replied_at else None,
            "repliedBy": self.replied_by,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

