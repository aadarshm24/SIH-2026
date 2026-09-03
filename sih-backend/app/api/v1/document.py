# app/api/v1/document.py
"""
Document OCR endpoint.

BUG FIX: Updated import to use the renamed extract_mrz_from_image
(was extract_and_validate_mrz) from ocr_mrz.py to avoid the name
collision with mrz_extractor.extract_and_validate_mrz.
"""
from fastapi import APIRouter, UploadFile, File
from app.services.preprocessor import preprocess_document
from app.services.ocr_mrz import extract_mrz_from_image  # BUG FIX: renamed import

router = APIRouter()


@router.post("/extract-mrz")
async def extract_mrz_endpoint(file: UploadFile = File(...)):
    """Pre-process a document image and extract its MRZ zone."""
    file_bytes     = await file.read()
    straightened_img = preprocess_document(file_bytes)
    result         = extract_mrz_from_image(straightened_img)  # BUG FIX: renamed call
    return {"mrz_data": result}