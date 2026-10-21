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
        from_email = settings_map.get("EMAILS_FROM_EMAIL", settings.EMAILS_FROM_EMAIL) or "noreply@scantext.dev"

        return smtp_host, smtp_port, smtp_user, smtp_pass, from_email
    except Exception as e:
        print(f"[EmailService Warning] Failed to query DB settings: {e}")
        return settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD, settings.EMAILS_FROM_EMAIL
    finally:
        db.close()

def send_smtp_email(to_email: str, subject: str, html_content: str, from_address: str = None, reply_to: str = None) -> tuple[bool, str]:
    """
    Sends email over SMTP using dynamic DB settings. Connects to local Mailpit (1025),
    TLS servers (Port 587) with STARTTLS and EHLO handshakes, or SSL servers (Port 465).
    Gracefully handles custom domain masking and Reply-To routing.
    Returns (success: bool, message: str).
    """
    smtp_host, smtp_port, smtp_user, smtp_pass, from_email_default = get_smtp_settings()
    try:
        from_email = from_address or from_email_default or "noreply@scantext.dev"
        is_gmail = "gmail.com" in smtp_host.lower()

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject

        # Always use the branded sender address (e.g. inquiry@scantext.dev)
        sender_display_name = "ScanText Support" if ("inquiry" in from_email or "support" in from_email) else settings.EMAILS_FROM_NAME
        msg["From"] = f"{sender_display_name} <{from_email}>"

        if reply_to:
            msg["Reply-To"] = reply_to
        elif from_address:
            msg["Reply-To"] = from_address
        else:
            msg["Reply-To"] = "inquiry@scantext.dev"

        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        print(f"[EmailService] Connecting to SMTP server {smtp_host}:{smtp_port} for recipient {to_email}...")
        
        # SSL connection for Port 465
        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            if smtp_port == 587 or is_gmail:
                server.ehlo()
                server.starttls()
                server.ehlo()

        # Envelope sender for SMTP protocol handshake
        envelope_from = smtp_user if (is_gmail and smtp_user) else from_email

        with server:
            if smtp_user and smtp_pass:
                # Strip spaces automatically from App Passwords
                clean_pass = smtp_pass.replace(" ", "")
                server.login(smtp_user, clean_pass)

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
    """Sends account verification link to user from noreply@scantext.dev."""
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
    send_smtp_email(to_email, subject, html_content, from_address="noreply@scantext.dev", reply_to="noreply@scantext.dev")

def send_password_reset_email(to_email: str, token: str):
    """Sends single-use password reset link to user from noreply@scantext.dev."""
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
    send_smtp_email(to_email, subject, html_content, from_address="noreply@scantext.dev", reply_to="noreply@scantext.dev")

