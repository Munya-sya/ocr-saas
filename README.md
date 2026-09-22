# OCR SaaS

OCR SaaS is a modern image-to-text and PDF-to-text web application built to help users extract editable text from documents, screenshots, receipts, notes, and scanned files.

The platform allows users to upload supported image files or PDFs, run OCR processing, edit the extracted text, copy it, and download the result. It is designed to grow from a simple free OCR tool into a production-ready SaaS application with user accounts, usage quotas, subscriptions, batch processing, and API access.

## Features

- Extract text from JPG, JPEG, PNG, and WEBP images
- Extract text from scanned and digital PDF documents
- Multi-language OCR support
- Drag-and-drop file upload
- Image preview before processing
- Editable OCR text results
- Copy extracted text to clipboard
- Download results as TXT files
- Secure file validation and upload restrictions
- Temporary private file storage with automatic deletion
- Free user quotas and usage tracking
- User registration, login, and account dashboard
- Stripe Checkout subscriptions for Pro users
- Stripe Customer Portal for subscription management
- Webhook-based subscription activation and cancellation handling
- Batch OCR processing for Pro users
- Background job processing with Redis workers
- Ad-supported Free plan with ad-free Pro plan
- SEO-friendly OCR and document-conversion guide pages
- Docker-based local and production deployment
- Admin tools for job monitoring, usage management, and abuse prevention

## Technology Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI
- Tesseract OCR
- Pillow
- OpenCV
- PyMuPDF or pdf2image

### Infrastructure

- PostgreSQL
- Redis
- Celery or Dramatiq
- Docker and Docker Compose
- Nginx or Caddy
- Cloudflare R2, AWS S3, or Azure Blob Storage

### Payments and Monetisation

- Stripe Checkout
- Stripe Billing
- Stripe Customer Portal
- Stripe Webhooks
- Google AdSense

## Project Goal

The goal of OCR SaaS is to provide a fast, privacy-conscious, and easy-to-use OCR platform for individuals, students, professionals, businesses, and developers.

The application is designed around a simple workflow:

```text
Upload file → Extract text → Edit text → Copy or download result
```

For Pro users:

```text
Create account → Upgrade with Stripe → Unlock larger files,
batch processing, higher limits, saved history, and an ad-free experience
```

## Privacy and Security

OCR SaaS is designed with privacy and secure file handling in mind.

- Uploaded files are validated before processing.
- Only supported file formats are accepted.
- File size, image dimensions, PDF pages, and processing time are limited.
- Files are stored privately and are not exposed through public server folders.
- Temporary files are automatically deleted after processing or after a defined retention period.
- Passwords are securely hashed.
- Payment card details are handled by Stripe and are never stored by this application.
- Stripe webhook signatures are verified before changing subscription access.
- API keys and secrets are managed using environment variables.
- Usage quotas and rate limits help prevent abuse.

## Plans

### Free Plan

- Limited daily OCR conversions
- Basic image-to-text extraction
- Limited PDF processing
- Ads displayed
- Temporary results and automatic file deletion

### Pro Plan

- Higher daily OCR limits
- Larger image and PDF file limits
- More PDF pages per conversion
- Batch image and document processing
- Ad-free experience
- Subscription management through Stripe Customer Portal
- Priority processing where available

## License

This project is intended for educational, portfolio, and commercial SaaS development purposes. 