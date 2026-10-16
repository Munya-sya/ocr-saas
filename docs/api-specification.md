# OpenAPI Specification & REST API Reference

Production-oriented API reference for ScanText OCR SaaS (`ocr-saas`).

## Base URLs
- **Direct Backend Local Dev**: `http://localhost:8000/api/v1`
- **Docker Nginx Reverse Proxy**: `http://localhost/api/v1`
- **Interactive Swagger UI**: `http://localhost/api/v1/docs` or `http://localhost:8000/api/v1/docs`

---

## 🛡️ Free Plan Quotas & Rate Limits

| Scope | Daily Limit | Max File Size | Max PDF Pages | Features | HTTP Error on Breach |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anonymous IP** | 3 conversions / 24h | 10 MB | 5 pages | Single file, Ad-supported | `429 Too Many Requests` |
| **Free Registered User** | 3 conversions / 24h | 10 MB | 5 pages | Single file, Ad-supported | `429 Too Many Requests` |
| **Pro Tier User** | 100 conversions / 24h | 50 MB | 100 pages | Batch processing, Zero ads, Priority worker | `429 Too Many Requests` |

### Endpoint Rate Limiting
- **Authentication Endpoints** (`/api/v1/auth/login`, `/api/v1/auth/register`): Sliding-window rate limit of 10 requests per minute per IP address.
- **Job Creation Endpoints** (`/api/v1/jobs`, `/api/v1/ocr`): Global rate limit of 30 conversions/hour per IP address via SlowAPI.

---

## 1. Authentication & Account Management (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Creates a new user account and sends a verification link via local Mailpit SMTP catcher.

#### Request Body (`application/json`)
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Responses
- **`201 Created`**: User registered successfully.
  ```json
  {
    "message": "Registration successful. Please verify your email address via the link sent to your inbox.",
    "user": {
      "id": "c1f7b028-...",
      "email": "user@example.com",
      "isVerified": false,
      "isAdmin": false,
      "isBanned": false,
      "planTier": "free",
      "createdAt": "2026-10-15T00:00:00Z"
    }
  }
  ```
- **`400 Bad Request`**: Weak password (< 8 chars) or email already registered.
- **`429 Too Many Requests`**: Rate limit exceeded (sliding window 10/min).

---

### `GET /api/v1/auth/verify-email`
Verifies user email address using the single-use token sent via email.

#### Query Parameters
- `token` (string, required): 64-character verification token.

#### Responses
- **`200 OK`**: `{"message": "Email address successfully verified. You now have full account access."}`
- **`400 Bad Request`**: `{"detail": "Invalid or expired email verification token."}`

---

### `POST /api/v1/auth/resend-verification`
Resends the verification email to the current authenticated user.

#### Headers
- `Authorization: Bearer <token>` or HTTP-only `access_token` cookie.

#### Responses
- **`200 OK`**: `{"message": "A new verification email has been sent."}`
- **`400 Bad Request`**: Account is already verified.
- **`401 Unauthorized`**: Unauthenticated caller.

---

### `POST /api/v1/auth/login`
Authenticates user, sets secure HTTP-only `access_token` cookie, and returns JWT token in payload.

#### Request Body (`application/json`)
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Responses
- **`200 OK`**:
  ```json
  {
    "message": "Login successful.",
    "accessToken": "eyJhbGciOi...",
    "tokenType": "bearer",
    "user": {
      "id": "c1f7b028-...",
      "email": "user@example.com",
      "isVerified": true,
      "isAdmin": false,
      "isBanned": false,
      "planTier": "free",
      "createdAt": "2026-10-15T00:00:00Z"
    }
  }
  ```
  *Cookie set*: `access_token=<JWT>; HttpOnly; SameSite=Lax; Path=/`
- **`401 Unauthorized`**: Invalid email or password.
- **`403 Forbidden`**: Account is suspended/banned.
- **`429 Too Many Requests`**: Login rate limit exceeded.

---

### `POST /api/v1/auth/logout`
Logs out current user and clears the `access_token` cookie.

#### Responses
- **`200 OK`**: `{"message": "Successfully logged out."}`

---

### `POST /api/v1/auth/forgot-password`
Initiates password recovery by sending a single-use expiring token (1-hour lifespan) to the user's email.

#### Request Body (`application/json`)
```json
{
  "email": "user@example.com"
}
```