def send_contact_confirmation_email(to_email: str, name: str, subject_text: str, ticket_id: str | None = None):
    """Sends an automated confirmation acknowledging receipt of a contact inquiry from inquiry@scantext.dev."""
    ticket_tag = f"[Ticket #{ticket_id[:8]}] " if ticket_id else ""
    subject = f"{ticket_tag}We received your message: {subject_text}"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb;">Thank You for Contacting ScanText OCR</h2>
        <p>Hi {name or 'there'},</p>
        <p>We wanted to let you know that we received your message regarding <strong>"{subject_text}"</strong>.</p>
        <p>Our support and technical team is reviewing your inquiry and will respond directly to this email address as soon as possible.</p>
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">
            <p>Best regards,<br/><strong>ScanText OCR Technical Support</strong> &bull; inquiry@scantext.dev</p>
            <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Reference: {ticket_tag.strip() or 'Ticket'}</p>
        </div>
    </div>
    """
    return send_smtp_email(to_email, subject, html_content, from_address="inquiry@scantext.dev", reply_to="inquiry@scantext.dev")

def send_contact_reply_email(to_email: str, recipient_name: str, original_subject: str, reply_body: str, custom_subject: str | None = None, ticket_id: str | None = None):
    """Sends the administrator's reply directly to the user with Reply-To set to inquiry@scantext.dev."""
    ticket_tag = f"[Ticket #{ticket_id[:8]}] " if ticket_id else ""
    if custom_subject:
        subject = custom_subject if "[Ticket" in custom_subject else f"{ticket_tag}{custom_subject}"
    else:
        clean_subj = original_subject
        if "[Ticket" in clean_subj:
            import re
            clean_subj = re.sub(r'\[Ticket\s*#[a-f0-9\-]+\]\s*', '', clean_subj, flags=re.I).strip()
        subject = f"Re: {ticket_tag}{clean_subj}"
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
            <p>You can reply directly to this email to continue the conversation.<br/><strong>ScanText OCR Technical Support &bull; inquiry@scantext.dev</strong></p>
        </div>
    </div>
    """
    return send_smtp_email(to_email, subject, html_content, from_address="inquiry@scantext.dev", reply_to="inquiry@scantext.dev")

def get_admin_recipient_email() -> str:
    """Finds the primary administrator email address for receiving system alerts."""
    db = SessionLocal()
    try:
        from app.db.models import User
        setting = db.query(SystemSetting).filter(SystemSetting.key == "ADMIN_ALERT_EMAIL").first()
        if setting and setting.value and "@" in setting.value:
            return setting.value.strip()

        admin_user = db.query(User).filter(User.is_admin == True).first()
        if admin_user and admin_user.email:
            return admin_user.email.strip()

        return settings.INITIAL_ADMIN_EMAIL or "kennedyjr4323@gmail.com"
    except Exception as e:
        print(f"[EmailService Warning] Failed to query admin email: {e}")
        return "kennedyjr4323@gmail.com"
    finally:
        db.close()

def send_admin_new_inquiry_alert(inquiry_id: str, sender_name: str, sender_email: str, subject_text: str, message_preview: str):
    """Sends a clean, compact notification to the Admin that a customer sent a message."""
    admin_email = get_admin_recipient_email()
    subject = f"[ScanText Alert] 💬 New Inquiry from {sender_name}: {subject_text[:50]}"
    admin_url = f"{settings.FRONTEND_URL}/admin"
    clean_preview = (message_preview[:280] + "...") if len(message_preview) > 280 else message_preview
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #4f46e5; margin-top: 0;">New Support Inquiry Received</h3>
        <p style="font-size: 14px; color: #334155;">A user just submitted an inquiry on ScanText OCR:</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 15px 0; border-radius: 4px; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Sender:</strong> {sender_name} (&lt;{sender_email}&gt;)</p>
            <p style="margin: 4px 0;"><strong>Subject:</strong> {subject_text}</p>
            <p style="margin: 4px 0; color: #475569;"><strong>Message:</strong></p>
            <p style="margin: 6px 0; font-style: italic; color: #1e293b;">"{clean_preview}"</p>
        </div>
        <div style="margin: 25px 0;">
            <a href="{admin_url}" style="background-color: #4f46e5; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Open Inquiries in Admin Console</a>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin-bottom: 0;">Inquiry ID: {inquiry_id} &bull; All conversations are stored in your ScanText App.</p>
    </div>
    """
    send_smtp_email(admin_email, subject, html_content, from_address="noreply@scantext.dev", reply_to=sender_email)

