import io
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from app.main import app
from app.db.database import init_db
from app.worker.tasks import process_job_pipeline

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()

def create_sample_png_bytes(text: str = "Async Test Job Passed"):
    img = Image.new("RGB", (500, 150), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((20, 50), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()

@patch("app.api.jobs_router.process_ocr_job_async.delay")
@patch("app.worker.tasks.perform_ocr_on_pil_image", return_value="Mocked Async OCR Text Success")
def test_async_job_lifecycle(mock_ocr, mock_celery_delay):
    png_bytes = create_sample_png_bytes("Async Lifecycle Test")

    # 1. Submit async job
    response = client.post(
        "/api/v1/jobs",
        files={"file": ("test_async.png", png_bytes, "image/png")},
        data={"language": "eng", "psm": "3", "preprocess_mode": "auto"}
    )
    assert response.status_code == 202
    data = response.json()
    assert "jobId" in data
    assert data["status"] == "queued"
    job_id = data["jobId"]

    # 2. Run job pipeline directly
    process_job_pipeline(job_id)

    # 3. Verify status & result
    status_resp = client.get(f"/api/v1/jobs/{job_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "completed"

    result_resp = client.get(f"/api/v1/jobs/{job_id}/result")
    assert result_resp.status_code == 200
    assert result_resp.json()["text"] == "Mocked Async OCR Text Success"

@patch("app.api.jobs_router.process_ocr_job_async.delay")
def test_async_job_cancel(mock_celery_delay):
    png_bytes = create_sample_png_bytes("Cancel Test Job")

    response = client.post(
        "/api/v1/jobs",
        files={"file": ("cancel_test.png", png_bytes, "image/png")},
        data={"language": "eng", "psm": "3"}
    )
    assert response.status_code == 202
    job_id = response.json()["jobId"]

    cancel_resp = client.delete(f"/api/v1/jobs/{job_id}")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

def test_async_job_not_found():
    resp = client.get("/api/v1/jobs/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404
