# Threat Model: ScanText OCR SaaS

## 1. Overview & Scope
This document details the security threat model for ScanText OCR SaaS, evaluated according to the **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege).

ScanText OCR processes potentially sensitive user documents (PDF invoices, scans, personal identity documents, screenshots) into plaintext. The core architectural philosophy is **Zero-Retention by Default**:
- Raw uploaded files are stored temporarily on private ephemeral storage with randomized UUIDs.
- Background worker tasks process documents asynchronously and set strict expiration timestamps (`expires_at`).
- An automated cleanup task purges expired files from disk and sets `text_result = NULL` in the database.
- Administrative consoles and loggers strictly redact credentials, secrets, raw document content, and extracted OCR text.

---

## 2. System Architecture & Trust Boundaries

```
[ Client Browser ]
        │  HTTPS (TLS 1.3)
        ▼
[ Nginx Reverse Proxy ] ────────── [ Mailpit / SMTP ] (Protected by Nginx auth_request)
        │  Proxy Pass
        ├── [ Next.js Frontend ]
        └── [ FastAPI Backend ]
                 │
                 ├── [ PostgreSQL DB ] (User accounts, hashed pw, audit logs, metadata)
                 ├── [ Redis Cache / Broker ] (Celery task queue, rate limit state)
                 └── [ Celery Workers ] ─── [ Ephemeral File Storage: /tmp/ocr_uploads ]
```

### Trust Boundaries:
1. **External Boundary (Internet to Nginx)**: Untrusted traffic. Rate limiting, TLS termination, OWASP security headers, CORS origin restrictions, Content Security Policy (CSP).
2. **Application Boundary (Nginx to FastAPI & Next.js)**: Forwarded with `X-Real-IP` and `X-Forwarded-Proto`. JWT authentication cookies (`HttpOnly`, `SameSite=Lax`).
3. **Data Storage Boundary (FastAPI/Worker to DB & Redis)**: Encrypted credentials, parameterized queries (SQLAlchemy ORM), isolated Docker network (`backend_net`).
4. **File System Boundary (Worker to Storage)**: Isolated container mount `/tmp/ocr_uploads`, strict UUID file naming, non-executable storage permissions.

---

## 3. STRIDE Threat Analysis

### 3.1 Spoofing (Identity Deception)
| Threat | Risk | Mitigation in Place |
|---|---|---|
| JWT Token Forgery / Tampering | High | Tokens signed using HMAC-SHA256 (`HS256`) with secret `JWT_SECRET`. Stored in `HttpOnly`, `SameSite=Lax` cookies to prevent XSS extraction. |
| Stripe Webhook Spoofing | Critical | Webhooks validated via cryptographic HMAC-SHA256 signature verification (`stripe.Webhook.construct_event`) using `STRIPE_WEBHOOK_SECRET` with 300s replay tolerance. |
| Google OAuth State Spoofing | Medium | State tokens generated with 32 bytes of cryptographic entropy (`secrets.token_urlsafe(32)`), stored in `HttpOnly` cookie and validated on callback. |
| Administrative Auth Spoofing | High | `require_admin` dependency verifies `user.is_admin == True` AND `user.is_verified == True`. Suspended/banned users immediately rejected. |