#### Responses
- **`200 OK`**: `{"message": "If an account with that email exists, a password reset link has been sent."}`

---

### `POST /api/v1/auth/reset-password`
Consumes the single-use expiring token to set a new password. Expired tokens are purged automatically.

#### Request Body (`application/json`)
```json
{
  "token": "reset-token-uuid-string",
  "newPassword": "NewSecurePassword123!"
}
```

#### Responses
- **`200 OK`**: `{"message": "Password reset successfully. You can now log in with your new password."}`
- **`400 Bad Request`**: Invalid or expired token, or password < 8 characters.

---

### `GET /api/v1/auth/me`
Retrieves current authenticated profile and daily quota usage statistics.

#### Headers
- `Authorization: Bearer <token>` or HTTP-only `access_token` cookie.

#### Responses
- **`200 OK`**:
  ```json
  {
    "user": {
      "id": "c1f7b028-...",
      "email": "user@example.com",
      "isVerified": true,
      "isAdmin": false,
      "isBanned": false,
      "planTier": "free",
      "createdAt": "2026-10-15T00:00:00Z"
    },
    "quota": {
      "planTier": "free",
      "conversionsUsedToday": 1,
      "maxDailyConversions": 3,
      "conversionsRemaining": 2,
      "maxFileMb": 10,
      "maxPdfPages": 5
    }
  }
  ```
- **`401 Unauthorized`**: Missing or invalid session token.

---

### `POST /api/v1/auth/cancel-pro`
Cancels Pro plan and reverts account to Free tier.

#### Responses
- **`200 OK`**: `{"message": "Pro subscription cancelled successfully. Account reverted to Free tier.", "user": {...}}`
- **`401 Unauthorized`**: Authentication required.

---

### `DELETE /api/v1/auth/account`
Permanently purges the authenticated user account and executes a cascading deletion of all associated OCR jobs, tokens, and audit records.

#### Responses
- **`200 OK`**: `{"message": "Account and saved job history deleted successfully."}`
- **`401 Unauthorized`**: Authentication required.

---

### `GET /api/v1/auth/google/login` & `GET /api/v1/auth/google/callback`
Initiates Google OAuth 2.0 flow and handles code exchange callback. Configurable dynamically through Admin settings.

---

## 2. Asynchronous Background OCR Jobs (`/api/v1/jobs`)

### `POST /api/v1/jobs`
Uploads a document for asynchronous background OCR processing (ideal for multi-page PDFs or batch workloads). Dispatched to Celery/Redis queue.

#### Request (`multipart/form-data`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `binary` | **Yes** | Document file (`.jpg`, `.png`, `.webp`, `.pdf`) |
| `language` | `string` | No | OCR Language code (`eng`, `deu`, `fra`, `spa`, default: `eng`) |
| `psm` | `integer` | No | Page Segmentation Mode (1–13, default: `3`) |
| `preprocess_mode` | `string` | No | `auto`, `grayscale`, `threshold`, `none` |

#### Responses
- **`202 Accepted`**:
  ```json
  {
    "jobId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "filename": "annual_report.pdf",
    "status": "queued",
    "message": "OCR job successfully queued for processing."
  }
  ```
- **`400 Bad Request`**: Exceeds maximum PDF page limit (Free plan: 5 pages).
- **`413 Request Entity Too Large`**: Exceeds maximum file size limit (Free plan: 10 MB).
- **`415 Unsupported Media Type`**: Unsupported extension or binary signature mismatch.
- **`429 Too Many Requests`**: Daily quota limit reached (Free plan: 3 conversions/24h).

---

### `GET /api/v1/jobs`
Lists recent OCR jobs for the caller (authenticated user or anonymous caller IP).

#### Responses
- **`200 OK`**:
  ```json
  [
    {
      "jobId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      "filename": "receipt.png",
      "status": "completed",
      "fileType": "image",
      "language": "eng",
      "pageCount": 1,
      "processedPages": 1,
      "processingMs": 340.2,
      "createdAt": "2026-10-15T00:10:00Z"
    }
  ]
  ```

---

### `GET /api/v1/jobs/{job_id}`
Returns current progress, status, and metadata for a specific job.

#### Responses
- **`200 OK`**:
  ```json
  {
    "jobId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "filename": "annual_report.pdf",
    "status": "processing",
    "fileType": "pdf",
    "language": "eng",
    "pageCount": 4,
    "processedPages": 2,
    "errorMessage": null,
    "processingMs": 1420.5,
    "createdAt": "2026-10-15T00:10:00Z"
  }
  ```
