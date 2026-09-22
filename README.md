# ScanText OCR SaaS Monorepo (`ocr-saas`)

Production-oriented, lightweight, anonymous Optical Character Recognition (OCR) SaaS web application built with **Next.js**, **FastAPI**, **Tesseract OCR**, **OpenCV**, and **Docker Compose**.

---

## 📁 Repository Structure

```
ocr-saas/
├── docs/                         # Architecture, API specifications, and security docs
│   ├── architecture.md
│   ├── api-specification.md
│   └── security-deployment.md
├── frontend/                     # Next.js 14, TypeScript, Tailwind CSS client web app
│   ├── src/app/                  # App Router pages and layouts
│   ├── src/components/           # Dropzone, FilePreview, OCRControls, ResultArea, ErrorBanner
│   ├── src/services/             # Axios API client wrapper
│   └── Dockerfile
├── backend/                      # Python FastAPI OCR engine
│   ├── app/                      # Main API routers, validator, temp file manager, OCR pipeline
│   ├── tests/                    # pytest unit & API error path test suite
│   ├── requirements.txt
│   └── Dockerfile
├── infrastructure/               # Docker Compose and Nginx reverse proxy configurations
│   ├── nginx/default.conf
│   └── docker-compose.yml
└── README.md
```

---

## ⚡ Key Features

1. **Multi-Format Ingestion**: Supports `.jpg`, `.jpeg`, `.png`, `.webp`, and `.pdf` files.
2. **Binary Magic Byte Security**: Rejects fake extensions by validating initial raw file signature bytes before processing.
3. **Zero-Retention Ephemeral Storage**: Stores files under random UUID v4 filenames in `/tmp/ocr_uploads/` and deletes them automatically after processing.
4. **Interactive Text Workspace**: Editable result area with character/word counters, single-click Copy Text, and `.txt` file download.
5. **No Database Dependency**: Pure stateless single-image/PDF OCR pipeline designed for high performance and privacy.
6. **Container Ready**: Includes production multi-stage Dockerfiles and Nginx reverse proxy configuration.

---

## 🚀 Quickstart & Local Setup

### Option 1: Running with Docker Compose (Recommended)

Make sure you have [Docker](https://www.docker.com/) and Docker Compose installed.

```bash
# 1. Clone or navigate to repository directory
cd ocr-saas

# 2. Start all services (Frontend, Backend, Nginx Proxy)
cd infrastructure
docker-compose up -d --build

# 3. Access applications:
# - Web Application: http://localhost
# - Backend OpenAPI Docs: http://localhost/api/v1/docs
```

---

### Option 2: Running Locally Without Docker

#### Prerequisites
- **Node.js**: v18.x or v20.x
- **Python**: v3.11+
- **Tesseract OCR**: Installed on host machine
  - *Windows*: Download installer from UB-Mannheim Tesseract Wiki and add to PATH.
  - *macOS*: `brew install tesseract tesseract-lang`
  - *Ubuntu/Debian*: `sudo apt-get install tesseract-ocr tesseract-ocr-eng poppler-utils`

#### 1. Setup Backend
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI dev server
uvicorn app.main:app --reload --port 8000
```
Backend will be available at `http://localhost:8000`. OpenAPI docs at `http://localhost:8000/docs`.

#### 2. Setup Frontend
```bash
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
Frontend will be available at `http://localhost:3000`.

---

## 🧪 Running Unit Tests

Backend test suite covers magic byte validation, file size limits, disallowed formats, and API status codes (`400`, `413`, `415`, `422`, `200`).

```bash
cd backend
python -m pytest tests/ -v
```

---

## ⚙️ Environment Variables

| Variable | Scope | Description | Default |
| :--- | :--- | :--- | :--- |
| `MAX_FILE_SIZE_MB` | Backend | Maximum allowed file size in megabytes | `10` |
| `CORS_ORIGINS` | Backend | Allowed CORS origins array | `["http://localhost:3000"]` |
| `TEMP_DIR` | Backend | Directory path for temporary file buffering | `/tmp/ocr_uploads` |
| `TESSERACT_CMD` | Backend | System executable name or absolute path to tesseract | `tesseract` |
| `NEXT_PUBLIC_API_URL`| Frontend | Backend REST API base URL | `http://localhost:8000` |

---

## 📜 License
MIT License. Free for open-source and commercial use.