### 3.2 Tampering (Data Modification)
| Threat | Risk | Mitigation in Place |
|---|---|---|
| Malicious File Uploads / Polyglots | Critical | Dual-layer validation: file extension whitelist (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`) and OWASP magic-byte header inspection (`validate_upload_file`). |
| File Path Traversal | Critical | Uploaded files are renamed to randomized `uuid.uuid4()` basenames. Storage paths are strictly scoped to `TEMP_UPLOAD_DIR`. |
| Stripe Webhook Event Replay | High | Processed webhook event IDs recorded in `processed_webhook_events` table; subsequent duplicate deliveries return immediate `200 OK` (idempotent). |
| Database Tampering / Injection | High | 100% of queries use SQLAlchemy ORM with parameterized SQL inputs. No raw SQL concatenation. |

### 3.3 Repudiation (Disavowal of Actions)
| Threat | Risk | Mitigation in Place |
|---|---|---|
| Unauthorized Admin Modifications | Medium | All administrative actions (user ban, tier changes, quota resets, settings updates) write an immutable record into `audit_logs` capturing `user_id`, `ip_address`, `action`, and timestamp. |
| Abuse of Quota Reset | Medium | Quota resets are audited with previous conversion counts logged. |
| Email Delivery Failures | Low | Outgoing verification and password reset emails are dispatched through authenticated SMTP/TLS or local Mailpit catcher. |

### 3.4 Information Disclosure (Privacy Leakage)
| Threat | Risk | Mitigation in Place |
|---|---|---|
| Admin Leakage of User Documents | Critical | **Zero-Retention Guarantee**: `OCRJob.to_dict()` and `GET /api/v1/admin/jobs` exclude `text_result` and `secure_path`. Administrators cannot view document content. |
| Plaintext Secret Leakage in Logs | Critical | `RedactingLogFilter` scrubs Stripe keys (`sk_...`, `whsec_...`), JWT tokens (`Bearer ...`), Google secrets, passwords, and Gmail app codes. |
| Secret Leakage via Admin Settings API | High | `mask_secret()` masks secrets with bullet characters (`sk_test_••••••••1234`). Masked secrets submitted in updates are preserved without overwriting. |
| Timing Attacks on Password Reset | Low | Password reset and email verification tokens use `hmac.compare_digest` for constant-time comparisons. |

### 3.5 Denial of Service (Resource Starvation)
| Threat | Risk | Mitigation in Place |
|---|---|---|
| Oversized File Uploads | High | Nginx enforces `client_max_body_size 50M`. FastAPI validator enforces 10MB Free / 50MB Pro limits before memory loading. |
| PDF Decompression / Zip Bombs | High | `pypdf` page counts strictly validated before processing (Max 5 pages Free / 50 pages Pro). Celery task timeout enforced (`OCR_TIMEOUT_SECONDS = 300`). |
| Authentication Brute-Force | High | In-memory IP rate limiter restricts login and registration attempts to 10 requests per minute (`check_auth_rate_limit`). |
| Celery Queue Exhaustion | Medium | Async worker architecture isolates OCR compute from FastAPI API threads. Admin queue monitor (`GET /admin/queue-stats`) exposes depth. |
| Anonymous Conversion Abuse | Medium | In-memory IP rate limiting (3 conversions/24h) plus configurable CAPTCHA support (Cloudflare Turnstile, Google reCAPTCHA, hCaptcha). |

### 3.6 Elevation of Privilege
| Threat | Risk | Mitigation in Place |
|---|---|---|
| Non-Admin Access to Admin Portal | Critical | Next.js client-side route guard plus backend `require_admin` dependency throwing `403 Forbidden` if `is_admin` is false or user is unverified. |
| Unverified User Escalating to Pro | High | Pro tier upgrade only occurs after cryptographic Stripe `checkout.session.completed` webhook verification or manual audited admin action. |
| Suspended User Circumvention | High | Suspended users (`is_banned == True`) are rejected at `get_current_user` and `check_and_increment_quota`. |

---

## 4. Residual Risks & Hardening Checklist
- [x] OWASP Top 10 API Security controls implemented.
- [x] Zero-Retention file purge worker running periodically via Celery Beat (every 15m).
- [x] Secret masking and log redaction verified.
- [ ] Production TLS/SSL certificates configured with Let's Encrypt / Certbot.
- [ ] Set `COOKIE_SECURE=true` in production environment when serving over HTTPS.
- [ ] Configure off-site PostgreSQL backup sync (e.g. AWS S3 / Cloudflare R2 bucket).