- **`404 Not Found`**: Job ID does not exist.

---

### `GET /api/v1/jobs/{job_id}/result`
Retrieves extracted OCR text upon completion.

#### Responses
- **`200 OK`**:
  ```json
  {
    "jobId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "filename": "annual_report.pdf",
    "status": "completed",
    "language": "eng",
    "pageCount": 4,
    "text": "--- Page 1 ---\nAnnual Financial Report 2026\n...",
    "processingMs": 2840.12
  }
  ```
- **`400 Bad Request`**: Job is still queued or processing.
- **`422 Unprocessable Entity`**: Job execution failed with error detail.

---

### `DELETE /api/v1/jobs/{job_id}`
Cancels an active job or purges storage files for a finished job.

#### Responses
- **`200 OK`**: `{"jobId": "...", "status": "cancelled", "message": "Job cancelled and file storage purged."}`

---

## 3. Synchronous OCR (`/api/v1/ocr`)

### `POST /api/v1/ocr`
Extracts plain text synchronously from an uploaded single image or PDF. Ephemeral storage is purged immediately.

#### Headers
- `Content-Type`: `multipart/form-data`

#### Request Body
| Parameter | Type | Required | Description | Default |
| :--- | :--- | :--- | :--- | :--- |
| `file` | `binary / UploadFile` | **Yes** | Image (`.jpg`, `.jpeg`, `.png`, `.webp`) or PDF (`.pdf`) document | N/A |
| `language` | `string` | No | OCR language code (`eng`, `deu`, `fra`, `spa`) | `"eng"` |
| `psm` | `integer` | No | Tesseract Page Segmentation Mode (1–13) | `3` |
| `preprocess_mode` | `string` | No | `auto`, `grayscale`, `threshold`, `none` | `"auto"` |

#### Responses
- **`200 OK`**:
  ```json
  {
    "jobId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "filename": "invoice_1024.png",
    "language": "eng",
    "text": "INVOICE #1024\nDate: 2026-09-22\nTotal Amount: $1,450.00",
    "processingMs": 312.45
  }
  ```
- **`400 Bad Request`**: Magic byte signature verification failed or file is empty.
- **`413 Request Entity Too Large`**: File exceeds plan size limit (Free: 10 MB).
- **`415 Unsupported Media Type`**: Unsupported extension.
- **`429 Too Many Requests`**: Daily conversion quota exceeded (Free: 3 conversions/24h).

---

## 4. System & Diagnostics

### `GET /api/v1/languages`
Lists installed Tesseract language models.
```json
{
  "languages": [
    {"code": "eng", "name": "English"},
    {"code": "deu", "name": "German"},
    {"code": "fra", "name": "French"},
    {"code": "spa", "name": "Spanish"}
  ]
}
```

### `GET /api/v1/health`
Container orchestration health check probe.
```json
{
  "status": "healthy",
  "ocr_engine": "tesseract 5.x",
  "version": "3.1.0"
}
```

---

## 5. Admin Console (`/api/v1/admin`)

*All admin endpoints require an authenticated user with `is_admin = True` (`403 Forbidden` if non-admin).*

- `GET /api/v1/admin/verify_admin`: Validates admin privileges.
- `GET /api/v1/admin/stats`: Aggregate system metrics (users, active jobs, daily conversions, failures).
- `GET /api/v1/admin/users`: Search and list all registered users.
- `PATCH /api/v1/admin/users/{user_id}`: Ban/unban, adjust plan tier (Free/Pro), or toggle admin status.
- `GET /api/v1/admin/settings`: Fetch dynamic runtime settings (OAuth credentials, SMTP host, masked secrets).
- `POST /api/v1/admin/settings`: Save runtime system configuration with automatic zero-plaintext secret preservation.
- `GET /api/v1/admin/audit-logs`: Audit logs for administrative actions.
- `GET /api/v1/admin/stripe/balance`: Live diagnostic probe that tests Stripe API connectivity and retrieves balance/price status.
- `POST /api/v1/admin/smtp/test-connection`: Live diagnostic mailer probe that executes a real TLS handshake and sends a test email to the admin inbox.

---

## 6. Stripe Subscriptions & Billing (`/api/v1/billing` & `/api/v1/stripe`)

