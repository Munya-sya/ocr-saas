import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

from app.db.database import SessionLocal
from app.db.models import SystemSetting

def get_smtp_settings():
    """Fetches dynamic SMTP settings from database SystemSetting table with config.py fallback."""
    db = SessionLocal()
    try:
        settings_map = {s.key: s.value for s in db.query(SystemSetting).all()}
        smtp_host = settings_map.get("SMTP_HOST", settings.SMTP_HOST)
        smtp_port_str = settings_map.get("SMTP_PORT", str(settings.SMTP_PORT))
        try:
            smtp_port = int(smtp_port_str)
        except ValueError:
            smtp_port = 1025

        smtp_user = settings_map.get("SMTP_USER", settings.SMTP_USER)
        smtp_pass = settings_map.get("SMTP_PASSWORD", settings.SMTP_PASSWORD)
        from_email = settings_map.get("EMAILS_FROM_EMAIL", settings.EMAILS_FROM_EMAIL) or "noreply@scantext-ocr.com"

        return smtp_host, smtp_port, smtp_user, smtp_pass, from_email
    except Exception as e:
        print(f"[EmailService Warning] Failed to query DB settings: {e}")
        return settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD, settings.EMAILS_FROM_EMAIL
    finally:
        db.close()

def send_smtp_email(to_email: str, subject: str, html_content: str) -> tuple[bool, str]:
    """
    Sends email over SMTP using dynamic DB settings. Connects to local Mailpit (1025),
    TLS servers (Port 587) with STARTTLS and EHLO handshakes, or SSL servers (Port 465).
    Returns (success: bool, message: str).
    """
    smtp_host, smtp_port, smtp_user, smtp_pass, from_email = get_smtp_settings()
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{from_email}>"
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        print(f"[EmailService] Connecting to SMTP server {smtp_host}:{smtp_port} for recipient {to_email}...")
        
        # SSL connection for Port 465
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            if smtp_port == 587 or "gmail.com" in smtp_host.lower():
                server.ehlo()
                server.starttls()
                server.ehlo()

        # Envelope sender for SMTP protocol handshake
        envelope_from = smtp_user if (smtp_host.lower() == "smtp.gmail.com" and smtp_user) else from_email

        with server:
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)

            server.sendmail(envelope_from, [to_email], msg.as_string())
            print(f"[EmailService Success] Email successfully sent to {to_email} via {smtp_host}:{smtp_port}!")
            return True, f"Email successfully sent to {to_email} via {smtp_host}:{smtp_port}."
    except smtplib.SMTPAuthenticationError as ae:
        err_detail = ae.smtp_error.decode("utf-8", errors="ignore") if hasattr(ae, "smtp_error") and isinstance(ae.smtp_error, bytes) else str(ae)
        error_msg = f"SMTP Authentication failed: {err_detail}."
        if "gmail" in smtp_host.lower() or "535" in str(ae):
            error_msg += " For Gmail, you must generate a 16-character Google App Password (not your account password) with 2-Step Verification enabled."
        print(f"[EmailService Error] {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Failed to send email to {to_email} via {smtp_host}:{smtp_port}: {str(e)}"
        print(f"[EmailService Error] {error_msg}")
        return False, error_msg

def send_verification_email(to_email: str, token: str):
    """Sends account verification link to user."""
    verify_url = f"{settings.FRONTEND_URL}/login?verify={token}"
    subject = "Verify Your ScanText OCR Account"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Welcome to ScanText OCR!</h2>
        <p>Please click the button below to verify your email address and activate your account:</p>
        <div style="margin: 30px 0;">
            <a href="{verify_url}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:<br/><a href="{verify_url}">{verify_url}</a></p>
    </div>
    """
    send_smtp_email(to_email, subject, html_content)

def send_password_reset_email(to_email: str, token: str):
    """Sends single-use password reset link to user."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "Reset Your ScanText OCR Password"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #dc2626;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <div style="margin: 30px 0;">
            <a href="{reset_url}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This token expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
    </div>
    """
    send_smtp_email(to_email, subject, html_content)

def send_contact_confirmation_email(to_email: str, name: str, subject_text: str):
    """Sends an automated confirmation acknowledging receipt of a contact inquiry."""
    subject = f"We received your message: {subject_text}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Thank You for Contacting ScanText OCR</h2>
        <p>Hi {name or 'there'},</p>
        <p>We wanted to let you know that we received your message regarding <strong>"{subject_text}"</strong>.</p>
        <p>Our support and technical team is reviewing your inquiry and will respond directly to this email address as soon as possible.</p>
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
            <p>Best regards,<br/><strong>ScanText OCR Support Team</strong></p>
        </div>
    </div>
    """
    send_smtp_email(to_email, subject, html_content)

def send_contact_reply_email(to_email: str, recipient_name: str, original_subject: str, reply_body: str, custom_subject: str | None = None):
    """Sends the administrator's reply directly to the user who contacted support."""
    subject = custom_subject or f"Re: {original_subject}"
    # Format line breaks in reply_body for HTML
    formatted_body = "<br/>".join(reply_body.replace("\r\n", "\n").split("\n"))
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">ScanText Support Response</h2>
        <p>Hi {recipient_name or 'there'},</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; line-height: 1.6; color: #1e293b;">
            {formatted_body}
        </div>
        <p style="color: #64748b; font-size: 13px;">Regarding your inquiry: <em>"{original_subject}"</em></p>
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
            <p>If you have any further questions, feel free to reply to this message.<br/><strong>ScanText OCR Technical Support</strong></p>
        </div>
    </div>
    """
    return send_smtp_email(to_email, subject, html_content)

