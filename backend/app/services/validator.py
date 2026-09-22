import os
from fastapi import HTTPException, status
from app.core.config import settings

def detect_file_type_by_magic_bytes(header_bytes: bytes) -> str | None:
    """
    Validates file format by examining initial binary magic bytes.
    Returns detected extension string e.g. '.jpg', '.png', '.webp', '.pdf' or None if invalid.
    """
    if len(header_bytes) < 4:
        return None

    # JPEG signature: FF D8 FF
    if header_bytes.startswith(b"\xFF\xD8\xFF"):
        return ".jpg"

    # PNG signature: 89 50 4E 47 0D 0A 1A 0A (\x89PNG\r\n\x1a\n)
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"

    # PDF signature: %PDF-
    if header_bytes.startswith(b"%PDF-"):
        return ".pdf"

    # WEBP signature: RIFF (4 bytes) + filesize (4 bytes) + WEBP (4 bytes)
    if len(header_bytes) >= 12 and header_bytes.startswith(b"RIFF") and header_bytes[8:12] == b"WEBP":
        return ".webp"

    return None


def validate_upload_file(filename: str, header_bytes: bytes, file_size_bytes: int):
    """
    Enforces extension allowed, magic bytes matching, and size limits.
    Raises HTTPException with appropriate status codes if invalid.
    """
    # 1. Extension check
    ext = os.path.splitext(filename.lower())[1]
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(settings.ALLOWED_EXTENSIONS))}"
        )

    # 2. File size check
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size_bytes / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB} MB."
        )

    # 3. Magic bytes signature check
    detected_type = detect_file_type_by_magic_bytes(header_bytes)
    if not detected_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file binary signature. Magic byte validation failed."
        )

    # Normalize .jpeg to .jpg for signature matching validation
    norm_ext = ".jpg" if ext == ".jpeg" else ext
    if detected_type != norm_ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File signature ({detected_type}) does not match file extension ({ext})."
        )
