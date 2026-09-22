import pytest
from fastapi import HTTPException
from app.services.validator import detect_file_type_by_magic_bytes, validate_upload_file
from app.core.config import settings

def test_detect_jpg_magic_bytes():
    jpg_header = b"\xFF\xD8\xFF\xE0\x00\x10JFIF"
    assert detect_file_type_by_magic_bytes(jpg_header) == ".jpg"

def test_detect_png_magic_bytes():
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert detect_file_type_by_magic_bytes(png_header) == ".png"

def test_detect_pdf_magic_bytes():
    pdf_header = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3"
    assert detect_file_type_by_magic_bytes(pdf_header) == ".pdf"

def test_detect_webp_magic_bytes():
    webp_header = b"RIFF\x24\x00\x00\x00WEBPVP8 "
    assert detect_file_type_by_magic_bytes(webp_header) == ".webp"

def test_detect_invalid_magic_bytes():
    text_header = b"Hello world, this is a plain text file"
    assert detect_file_type_by_magic_bytes(text_header) is None

def test_validate_upload_file_valid_png():
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    # Should not raise exception
    validate_upload_file("test.png", png_header, 1024)

def test_validate_upload_file_unsupported_extension():
    header = b"\x89PNG\r\n\x1a\n"
    with pytest.raises(HTTPException) as exc_info:
        validate_upload_file("test.exe", header, 1024)
    assert exc_info.value.status_code == 415

def test_validate_upload_file_oversized():
    png_header = b"\x89PNG\r\n\x1a\n"
    oversized_bytes = (settings.MAX_FILE_SIZE_MB + 1) * 1024 * 1024
    with pytest.raises(HTTPException) as exc_info:
        validate_upload_file("large.png", png_header, oversized_bytes)
    assert exc_info.value.status_code == 413

def test_validate_upload_file_invalid_magic_bytes():
    fake_header = b"This is fake png data"
    with pytest.raises(HTTPException) as exc_info:
        validate_upload_file("fake.png", fake_header, 1024)
    assert exc_info.value.status_code == 400
