import os
import time
import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User, ContactMessage, ContactStatus
from app.core.config import settings
from app.models.schemas import OCRResponse, HealthResponse, LanguagesResponse, LanguageItem
from app.services.validator import validate_upload_file
from app.services.file_manager import temporary_upload_file
from app.services.ocr_engine import process_ocr_request
from app.services.captcha_service import verify_captcha_token
from app.services.email_service import send_contact_confirmation_email, send_admin_new_inquiry_alert
from app.api.quota_middleware import get_current_user_optional, check_and_increment_quota, get_client_ip, enforce_distributed_rate_limit

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


@router.get("/config/ads", tags=["System"])
def get_public_ad_config(db: Session = Depends(get_db)):
    """Returns public AdSense configuration for Free/Anonymous tiers."""
    from app.db.models import SystemSetting
    settings_map = {s.key: s.value for s in db.query(SystemSetting).all()}
    enabled_str = settings_map.get("ADSENSE_ENABLED", str(getattr(settings, "ADSENSE_ENABLED", False)))
    return {
        "adsenseEnabled": str(enabled_str).lower() == "true",
        "clientId": settings_map.get("ADSENSE_CLIENT_ID", getattr(settings, "ADSENSE_CLIENT_ID", "")),
        "slotBelowUpload": settings_map.get("ADSENSE_SLOT_BELOW_UPLOAD", getattr(settings, "ADSENSE_SLOT_BELOW_UPLOAD", "")),
        "slotBelowResults": settings_map.get("ADSENSE_SLOT_BELOW_RESULTS", getattr(settings, "ADSENSE_SLOT_BELOW_RESULTS", "")),
    }


class ContactFormSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = Field(..., min_length=2, max_length=200)
    message: str = Field(..., min_length=10, max_length=5000)
    captchaToken: Optional[str] = None


def check_contact_rate_limit(request: Request, max_per_hour: int = 10):
    client_ip = get_client_ip(request)
    enforce_distributed_rate_limit(
        key=f"contact:{client_ip}",
        max_attempts=max_per_hour,
        window_seconds=3600,
        error_message="Too many inquiries submitted from your IP address. Please wait before sending another message."
    )