### Dynamic Payment Methods
In modern Stripe accounts, backend requests omit `payment_method_types`. Stripe Checkout dynamically enables Cards, Apple Pay, Google Pay, and localized payment methods based on your toggles in [Stripe Dashboard > Settings > Payment Methods](https://dashboard.stripe.com/settings/payment_methods).

### `POST /api/v1/billing/create-checkout-session`
Creates a Stripe Hosted Checkout Session for the recurring monthly OCR Pro subscription ($19/mo).
- **Security**: Requires authenticated session cookie or Bearer token (`401 Unauthorized` if unauthenticated). User ID is extracted exclusively from the authenticated session context.
- **Dynamic Configuration**: Resolves `STRIPE_SECRET_KEY` and `STRIPE_PRO_MONTHLY_PRICE_ID` dynamically from the database (`SystemSetting`), falling back to environment variables.
- **Request Body**: None (server-derived).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
      "sessionId": "cs_test_...",
      "alreadySubscribed": false
    }
    ```
  - `401 Unauthorized`: Not authenticated.
  - `500 Internal Server Error`: Stripe API failure.

---

### `POST /api/v1/billing/create-portal-session`
Generates a Stripe Customer Portal redirect URL allowing subscribers to update payment methods, download invoices, or cancel their subscription.
- **Security**: Requires authenticated session cookie or Bearer token.
- **Request Body**: None.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "portalUrl": "https://billing.stripe.com/p/session/test_..."
    }
    ```
  - `400 Bad Request`: No billing history or Stripe customer ID associated with user account.
  - `401 Unauthorized`: Not authenticated.

---

### `POST /api/v1/stripe/webhook`
Receives asynchronous event webhooks from Stripe with cryptographic signature verification and database idempotency tracking.
- **Security**: Verifies raw request body payload against `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.
- **Idempotency**: Checks `processed_webhook_events` table by `event.id`. Retransmissions or duplicate deliveries immediately return `{"status": "already_processed"}` with `200 OK`.
- **Supported Events**:
  - `checkout.session.completed`: Sets `plan_tier = PlanTier.PRO`, `subscription_status = "active"`, stores `stripe_customer_id` and `stripe_subscription_id`.
  - `customer.subscription.created` / `customer.subscription.updated`: Synchronizes `subscription_status` (`active`, `past_due`, `canceled`) and `current_period_end`.
  - `customer.subscription.deleted`: Downgrades user to `PlanTier.FREE` and sets `subscription_status = "canceled"`.
  - `invoice.paid`: Ensures ongoing Pro status.
  - `invoice.payment_failed`: Marks `subscription_status = "past_due"`.
- **Responses**:
  - `200 OK`: Event received and processed (or already processed).
  - `400 Bad Request`: Missing or invalid `stripe-signature` header.

---

## 7. Configuration Runbooks

### Stripe Product & Subscription Setup
1. **Toggle Test Mode**: Open [Stripe Products Dashboard](https://dashboard.stripe.com/test/products) and verify Test mode toggle is ON in the top-right.
2. **Add Product**: Click **+ Add product** &bull; Name: `ScanText OCR Pro`.
3. **Set Pricing**: Model: **Standard pricing** &bull; Price: `$19.00` &bull; Billing period: **Monthly (Recurring)**.
4. **Copy Price ID**: Click **Save product**, copy the `price_1Q...` ID from the Pricing table.
5. **Configure**: In Admin Console (`http://localhost:3000/admin` &rarr; System Settings &rarr; Section 2), paste the Price ID into **Pro Monthly Price ID** and save.

### Gmail SMTP & Google App Passwords Setup
1. **2-Step Verification**: Open [Google Account Security](https://myaccount.google.com/security) and ensure 2-Step Verification is ON.
2. **Generate App Password**: Search "App passwords" or visit [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords). Name the app `ScanText OCR` and click **Create**. Copy the 16-character code.
3. **Configure in Admin Console**:
   - **SMTP Host**: `smtp.gmail.com`
   - **SMTP Port**: `587`
   - **From Email**: `your_actual_email@gmail.com`
   - **SMTP User**: `your_actual_email@gmail.com`
   - **SMTP Password**: 16-character code (without spaces)
4. **Live Verification**: Click **Send Test Email to Admin** in Section 3 to test the TLS handshake and deliver a test message to your inbox.


