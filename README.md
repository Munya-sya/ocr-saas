# ScanText OCR SaaS Monorepo (`ocr-saas`)

Production-ready Optical Character Recognition (OCR) SaaS web platform built with **Next.js 14**, **FastAPI**, **PostgreSQL**, **Redis**, **Celery**, **Stripe Billing**, **Tesseract OCR**, and **Docker Compose**.

---

## 📁 Repository Structure

```
ocr-saas/
├── docs/                         # Architecture, API specifications, and runbooks
│   ├── architecture.md           # High-level architecture, diagrams, & service maps
│   ├── api-specification.md      # OpenAPI reference, auth, billing & admin endpoints
│   ├── security-deployment.md    # Security model, zero-plaintext secrets, & deployment
│   └── test-verification-report.md # Comprehensive test execution report
├── frontend/                     # Next.js 14, TypeScript, Tailwind CSS client web app
│   ├── src/app/                  # App Router pages (/pricing, /dashboard, /admin, /login, etc.)
│   ├── src/components/           # Dropzone, FilePreview, OCRControls, QuotaExceededModal
│   ├── src/services/             # Axios API client wrapper with credentials support
│   └── Dockerfile
├── backend/                      # Python FastAPI OCR engine & worker microservice
│   ├── app/
│   │   ├── api/                  # Auth, OCR, Jobs, Billing, Stripe Webhooks, Admin
│   │   ├── core/                 # App configuration & JWT security utilities
│   │   ├── db/                   # SQLAlchemy models, Alembic migrations, database session
│   │   ├── services/             # OCR pipeline, magic byte validator, email delivery
│   │   └── worker/               # Celery app, background OCR worker tasks, beat schedules
│   ├── tests/                    # pytest suite (43 automated tests covering auth, OCR, billing)
│   ├── requirements.txt
│   └── Dockerfile
├── infrastructure/               # Container & reverse proxy orchestration
│   ├── nginx/default.conf        # Nginx reverse proxy routing & rate limiting
│   ├── .env.example              # Production environment variable template
│   └── docker-compose.yml        # Multi-container orchestration (8 containers)
└── README.md
```

---

## ⚡ Platform Architecture & Features

1. **Multi-Format Ingestion**: Supports `.jpg`, `.jpeg`, `.png`, `.webp`, and `.pdf` files.
2. **Binary Magic Byte Security**: Rejects disguised executables by validating raw file header bytes before processing.
3. **Dual Processing Pipelines**:
   - **Synchronous**: Fast OCR for single images (< 10 MB).
   - **Asynchronous**: Celery-powered background jobs with Redis broker for multi-page PDFs and batch files.
4. **User Authentication & RBAC**:
   - Secure Argon2 / bcrypt password hashing.
   - JWT tokens stored in HTTP-only, secure, `SameSite=Lax` cookies.
   - Email verification tokens & password reset workflows.
   - Google OAuth 2.0 Single Sign-On.
5. **Tiered Quotas & Rate Limits**:
   - **Anonymous / Free Users**: 5 conversions/day, 10 MB max file size, 5 PDF pages.
   - **Pro Tier Subscribers**: Unlimited / 1,000 conversions/day, 50 MB max file size, 100 PDF pages.
   - Interactive `QuotaExceededModal` with direct Stripe Pro checkout flow.
6. **Stripe Pro Billing & Dynamic Payment Methods**:
   - Self-serve checkout sessions for `$19.00/month` recurring Pro tier.
   - Modern **Stripe Dynamic Payment Methods** (Cards, Apple Pay, Google Pay).
   - Cryptographically verified webhooks with idempotency tracking in PostgreSQL.
   - Stripe Customer Portal for managing invoices and cancelations.
7. **Comprehensive Admin Console (`/admin`)**:
   - Platform health metrics, live users list, ban/unban moderation, role switching.
   - Real-time **System Mailbox** capturing local emails via Mailpit.
   - Security Audit Logs tracking sensitive administrative operations.
   - **Dynamic Runtime Settings** with zero-plaintext secret masking.
   - Embedded step-by-step runbooks for Stripe and Gmail configuration.
   - Live diagnostic tools: Stripe Balance Check & Live Admin Mailer Probe.

---

## 🚀 Quickstart & Docker Deployment

### 1. Configure Environment Variables
Copy the template and adjust environment variables:
```bash
cp infrastructure/.env.example infrastructure/.env
```

