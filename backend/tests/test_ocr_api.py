from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_root_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_api_v1_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_languages_endpoint():
    response = client.get("/api/v1/languages")
    assert response.status_code == 200
    data = response.json()
    assert "languages" in data
    codes = [item["code"] for item in data["languages"]]
    assert "eng" in codes

def test_ocr_unsupported_file_extension():
    files = {"file": ("test.txt", b"plain text content", "text/plain")}
    response = client.post("/api/v1/ocr", files=files)
    assert response.status_code == 415

def test_ocr_invalid_magic_bytes():
    files = {"file": ("fake.png", b"invalid image bytes header", "image/png")}
    response = client.post("/api/v1/ocr", files=files)
    assert response.status_code == 400
    assert "Magic byte validation failed" in response.json()["detail"]

def test_ocr_oversized_file():
    oversized = b"\x89PNG\r\n\x1a\n" + (b"0" * (settings.MAX_FILE_SIZE_MB * 1024 * 1024 + 100))
    files = {"file": ("large.png", oversized, "image/png")}
    response = client.post("/api/v1/ocr", files=files)
    assert response.status_code == 413

@patch("app.api.router.process_ocr_request")
def test_ocr_successful_extraction(mock_ocr_process):
    mock_ocr_process.return_value = ("Sample extracted text output", 1)
    
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + (b"\x00" * 50)
    files = {"file": ("document.png", png_bytes, "image/png")}
    data = {"language": "eng", "psm": "3"}
    
    response = client.post("/api/v1/ocr", files=files, data=data)
    assert response.status_code == 200
    res = response.json()
    assert "jobId" in res
    assert res["filename"] == "document.png"
    assert res["text"] == "Sample extracted text output"
    assert "processingMs" in res
