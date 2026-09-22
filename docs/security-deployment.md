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
5. No database or persistent file storage is utilized in this baseline architecture.

### Payload Enforcers
- Default file size limit is set to **10 MB** via `MAX_FILE_SIZE_MB`.
- Nginx enforces `client_max_body_size 10M;` at the reverse proxy layer.
- FastAPI stream reader validates content length before allocating buffer memory.

---

## 2. Containerized Deployment Strategy

### Docker Compose Quickstart
To launch the complete production stack (Nginx Proxy + FastAPI Backend + Next.js Frontend):

```bash
cd infrastructure
docker-compose up -d --build
```

### Environment Variable Security
Ensure production environment variables are passed via `.env` files and never hardcoded in source repositories:
- `MAX_FILE_SIZE_MB`: 10
- `CORS_ORIGINS`: Allowed production origins e.g. `["https://your-domain.com"]`
- `NEXT_PUBLIC_API_URL`: Empty string if behind Nginx proxy, or explicit API domain if separated.