@router.post("/contact", tags=["Support"])
async def submit_contact_form(
    request: Request,
    payload: ContactFormSchema,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Public Contact Us endpoint:
    - Validates message payload and optional CAPTCHA
    - Applies abuse rate-limiting
    - Persists message to database
    - Sends automated confirmation email to the sender
    """
    client_ip = get_client_ip(request)
    check_contact_rate_limit(request)

    captcha_valid, captcha_msg = verify_captcha_token(payload.captchaToken, client_ip)
    if not captcha_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=captcha_msg
        )

    contact_msg = ContactMessage(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        subject=payload.subject.strip(),
        message=payload.message.strip(),
        ip_address=client_ip,
        user_id=user.id if user else None,
        status=ContactStatus.NEW
    )
    db.add(contact_msg)
    db.commit()
    db.refresh(contact_msg)

    # Dispatch confirmation email via SMTP
    try:
        send_contact_confirmation_email(
            to_email=contact_msg.email,
            name=contact_msg.name,
            subject_text=contact_msg.subject
        )
    except Exception as e:
        print(f"[ContactForm Warning] Could not send confirmation email: {e}")

    # Dispatch compact admin notification
    try:
        send_admin_new_inquiry_alert(
            inquiry_id=contact_msg.id,
            sender_name=contact_msg.name,
            sender_email=contact_msg.email,
            subject_text=contact_msg.subject,
            message_preview=contact_msg.message
        )
    except Exception as e:
        print(f"[Admin Inquiry Alert Warning] {e}")

    return {
        "message": "Thank you! Your message has been received. Our team will review and reply to your email shortly.",
        "messageId": contact_msg.id
    }


@router.post("/ocr", response_model=OCRResponse, tags=["OCR"])
async def extract_text_from_file(
    request: Request,
    file: UploadFile = File(...),
    language: str = Form("eng"),
    psm: int = Form(3),
    preprocess_mode: str = Form("auto"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
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

    # Enforce daily conversion quota and page limits for logged in user / IP
    ext = os.path.splitext(file.filename)[1].lower()
    pdf_pages_estimate = 1
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            import io
            reader = PdfReader(io.BytesIO(file_bytes))
            pdf_pages_estimate = len(reader.pages)
            if pdf_pages_estimate > settings.FREE_MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Synchronous OCR is limited to {settings.FREE_MAX_PDF_PAGES} PDF pages to prevent server starvation. Please submit multi-page documents ({pdf_pages_estimate} pages) to the asynchronous /api/v1/jobs endpoint."
                )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Corrupted or invalid PDF file header."
            )

    check_and_increment_quota(
        request=request,
        file_size_bytes=file_size_bytes,
        pdf_pages_count=pdf_pages_estimate,
        user=user,
        db=db
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


class InboundEmailPayload(BaseModel):
    from_email: Optional[str] = Field(None, alias="from")
    to_email: Optional[str] = Field(None, alias="to")
    sender: Optional[str] = None
    subject: Optional[str] = ""
    text: Optional[str] = ""
    rawEmail: Optional[str] = None
    raw_email: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow" 


@router.post("/support/inbound-webhook", tags=["Support"])
async def inbound_support_email_webhook(
    payload: InboundEmailPayload,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Receives incoming customer email replies forwarded by Cloudflare Email Worker,
    identifies the associated support inquiry by [Ticket #ID], and appends the response
    to the conversation thread in the database.
    """
    import re
    import json
    import os

    # 1. Verify shared secret if configured
    inbound_secret = os.getenv("INBOUND_EMAIL_SECRET", "scantext-inbound-secret-2026")
    client_secret = request.headers.get("X-Inbound-Secret") or request.query_params.get("secret")
    if client_secret and client_secret != inbound_secret:
        raise HTTPException(status_code=403, detail="Invalid inbound webhook secret.")

    sender_email = (payload.from_email or payload.sender or "").strip().lower()
    email_match = re.search(r'[\w\.-]+@[\w\.-]+', sender_email)
    if email_match:
        sender_email = email_match.group(0)

    subject = payload.subject or ""
    body_text = payload.text or ""
    raw_content = payload.rawEmail or payload.raw_email or ""
    if not body_text and raw_content:
        body_text = raw_content[:4000]

    # Clean quoted history if present (e.g. 'On Wed, Oct 21 ... wrote:')
    cleaned_reply = re.split(r'\n\s*On .* wrote:|\n\s*--- Original Message ---|\n\s*> ', body_text)[0].strip()
    if not cleaned_reply:
        cleaned_reply = body_text.strip() or "(Empty email reply)"

    # 2. Look for ticket ID in subject: [Ticket #XXXXXXXX]
    ticket_match = re.search(r'\[Ticket\s*#?([a-f0-9\-]+)\]', subject, re.I)
    target_msg = None

    if ticket_match:
        ticket_id = ticket_match.group(1).strip()
        target_msg = db.query(ContactMessage).filter(ContactMessage.id.startswith(ticket_id)).first()

    # Fallback to most recent open contact message from sender
    if not target_msg and sender_email:
        target_msg = db.query(ContactMessage).filter(
            ContactMessage.email == sender_email
        ).order_by(ContactMessage.created_at.desc()).first()

    now_iso = datetime.datetime.utcnow().isoformat()

    if target_msg:
        try:
            history = json.loads(target_msg.thread_history) if target_msg.thread_history else []
        except Exception:
            history = []

        if not history:
            history.append({
                "sender": "customer",
                "name": target_msg.name,
                "email": target_msg.email,
                "message": target_msg.message,
                "timestamp": target_msg.created_at.isoformat() if target_msg.created_at else now_iso
            })
            if target_msg.reply_message:
                history.append({
                    "sender": "staff",
                    "name": "ScanText Support",
                    "email": target_msg.replied_by or "inquiry@scantext.dev",
                    "message": target_msg.reply_message,
                    "timestamp": target_msg.replied_at.isoformat() if target_msg.replied_at else now_iso
                })

        history.append({
            "sender": "customer",
            "name": target_msg.name,
            "email": sender_email,
            "message": cleaned_reply,
            "timestamp": now_iso
        })

        target_msg.thread_history = json.dumps(history)
        target_msg.status = ContactStatus.NEW  # Alert admin by setting status back to NEW
        target_msg.updated_at = datetime.datetime.utcnow()
        db.commit()

        try:
            send_admin_new_inquiry_alert(
                inquiry_id=target_msg.id,
                sender_name=f"{target_msg.name} (Reply to Ticket #{target_msg.id[:8]})",
                sender_email=sender_email,
                subject_text=f"Re: {target_msg.subject}",
                message_preview=cleaned_reply
            )
        except Exception as e:
            print(f"[Inbound Webhook Alert Error] {e}")

        return {
            "success": True,
            "action": "appended_to_thread",
            "ticketId": target_msg.id,
            "message": f"Successfully synced customer reply into Ticket #{target_msg.id[:8]}."
        }
    else:
        # Create a brand new inquiry record if no matching ticket
        new_msg = ContactMessage(
            name=sender_email.split('@')[0],
            email=sender_email,
            subject=subject or "Inbound Support Message",
            message=cleaned_reply,
            status=ContactStatus.NEW,
            thread_history=json.dumps([{
                "sender": "customer",
                "name": sender_email.split('@')[0],
                "email": sender_email,
                "message": cleaned_reply,
                "timestamp": now_iso
            }])
        )
        db.add(new_msg)
        db.commit()
        db.refresh(new_msg)

        try:
            send_admin_new_inquiry_alert(
                inquiry_id=new_msg.id,
                sender_name=new_msg.name,
                sender_email=sender_email,
                subject_text=new_msg.subject,
                message_preview=cleaned_reply
            )
        except Exception:
            pass

        return {
            "success": True,
            "action": "created_new_ticket",
            "ticketId": new_msg.id
        }
