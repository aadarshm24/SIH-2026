# app/services/reader_singleton.py
"""
Shared EasyOCR reader singleton.

IMPROVEMENT: Lazy initialisation — the reader is only loaded on the first
actual OCR call rather than at import-time.  This lets the FastAPI server
boot even if easyocr / torch aren't installed, and means the heavy model
(~400 MB) doesn't block the startup of unrelated health-check endpoints.

Previously both ocr_mrz.py and mrz_extractor.py each created their own
Reader at import-time, wasting ~2 GB of RAM and doubling startup time.
Now both modules share this single lazily-created instance.
"""

_reader = None  # Lazy singleton


def get_reader():
    """Return the shared EasyOCR English reader, initialising it on first call."""
    global _reader
    if _reader is None:
        try:
            import easyocr
            print("[reader_singleton] Loading EasyOCR model (one-time initialisation)...")
            _reader = easyocr.Reader(['en'], gpu=False)
            print("[reader_singleton] EasyOCR model loaded successfully.")
        except ImportError as e:
            raise RuntimeError(
                f"EasyOCR is not installed. Run: pip install easyocr. "
                f"Original error: {e}"
            )
    return _reader
