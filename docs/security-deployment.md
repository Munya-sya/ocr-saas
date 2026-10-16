# Security Architecture & Production Deployment Guide

## 1. Security Architecture & Threat Mitigation

### Binary Magic Byte Validation
To protect against malicious arbitrary file uploads (e.g. executable scripts disguised with fake image extensions), the backend checks the raw binary header bytes before processing:
- **JPEG**: Magic signature `\xFF\xD8\xFF`
- **PNG**: Magic signature `\x89PNG\r\n\x1a\n`
- **WEBP**: Header `RIFF` + `WEBP`
- **PDF**: Header `%PDF-`

If the signature does not match the extension or is unrecognized, the server immediately rejects the file with `HTTP 400 Bad Request`.

### Ephemeral Storage & Zero Retention Model
1. Uploaded files are converted into random UUID v4 filenames (e.g. `9f3c5b74-1234-4567-89ab-cdef01234567.tmp`).
2. Original filenames and upload paths are never written to disk or exposed in API logs.
3. Temporary files are stored in `/tmp/ocr_uploads/`.
4. Python `try...finally` context managers and FastAPI background handlers strictly execute `os.remove(file_path)` immediately after OCR text extraction completes.

### Zero-Plaintext Secret Protection
1. **Dynamic Setting Masking**: All sensitive secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SMTP_PASSWORD`, `GOOGLE_CLIENT_SECRET`) are masked before transmission to the frontend (`sk_test_••••••••`).
2. **Preservation on Submit**: When saving settings in the Admin Console, any payload containing masking characters (`••••`) preserves the active stored key untouched in PostgreSQL. Secrets are only modified when an administrator explicitly supplies a new unmasked string.
3. **Database Security**: Setting overrides are stored in the PostgreSQL `system_settings` table, falling back to read-only `.env` defaults when unset.

### Stripe Webhook HMAC Signature & Idempotency
1. **Cryptographic Validation**: Webhook requests to `/api/v1/stripe/webhook` verify the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET` and Stripe's native HMAC-SHA256 validator.
2. **Idempotency Deduplication**: Each received event is recorded in the `processed_webhook_events` table by unique `event.id`. Duplicate webhook transmissions return `200 OK` with `status: "already_processed"`, preventing replay attacks or duplicate quota resets.

### SMTP & Google App Password Compliance
1. **Modern Authentication**: Direct password login is rejected by modern email providers like Google. ScanText OCR strictly supports Google App Passwords with 2-Step Verification.
2. **TLS / SSL Handshake**: Supports Port 587 (`STARTTLS` with `ehlo`) and Port 465 (`SMTPS` SSL).
3. **Diagnostic Probe**: The `/api/v1/admin/smtp/test-connection` endpoint tests live delivery without storing plaintext passwords in application memory.

---

## 2. Containerized Deployment Strategy

### Docker Compose Quickstart
To launch all 8 microservices (Nginx Proxy, FastAPI Backend, Celery Worker, Celery Beat, Next.js Frontend, PostgreSQL, Redis, Mailpit):

```bash
cd infrastructure
docker compose up -d --build
```

### Environment Variable Security
Ensure production environment variables are passed via `.env` files and never hardcoded in source repositories:
- `SECRET_KEY`: Minimum 32-character random string for JWT signing.
- `STRIPE_SECRET_KEY`: Live or test Stripe secret key.
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (`whsec_...`).
- `SMTP_PASSWORD`: 16-character Google App Password (or SendGrid API key).
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL database.