def send_admin_new_user_alert(user_email: str, plan_tier: str):
    """Sends a notification to the Admin when a new user registers."""
    import datetime
    admin_email = get_admin_recipient_email()
    subject = f"[ScanText Alert] 👤 New User Joined: {user_email}"
    admin_url = f"{settings.FRONTEND_URL}/admin"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #059669; margin-top: 0;">New User Registration</h3>
        <p style="font-size: 14px; color: #334155;">A new account was just created on ScanText OCR:</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 12px 16px; margin: 15px 0; border-radius: 4px; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Email:</strong> {user_email}</p>
            <p style="margin: 4px 0;"><strong>Tier:</strong> {plan_tier.upper()}</p>
            <p style="margin: 4px 0;"><strong>Time:</strong> {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        </div>
        <div style="margin: 20px 0;">
            <a href="{admin_url}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Manage Users in Admin Console</a>
        </div>
    </div>
    """
    send_smtp_email(admin_email, subject, html_content, from_address="noreply@scantext.dev", reply_to="noreply@scantext.dev")

def send_admin_job_failure_alert(job_id: str, filename: str, error_msg: str):
    """Sends an alert when an OCR queue job encounters a processing failure."""
    admin_email = get_admin_recipient_email()
    subject = f"[ScanText Alert] ⚠️ OCR Job Failed: {job_id[:8]}"
    admin_url = f"{settings.FRONTEND_URL}/admin"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #dc2626; margin-top: 0;">OCR Processing Error Encountered</h3>
        <p style="font-size: 14px; color: #334155;">An asynchronous OCR background job failed:</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 15px 0; border-radius: 4px; font-size: 13px;">
            <p style="margin: 4px 0;"><strong>Job ID:</strong> {job_id}</p>
            <p style="margin: 4px 0;"><strong>Document:</strong> {filename}</p>
            <p style="margin: 4px 0; color: #b91c1c;"><strong>Error Details:</strong> {error_msg}</p>
        </div>
        <div style="margin: 20px 0;">
            <a href="{admin_url}" style="background-color: #dc2626; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Inspect OCR Queue & Status</a>
        </div>
    </div>
    """
    send_smtp_email(admin_email, subject, html_content, from_address="noreply@scantext.dev", reply_to="noreply@scantext.dev")

def send_admin_daily_summary_report():
    """Compiles a 24-hour summary of SaaS activity and emails the administrator."""
    import datetime
    db = SessionLocal()
    admin_email = get_admin_recipient_email()
    try:
        from app.db.models import User, OCRJob, JobStatus, ContactMessage, ContactStatus
        now = datetime.datetime.utcnow()
        yesterday = now - datetime.timedelta(days=1)

        total_users = db.query(User).count()
        new_users_24h = db.query(User).filter(User.created_at >= yesterday).count()

        jobs_24h = db.query(OCRJob).filter(OCRJob.created_at >= yesterday).count()
        completed_24h = db.query(OCRJob).filter(OCRJob.created_at >= yesterday, OCRJob.status == JobStatus.COMPLETED).count()
        failed_24h = db.query(OCRJob).filter(OCRJob.created_at >= yesterday, OCRJob.status == JobStatus.FAILED).count()

        new_inquiries = db.query(ContactMessage).filter(ContactMessage.status == ContactStatus.NEW).count()

        today_str = now.strftime('%Y-%m-%d')
        subject = f"[ScanText Daily Report] 📊 {today_str}: {completed_24h} Conversions, {new_users_24h} New Users"
        admin_url = f"{settings.FRONTEND_URL}/admin"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="color: #2563eb; margin-top: 0;">ScanText OCR Daily Performance Report</h3>
            <p style="font-size: 13px; color: #64748b;">Summary for {today_str} (Past 24 Hours):</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px; text-align: left;">Metric</th>
                    <th style="padding: 10px; text-align: right;">Count</th>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; color: #334155;">Total Documents Processed</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #0284c7;">{jobs_24h}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; color: #334155;">Successful Conversions</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #16a34a;">{completed_24h}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; color: #334155;">Failed OCR Jobs</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: {'#dc2626' if failed_24h > 0 else '#16a34a'};">{failed_24h}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; color: #334155;">New User Registrations</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #4f46e5;">+{new_users_24h}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; color: #334155;">Total Registered Members</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: #1e293b;">{total_users}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; color: #334155;">Pending Customer Inquiries</td>
                    <td style="padding: 10px; text-align: right; font-weight: bold; color: {'#ea580c' if new_inquiries > 0 else '#64748b'};">{new_inquiries}</td>
                </tr>
            </table>

            <div style="margin: 20px 0;">
                <a href="{admin_url}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">Open Production Admin Console</a>
            </div>
        </div>
        """
        send_smtp_email(admin_email, subject, html_content, from_address="noreply@scantext.dev", reply_to="noreply@scantext.dev")
    except Exception as e:
        print(f"[Daily Summary Error] {e}")
    finally:
        db.close()
