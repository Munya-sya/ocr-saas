import os
from pypdf import PdfReader
from pdf2image import convert_from_path
from PIL import Image
from fastapi import HTTPException, status
from app.core.config import settings
from app.services.ocr_engine import perform_ocr_on_pil_image, clean_extracted_text

def process_pdf_file(
    file_path: str,
    language: str = "eng",
    psm: int = 3,
    preprocess_mode: str = "auto",
    on_page_complete=None
) -> tuple[str, int]:
    """
    Hybrid PDF Processor:
    1. Attempts direct text extraction first using pypdf.
       If character yield on a page > 50 chars, bypasses OCR for maximum speed.
    2. For scanned pages (no text), renders to PIL image using pdf2image
       and executes OpenCV preprocessing + PyTesseract OCR.
    """
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target PDF file not found."
        )

    try:
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or invalid PDF file header: {str(e)}"
        )

    if total_pages > settings.MAX_PDF_PAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"PDF page count ({total_pages}) exceeds maximum allowed limit of {settings.MAX_PDF_PAGES} pages."
        )

    extracted_pages = []

    # Attempt page-by-page direct text vs scanned OCR fallback
    for i, page in enumerate(reader.pages, start=1):
        try:
            raw_page_text = page.extract_text() or ""
            cleaned = clean_extracted_text(raw_page_text)
        except Exception:
            cleaned = ""

        # If direct text extraction yields > 50 valid characters, use it directly!
        if len(cleaned.strip()) >= 50:
            extracted_pages.append(f"--- Page {i} ---\n{cleaned}")
        else:
            # Fallback for scanned page: render to image and run OCR
            try:
                images = convert_from_path(file_path, first_page=i, last_page=i)
                if images:
                    page_ocr_text = perform_ocr_on_pil_image(
                        images[0],
                        language=language,
                        psm=psm,
                        preprocess_mode=preprocess_mode
                    )
                    extracted_pages.append(f"--- Page {i} ---\n{page_ocr_text}")
                else:
                    extracted_pages.append(f"--- Page {i} ---\n[No readable page content]")
            except Exception as ocr_err:
                extracted_pages.append(f"--- Page {i} ---\n[OCR Error: {str(ocr_err)}]")

        if on_page_complete:
            try:
                on_page_complete(i, total_pages)
            except Exception:
                pass

    full_text = "\n\n".join(extracted_pages)
    return full_text, total_pages
