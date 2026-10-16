# Administrator Operations Runbook & Setup Guide

This runbook provides complete operational guidance for configuring, operating, and troubleshooting the ScanText OCR SaaS platform.

---

## 1. Stripe Product & Plan Setup (Section 2: Stripe Billing)

### Overview
To enable self-serve Pro subscriptions ($19.00/month recurring), Stripe requires a recurring Price ID (`price_...`). Modern Stripe accounts use **Dynamic Payment Methods**, meaning backend requests omit `payment_method_types` and Stripe dynamically renders credit cards, Apple Pay, Google Pay, and localized payment options configured in your Stripe Dashboard.

### Step-by-Step Configuration
1. **Toggle Test Mode**:
   - Open the [Stripe Test Products Dashboard](https://dashboard.stripe.com/test/products).
   - Verify that the **Test mode** toggle in the top-right corner of the Stripe Dashboard is turned **ON**.
2. **Add the Pro Product**:
   - Click the **+ Add product** button in the top-right corner.
   - Enter Product Name: `ScanText OCR Pro`.
   - (Optional) Description: `Unlimited high-resolution OCR, batch document processing, priority queues, and zero ads.`
3. **Configure Pricing**:
   - **Pricing model**: Select **Standard pricing**.
   - **Price**: Enter `19.00`.
   - **Currency**: `USD - US Dollar` (or your preferred currency).
   - **Billing period**: Select **Monthly (Recurring)**.
   - Click **Save product** in the top-right corner.
4. **Copy the Price ID**:
   - From the product details page, locate the **Pricing** table at the bottom.
   - Copy the generated API ID starting with `price_` (e.g. `price_1Qxxxxxxxxxxxxxxxxxxxxxx`).
5. **Paste into Admin Console**:
   - Open your browser to `http://localhost/admin` (or `http://localhost:3000/admin`).
   - Log in with your administrator account and navigate to **System Settings** &rarr; **2. Stripe Payment Gateway Infrastructure**.
   - Paste the copied ID into **Pro Monthly Price ID**.
   - If not already set, paste your `sk_test_...` key into **Stripe Secret Key**.
   - Click **Save All System Configuration Changes**.
6. **Verify Stripe Connection**:
   - The **Stripe Connection Diagnostic** card at the top of Section 2 will automatically validate the API key and Price ID, displaying:
     `Connected: YES • Mode: TEST • Price Valid: YES • Plan: ScanText OCR Pro ($19.00 / month)`.

---

## 2. Gmail App Password & SMTP Mailer Setup (Section 3: SMTP Mailer)

### Overview
Google disabled standard password logins for external SMTP applications in 2022. To send live verification and password reset emails through your Gmail account, you must generate a 16-character **Google App Password**.

### Step-by-Step Configuration
1. **Turn ON 2-Step Verification**:
   - Open your [Google Account Security Settings](https://myaccount.google.com/security).
   - Ensure **2-Step Verification** is turned **ON** for your account. (Google will not permit App Passwords if 2FA is disabled).
2. **Generate an App Password**:
   - In the Google Account search bar at the top, type `App passwords` (or go directly to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
   - In the "App name" field, enter `ScanText OCR` and click **Create**.
   - Google will display a yellow dialog box with a 16-character code (e.g., `abcd efgh ijkl mnop`). Copy this code.
3. **Configure in Admin Console**:
   - Open `http://localhost/admin` &rarr; **System Settings** &rarr; **3. SMTP Mailer Infrastructure**.
   - Set the following fields:
     - **SMTP Host**: `smtp.gmail.com`
     - **SMTP Port**: `587`
     - **From Email**: `your_actual_email@gmail.com` (must match your Gmail address)
     - **SMTP User**: `your_actual_email@gmail.com`
     - **SMTP Password**: Paste the 16-character App Password (without spaces).
   - Click **Save All System Configuration Changes**.
4. **Execute Live Diagnostic Probe**:
   - Click the **"Send Test Email to Admin"** button located at the top of Section 3.
   - The system initiates an immediate live SMTP connection, negotiates TLS via `ehlo` and `starttls`, authenticates with Google, and sends a test email to your admin inbox.
   - **Green status**: `Connected & Sent • Delivered to your admin inbox!` &rarr; Check your Gmail inbox for the test message.
   - **Red status**: Displays Google's exact SMTP error response (e.g. `535 5.7.8 Username and Password not accepted` if the 16-character code was entered with errors or 2FA was turned off).

---

## 3. Dynamic Payment Methods & Stripe Webhook Forwarding

### Dynamic Payment Methods
In modern Stripe accounts, backend code omits `payment_method_types`. Stripe dynamically detects the buyer's browser, currency, and locale to render:
- Credit / Debit Cards (Visa, Mastercard, Amex)
- Apple Pay (on Safari / iOS)
- Google Pay (on Chrome / Android)
- Additional local payment options toggled ON in [Stripe Dashboard > Settings > Payment Methods](https://dashboard.stripe.com/settings/payment_methods).

### Forwarding Webhooks Locally with Stripe CLI
To simulate checkout completions, cancellations, and renewals locally:
```bash
# 1. Authenticate Stripe CLI
stripe login

# 2. Forward incoming webhook events to local backend
stripe listen --forward-to localhost/api/v1/stripe/webhook

# 3. Simulate checkout session completed (triggers user upgrade to Pro)
stripe trigger checkout.session.completed

# 4. Simulate subscription cancellation (triggers automatic downgrade to Free)
stripe trigger customer.subscription.deleted
```

---

## 4. Test Suite Execution & Quality Assurance

All 43 unit and integration tests verify the complete platform lifecycle with 100% pass rate:

```bash
# Run tests inside active backend container
docker exec -e PYTHONPATH=/app ocr_backend pytest -v
```

### Test Suite Breakdown
| Test Module | Tests | Description |
| :--- | :--- | :--- |
| `tests/test_validation.py` | 9 | Magic byte validation, MIME checks, file size enforcers |
| `tests/test_ocr_api.py` | 7 | Synchronous OCR, error codes (`400`, `413`, `415`, `422`, `200`) |
| `tests/test_async_jobs.py` | 3 | Celery background job creation, polling, result download |
| `tests/test_phase3_auth.py` | 9 | User registration, JWT cookies, email verification, daily quotas |
| `tests/test_phase4_billing.py` | 15 | Stripe checkout, Customer portal, webhook HMAC, secret masking, live diagnostic probes |
| **Total** | **43** | **100% Pass Rate** |
