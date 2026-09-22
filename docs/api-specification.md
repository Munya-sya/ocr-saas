# OpenAPI Specification & REST API Reference

## Base URLs
- **Local Backend Direct**: `http://localhost:8000/api/v1`
- **Docker Nginx Proxy**: `http://localhost/api/v1`

---

## Endpoints

### 1. `POST /api/v1/ocr`
Extracts plain text from an uploaded document image or PDF file.

#### Headers
- `Content-Type`: `multipart/form-data`

#### Request Body
| Parameter | Type | Required | Description | Default |
| :--- | :--- | :--- | :--- | :--- |
| `file` | `binary / UploadFile` | **Yes** | Image (`.jpg`, `.jpeg`, `.png`, `.webp`) or PDF (`.pdf`) document | N/A |
| `language` | `string` | No | OCR language code (`eng`, `deu`, `fra`, `spa`) | `"eng"` |

#### Responses

##### `200 OK`
```json
{
  "success": true,
  "filename": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6.png",
  "language": "eng",
  "text": "INVOICE #1024\nDate: 2026-09-22\nTotal Amount: $1,450.00",
  "page_count": 1,
  "processing_time_ms": 312.45
}
```

##### `400 Bad Request`
Triggered if magic bytes validation fails (e.g. executable or text file renamed to `.png`).
```json
{
  "detail": "Invalid file binary signature. Magic byte validation failed."
}
```

##### `413 Request Entity Too Large`
Triggered if file payload exceeds `MAX_FILE_SIZE_MB` (default 10 MB).
```json
{
  "detail": "File size (12.40 MB) exceeds maximum allowed limit of 10 MB."
}
```

##### `415 Unsupported Media Type`
Triggered if file extension is not in allowed set (`.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`).
```json
{
  "detail": "Unsupported file extension '.docx'. Allowed extensions: .jpeg, .jpg, .pdf, .png, .webp"
}
```

##### `422 Unprocessable Entity`
Triggered when request form data is missing required `file` parameter.
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "file"],
      "msg": "Field required"
    }
  ]
}
```

---

### 2. `GET /api/v1/languages`
Retrieves list of installed Tesseract language models.

#### Response `200 OK`
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

---

### 3. `GET /api/v1/health`
Container health check endpoint.

#### Response `200 OK`
```json
{
  "status": "healthy",
  "ocr_engine": "tesseract 5.x",
  "version": "1.0.0"
}
```
