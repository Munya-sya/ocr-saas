# ==============================================================================
# ScanText OCR SaaS: Hardened Production Backend Dockerfile (ARM64 & AMD64)
# Debian 12 Bookworm slim base matching Raspberry Pi OS 64-bit
# ==============================================================================

FROM python:3.11-slim-bookworm

# Prevent Python from writing bytecode and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (Tesseract OCR + languages + Poppler for PDF + OpenCV deps + curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-deu \
    tesseract-ocr-fra \
    tesseract-ocr-spa \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security (Least Privilege Principle)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create temporary upload directory and set permissions for appuser
RUN mkdir -p /tmp/ocr_uploads && chown -R appuser:appuser /tmp/ocr_uploads /app

# Copy application source code (filtered strictly by .dockerignore)
COPY . .
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
