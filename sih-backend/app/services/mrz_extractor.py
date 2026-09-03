# app/services/mrz_extractor.py
"""
MRZ extraction from file paths (used by the master verification pipeline).

BUG FIX: Previously created its own easyocr.Reader at import-time.
Now imports the shared singleton to avoid double-loading the model.
"""
import re
from app.services.reader_singleton import get_reader  # lazy singleton — no eager load


def extract_and_validate_mrz(image_path_or_array):
    """
    Extract MRZ fields from an image file path or numpy array.
    Returns document_number, name, nationality, is_valid, raw_text, detected_lines.
    """
    results   = get_reader().readtext(image_path_or_array, detail=0)
    full_text = "\n".join(results)
    mrz_lines = [
        line.strip()
        for line in results
        if '<' in line or len(line.strip()) >= 15
    ]

    doc_number         = "UNKNOWN"
    parsed_name        = "UNKNOWN TRAVELER"
    parsed_dob         = "UNKNOWN"
    parsed_nationality = "GBR"
    is_valid           = False

    if len(mrz_lines) >= 2:
        line1 = mrz_lines[0]
        line2 = mrz_lines[1]

        # Parse Document Number from Line 2 (first 9 chars, alphanumeric + '<')
        doc_match = re.search(r'^[A-Z0-9<]{9}', line2)
        if doc_match:
            doc_number = doc_match.group(0).replace('<', '').strip()
            is_valid   = True

        # Parse Name from Line 1 (e.g. P<GBRFELLMAN<<JOSEPH<PEREGRINE...)
        parts = line1.split('<<')
        if len(parts) > 1:
            surname    = parts[0].replace('P<', '').replace('<', ' ').strip()
            given_names = parts[1].replace('<', ' ').strip()
            parsed_name = f"{given_names} {surname}".upper()

        # Parse Nationality from Line 1
        nat_match = re.search(r'P<([A-Z]{3})', line1)
        if nat_match:
            parsed_nationality = nat_match.group(1)

    return {
        "document_number": doc_number,
        "name":            parsed_name,
        "nationality":     parsed_nationality,
        "is_valid":        is_valid,
        "raw_text":        full_text,
        "detected_lines":  mrz_lines,
    }