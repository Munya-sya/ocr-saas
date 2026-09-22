import os
import re
import shutil
import cv2
import numpy as np
from PIL import Image, ImageOps
import pytesseract
from pdf2image import convert_from_path
from fastapi import HTTPException, status
from app.core.config import settings

# Configure pytesseract tesseract cmd path
def configure_tesseract_path():
    if settings.TESSERACT_CMD and settings.TESSERACT_CMD != "tesseract":
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        return

    if shutil.which("tesseract"):
        pytesseract.pytesseract.tesseract_cmd = "tesseract"
        return

    win_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for win_path in win_paths:
        if os.path.exists(win_path):
            pytesseract.pytesseract.tesseract_cmd = win_path
            return

    pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

configure_tesseract_path()


def deskew_image(cv_img: np.ndarray) -> np.ndarray:
    """
    Detects text skew angle in the image using OpenCV minAreaRect
    and rotates the image back to 0 degrees alignment.
    """
    try:
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY) if len(cv_img.shape) == 3 else cv_img.copy()
        blur = cv2.GaussianBlur(gray, (9, 9), 0)
        thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Dilate text lines to form unified rectangular contours
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (30, 5))
        dilate = cv2.dilate(thresh, kernel, iterations=2)

        contours, _ = cv2.findContours(dilate, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return cv_img

        # Find largest contour (main text region)
        largest_contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(largest_contour) < 100:
            return cv_img

        rect = cv2.minAreaRect(largest_contour)
        angle = rect[-1]

        # Normalize OpenCV angle convention
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle

        # Only correct minor skews between 0.5 and 45 degrees
        if abs(angle) > 0.5 and abs(angle) < 45.0:
            (h, w) = cv_img.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            rotated = cv2.warpAffine(
                cv_img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
            )
            return rotated
    except Exception:
        pass
    return cv_img


def add_border_padding(cv_img: np.ndarray, padding: int = 20) -> np.ndarray:
    """
    Adds a solid white border around the image to prevent Tesseract
    from dropping characters touching the edge of the image.
    """
    try:
        return cv2.copyMakeBorder(
            cv_img, padding, padding, padding, padding,
            cv2.BORDER_CONSTANT, value=[255, 255, 255]
        )
    except Exception:
        return cv_img


def apply_clahe_contrast(gray_img: np.ndarray) -> np.ndarray:
    """
    Applies Contrast Limited Adaptive Histogram Equalization (CLAHE)
    to balance lighting across low-contrast images.
    """
    try:
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        return clahe.apply(gray_img)
    except Exception:
        return gray_img


def preprocess_image(cv_img: np.ndarray, mode: str = "auto") -> np.ndarray:
    """
    Advanced multi-stage image preprocessing pipeline:
    1. Skew angle correction (deskewing)
    2. Rescaling low-DPI images
    3. CLAHE contrast enhancement & noise filtering
    4. Adaptive / Otsu Binarization
    5. White border margin padding
    """
    if mode == "raw":
        return cv_img

    # Step 1: Auto-deskew
    cv_img = deskew_image(cv_img)

    # Step 2: Convert to Grayscale
    if len(cv_img.shape) == 3:
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = cv_img.copy()

    # Step 3: Rescale low-resolution images for 300 DPI Tesseract target
    height, width = gray.shape[:2]
    if width < 1200 or height < 1200:
        scale = max(2.0, 1200.0 / min(width, height))
        gray = cv2.resize(gray, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    if mode == "photo":
        # Mode for photos/complex backgrounds: CLAHE + Bilateral Filter
        gray = apply_clahe_contrast(gray)
        filtered = cv2.bilateralFilter(gray, 9, 75, 75)
        _, thresh = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    elif mode == "document":
        # Mode for scanned documents: Crisp Adaptive Thresholding
        denoised = cv2.medianBlur(gray, 3)
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
    else:
        # Default Auto Mode: CLAHE + Otsu Binarization
        enhanced = apply_clahe_contrast(gray)
        denoised = cv2.medianBlur(enhanced, 3)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Step 5: Add 20px solid white border padding
    final_img = add_border_padding(thresh, padding=20)
    return final_img


def clean_extracted_text(text: str) -> str:
    """
    Cleans and normalizes extracted OCR text output:
    - Removes isolated stray artifact characters (e.g. lone '~', '^', '`', '|')
    - Normalizes consecutive blank lines
    - Strips leading/trailing whitespace
    """
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines = []

    for line in lines:
        stripped = line.strip()
        # Filter out lone single-symbol noise lines (e.g. "~", "|", "`")
        if len(stripped) == 1 and not stripped.isalnum():
            continue
        cleaned_lines.append(line.rstrip())

    result = "\n".join(cleaned_lines)

    # Normalize excessive blank lines (more than 2) to maximum 2 blank lines
    result = re.sub(r'\n{3,}', '\n\n', result)
    return result.strip()


def perform_ocr_on_pil_image(
    pil_img: Image.Image,
    language: str,
    psm: int = 3,
    preprocess_mode: str = "auto"
) -> str:
    """
    Applies EXIF rotation correction, multi-stage OpenCV preprocessing,
    PyTesseract OCR, and text cleanup. Never logs raw extracted text.
    """
    try:
        pil_img = ImageOps.exif_transpose(pil_img)
    except Exception:
        pass

    custom_config = f"--psm {psm}"

    try:
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        processed_img = preprocess_image(cv_img, mode=preprocess_mode)
        text = pytesseract.image_to_string(processed_img, lang=language, config=custom_config)
        cleaned = clean_extracted_text(text)
        if cleaned:
            return cleaned
    except Exception:
        pass

    # Fallback pass: Direct PIL image OCR
    raw_text = pytesseract.image_to_string(pil_img, lang=language, config=custom_config)
    return clean_extracted_text(raw_text)


def process_ocr_request(
    file_path: str,
    extension: str,
    language: str = "eng",
    psm: int = 3,
    preprocess_mode: str = "auto"
) -> tuple[str, int]:
    """
    Processes image or PDF file and returns (extracted_text, total_pages).
    Raises HTTPException if language is unsupported or processing fails.
    Extracted text is strictly returned to caller and never logged to stdout/stderr.
    """
    if language not in settings.SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language code '{language}'. Supported languages: {list(settings.SUPPORTED_LANGUAGES.keys())}"
        )

    try:
        ext = extension.lower()
        if ext == ".pdf":
            images = convert_from_path(file_path)
            if not images:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="PDF file contains no readable pages."
                )

            extracted_pages = []
            for i, page_img in enumerate(images, start=1):
                page_text = perform_ocr_on_pil_image(
                    page_img, language, psm=psm, preprocess_mode=preprocess_mode
                )
                extracted_pages.append(f"--- Page {i} ---\n{page_text}")

            full_text = "\n\n".join(extracted_pages)
            return full_text, len(images)

        else:
            with Image.open(file_path) as pil_img:
                text = perform_ocr_on_pil_image(
                    pil_img, language, psm=psm, preprocess_mode=preprocess_mode
                )
                return text, 1

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR engine failure during text extraction: {str(e)}"
        )
