# app/services/ocr_mrz.py
"""
OCR-based MRZ extraction from pre-processed numpy image arrays.

BUG FIX: Previously this module created its own easyocr.Reader at
import-time, which meant TWO large models were loaded when both
ocr_mrz.py and mrz_extractor.py were imported.  Now we import the
shared singleton reader to keep memory usage minimal.

BUG FIX: Renamed extract_and_validate_mrz → extract_mrz_from_image
to avoid the silent name collision in verification.py that caused the
wrong function to be called.
"""
from mrz.checker.td3 import TD3CodeChecker
from app.services.reader_singleton import get_reader  # lazy singleton — no eager load


def extract_mrz_from_image(cv_image):
    """
    Extract and validate MRZ from a pre-processed OpenCV numpy image array.
    Returns a dict with mrz_detected, is_valid, document_number, raw_mrz.
    """
    try:
        # detail=0 returns only text, not bounding boxes
        results = get_reader().readtext(cv_image, detail=0)

        # Strip spaces — MRZ never contains them
        lines = [line.strip().replace(' ', '') for line in results if len(line.strip()) > 10]

        # Smart MRZ filter: only lines that contain the '<' filler character
        mrz_lines = [line for line in lines if '<' in line]

        # TD3 format: last 2 lines are always the MRZ zone
        if len(mrz_lines) >= 2:
            mrz_code = f"{mrz_lines[-2]}\n{mrz_lines[-1]}"
            try:
                checker = TD3CodeChecker(mrz_code)
                return {
                    "mrz_detected": True,
                    "is_valid": checker.are_valid,
                    "document_number": checker.fields().document_number,
                    "raw_mrz": mrz_code,
                }
            except Exception:
                return {
                    "mrz_detected": False,
                    "error": "Invalid MRZ format / checksum",
                    "raw_text": mrz_code,
                }

        return {"mrz_detected": False, "error": "MRZ text (<) not clearly found in image"}

    except Exception as e:
        return {"status": "FAILED", "error": str(e)}