import os
import uuid
from contextlib import contextmanager
from app.core.config import settings

def ensure_temp_directory() -> str:
    """Ensures the temporary upload directory exists."""
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    return settings.TEMP_DIR

@contextmanager
def temporary_upload_file(file_bytes: bytes, original_extension: str):
    """
    Context manager that saves uploaded file bytes to a temporary file
    with a secure UUID v4 filename, and guarantees deletion upon exit.
    """
    temp_dir = ensure_temp_directory()
    secure_filename = f"{uuid.uuid4()}{original_extension}"
    file_path = os.path.join(temp_dir, secure_filename)

    try:
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        yield file_path, secure_filename
    finally:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
