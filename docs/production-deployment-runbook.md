# Production Deployment Runbook: ScanText OCR SaaS

## 1. System Requirements & Architecture Overview

ScanText OCR SaaS is designed for containerized deployment across multi-core Linux servers (Ubuntu 22.04 LTS / Debian 12 recommended).

### Recommended Minimal Hardware:
- **CPU**: 4 vCPUs (Tesseract OCR is CPU-intensive)
- **RAM**: 8 GB RAM (PDF page rasterization requires adequate memory)
- **Disk**: 50 GB NVMe SSD (fast ephemeral `/tmp/ocr_uploads` scratch space)
- **OS**: Ubuntu 22.04 / 24.04 LTS with Docker Engine 24+ and Docker Compose v2+

---

## 2. Production Environment Configuration (`.env`)

Create `/opt/ocr-saas/.env` with production credentials:

```bash
# Domain & Protocol
FRONTEND_URL=https://ocr.yourdomain.com
COOKIE_SECURE=true

# Security & Secrets (Use: openssl rand -hex 32)
JWT_SECRET=replace_with_64_char_cryptographic_random_string
INITIAL_ADMIN_EMAIL=admin@yourdomain.com

# PostgreSQL Production Database
POSTGRES_USER=ocr_prod_user
POSTGRES_PASSWORD=replace_with_strong_database_password
POSTGRES_DB=ocr_production
DATABASE_URL=postgresql://ocr_prod_user:replace_with_strong_database_password@postgres:5432/ocr_production

# Redis Cache & Task Broker
REDIS_URL=redis://redis:6379/0

# SMTP Production Mailer (e.g. AWS SES, SendGrid, Postmark, or Gmail Workspace)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=replace_with_smtp_api_key
EMAILS_FROM_EMAIL=noreply@yourdomain.com
EMAILS_FROM_NAME=ScanText OCR

# Stripe Billing (Live Mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...

# Abuse Protection & CAPTCHA (Turnstile / reCAPTCHA / hCaptcha)
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=turnstile
CAPTCHA_SITE_KEY=0x4AAAAAA...
CAPTCHA_SECRET_KEY=0x4AAAAAA...

# Error Monitoring & Observability
SENTRY_DSN=https://your_sentry_key@o0.ingest.sentry.io/0
STRUCTURED_LOGGING=true

# Storage & Retention
TEMP_UPLOAD_DIR=/tmp/ocr_uploads
OCR_TIMEOUT_SECONDS=300
```

---

## 3. SSL/TLS Certificate Setup (Let's Encrypt & Nginx)

1. **Install Certbot**:
   ```bash
   sudo apt-get update && sudo apt-get install -y certbot python3-certbot-nginx
   ```

2. **Obtain SSL Certificate**:
   ```bash
   sudo certbot certonly --standalone -d ocr.yourdomain.com
   ```

3. **Nginx SSL Configuration**:
   Update `infrastructure/nginx/default.conf` to include HTTPS listener:
   ```nginx
   server {
       listen 80;
       server_name ocr.yourdomain.com;
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name ocr.yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/ocr.yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/ocr.yourdomain.com/privkey.pem;
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;

       # HSTS (Strict-Transport-Security)
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
       ...
   }
   ```

---

## 4. Launching the Application

1. **Start all services with Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

2. **Verify Container Health**:
   ```bash
   docker compose ps
   ```
   All 8 containers should show `Up` / `healthy`:
   - `ocr_proxy` (Nginx)
   - `ocr_frontend` (Next.js)
   - `ocr_backend` (FastAPI)
   - `ocr_worker` (Celery Worker)
   - `ocr_beat` (Celery Periodic Scheduler)
   - `ocr_postgres` (PostgreSQL 16)
   - `ocr_redis` (Redis 7)
   - `ocr_mailpit` (Dev only; disabled in production)

3. **Run Database Migrations & Initial Setup**:
   The backend automatically invokes `init_db()` on startup. The first user registering with the email specified in `INITIAL_ADMIN_EMAIL` is automatically granted the administrator role.

---

## 5. Automated Backups & Disaster Recovery

### Automated Nightly Backup Cron
Add a cron job to `/etc/cron.d/ocr_backup`:
```cron
# Run database backup every night at 02:00 UTC
0 2 * * * root /opt/ocr-saas/infrastructure/scripts/backup_db.sh >> /var/log/ocr_backup.log 2>&1
```

### Manual Backup Execution
```bash
docker exec -e BACKUP_DIR=/backups ocr_postgres /scripts/backup_db.sh
```

### Disaster Recovery / Database Restoration
To restore from a backup:
```bash
./infrastructure/scripts/restore_db.sh /path/to/ocr_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 6. Health & Readiness Monitoring

### Probes:
- **Liveness Probe**: `GET https://ocr.yourdomain.com/health` (Checks if API server is up and responsive).
- **Readiness Probe**: `GET https://ocr.yourdomain.com/ready`
  Validates:
  1. PostgreSQL database connectivity (`SELECT 1`).
  2. Redis queue connection and queue depth (`llen("celery")`).
  3. Disk storage availability on `/tmp/ocr_uploads`.
  4. OCR engine binary availability (`tesseract --version`).

Example Readiness Output (`200 OK`):
```json
{
  "status": "ready",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "disk_space": "healthy (28.4 GB free)",
    "ocr_engine": "available (Tesseract v5.3.4)"
  },
  "queue_depth": 0
}
```

---

## 7. Celery Worker Scaling

To handle higher concurrent document conversion throughput:
```bash
# Scale worker container to 4 parallel processing instances
docker compose up -d --scale worker=4 --no-recreate
```

Each worker automatically listens on the Redis `celery` queue and processes tasks independently with zero inter-worker lock contention.

---

## 8. Stripe Webhook Production Configuration

1. In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), click **Add endpoint**.
2. Set Endpoint URL: `https://ocr.yourdomain.com/api/v1/billing/webhook`.
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the Signing Secret (`whsec_...`) into `.env` as `STRIPE_WEBHOOK_SECRET` and restart the backend.