### 2. Launch Complete Stack
```bash
docker compose -f infrastructure/docker-compose.yml up --build -d
```

### 3. Service Endpoints
| Service | URL | Notes |
| :--- | :--- | :--- |
| **Web Application** | `http://localhost` | Next.js frontend via Nginx |
| **Backend REST API** | `http://localhost/api/v1` | FastAPI reverse proxied |
| **OpenAPI Docs (Swagger)**| `http://localhost/api/v1/docs` | Interactive API documentation |
| **System Mailbox (Mailpit)** | `http://localhost:8025` | Local SMTP catcher web console |
| **Admin Console** | `http://localhost/admin` | Requires admin account |

---

## 💳 Stripe Pro Setup (Step-by-Step)

Follow these steps to enable live or test Stripe subscription checkouts:

1. **Open Stripe Products Dashboard**:
   - Visit [Stripe Products](https://dashboard.stripe.com/test/products) and ensure **Test mode** is toggled ON at the top-right.
2. **Add the Pro Product**:
   - Click **+ Add product**.
   - Product name: `ScanText OCR Pro`.
3. **Configure Pricing**:
   - Pricing model: **Standard pricing**.
   - Price: `$19.00`.
   - Billing period: **Monthly (Recurring)**.
   - Click **Save product**.
4. **Copy Price ID**:
   - From the product detail page, copy the generated Price ID (e.g. `price_1Qxxxxxxxxxxxxxxxx`).
5. **Configure in Admin Console**:
   - Navigate to `http://localhost/admin` &rarr; **System Settings** &rarr; **2. Stripe Payment Gateway Infrastructure**.
   - Paste your `sk_test_...` into **Stripe Secret Key**.
   - Paste the `price_1Q...` into **Pro Monthly Price ID**.
   - Click **Save All Settings**.
6. **Dynamic Payment Methods**:
   - Payment methods are automatically enabled via your [Stripe Dashboard Payment Settings](https://dashboard.stripe.com/settings/payment_methods). The backend uses Dynamic Payment Methods with zero hardcoded payment types.

---

## ✉️ Gmail SMTP & Live Mailer Verification

To send real verification and password reset emails via Gmail:

1. **Enable 2-Step Verification**:
   - Open [Google Account Security Settings](https://myaccount.google.com/security) and ensure **2-Step Verification** is turned ON.
2. **Generate Google App Password**:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
   - Enter App Name: `ScanText OCR` &bull; Click **Create**.
   - Google will display a 16-character password in a yellow box (e.g. `abcd efgh ijkl mnop`). Copy it.
3. **Configure in Admin Console**:
   - Navigate to `http://localhost/admin` &rarr; **System Settings** &rarr; **3. SMTP Mailer Infrastructure**.
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **From Email**: `your_actual_email@gmail.com`
   - **SMTP User**: `your_actual_email@gmail.com`
   - **SMTP Password**: Paste the 16-character App Password (without spaces).
   - Click **Save All Settings**.
4. **Test Live Connection**:
   - Click the **"Send Test Email to Admin"** button right above the form.
   - **Green status**: *Connected & Sent • Delivered to your admin inbox!*
   - **Red status**: Prints the exact diagnostic response from Google if credentials or 2FA are incorrect.

---

## 🧪 Automated Test Suite

All 43 unit and integration tests run against FastAPI, Celery, and PostgreSQL mocks:

```bash
# Run tests inside the running backend container
docker exec -e PYTHONPATH=/app ocr_backend pytest -v

# Or run locally in backend virtualenv
cd backend
python -m pytest tests/ -v
```

### Test Coverage Summary (100% Pass Rate):
* **`tests/test_validation.py`** (9 tests): Magic byte detection, MIME verification, file size enforcement.
* **`tests/test_ocr_api.py`** (7 tests): Synchronous OCR endpoints, invalid payloads, unsupported formats.
* **`tests/test_async_jobs.py`** (3 tests): Celery background job creation, status polling, result retrieval.
* **`tests/test_phase3_auth.py`** (9 tests): User registration, JWT sessions, email verification, daily quotas.
* **`tests/test_phase4_billing.py`** (15 tests): Stripe checkout creation, portal redirects, webhook idempotency, admin secret masking, dynamic setting persistence, live diagnostic probes.

---

## 📜 License
MIT License. Free for open-source and commercial use.