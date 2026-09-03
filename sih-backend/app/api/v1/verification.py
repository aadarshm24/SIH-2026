# app/api/v1/verification.py
"""
Master Verification Pipeline.

DEMO MODE: When easyocr / insightface / torch are not yet installed,
the endpoint falls back to realistic simulated results so the complete
UI flow (Intake → Processing → Evidence Dashboard) works immediately.
Real ML inference is used automatically once the packages are available.
"""
import os
import tempfile
import shutil
import hashlib
import json

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import VerificationLog, BlacklistedDocument
from app.services.scoring_engine import calculate_trust_score
from app.services.blockchain import record_audit_on_blockchain
from app.services.mrz_extractor import extract_and_validate_mrz


# ── Detect which ML packages are available ────────────────────────────────────
try:
    import cv2 as _cv2_check  # noqa: F401
    from app.services.forensics_engine import run_ela, copy_move_detection
    _FORENSICS_AVAILABLE = True
except (ImportError, Exception):
    _FORENSICS_AVAILABLE = False

try:
    import insightface as _insightface_check  # noqa: F401
    from app.services.face_engine import get_face_embedding, calculate_cosine_similarity
    _FACE_AVAILABLE = True
except (ImportError, Exception):
    _FACE_AVAILABLE = False

try:
    # Actually try to import easyocr itself — importing get_reader always
    # succeeds (it's just a function), so we must check the real dependency.
    import easyocr as _easyocr_check  # noqa: F401
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False


def _mock_mrz_from_file(file_path: str) -> dict:
    """
    Generate a deterministic-but-realistic MRZ result from the file hash
    when easyocr is not installed.  Uses the file content to seed values
    so repeated calls with the same file give the same output.
    """
    with open(file_path, "rb") as f:
        file_hash = hashlib.md5(f.read()).hexdigest()

    # Seed a doc number from the file hash (looks like a real passport number)
    doc_number = f"P{file_hash[:8].upper()}"
    return {
        "document_number": doc_number,
        "name":            "DEMO TRAVELER",
        "nationality":     "IND",
        "is_valid":        True,
        "raw_text":        "[DEMO MODE — easyocr not installed]",
        "detected_lines":  [],
        "_demo_mode":      True,
    }


def _mock_face_similarity(doc_path: str, live_path: str) -> float:
    """Return a plausible similarity score seeded from the two file hashes."""
    with open(doc_path,  "rb") as f: h1 = int(hashlib.md5(f.read()).hexdigest(), 16)
    with open(live_path, "rb") as f: h2 = int(hashlib.md5(f.read()).hexdigest(), 16)
    # XOR the hashes, map to [0.50, 0.90] range for a "good match" demo
    raw = (h1 ^ h2) % 10000
    return round(0.50 + (raw / 10000) * 0.40, 4)


# ─────────────────────────────────────────────────────────────────────────────

class BlacklistRequest(BaseModel):
    document_number: str
    holder_name: str
    reason: str


router = APIRouter()


@router.post("/add-blacklist")
async def add_to_blacklist(data: BlacklistRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(BlacklistedDocument)
        .filter(BlacklistedDocument.document_number == data.document_number.strip())
        .first()
    )
    if existing:
        return {"status": "FAILED", "message": "This document number is already on the blacklist."}

    db.add(BlacklistedDocument(
        document_number=data.document_number.strip(),
        holder_name=data.holder_name,
        reason=data.reason,
    ))
    db.commit()
    return {"status": "SUCCESS", "message": f"Document {data.document_number} blacklisted."}


@router.post("/verify-document")
async def verify_document_master(
    document:   UploadFile = File(...),
    live_photo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    doc_suffix  = os.path.splitext(document.filename  or ".jpg")[1] or ".jpg"
    live_suffix = os.path.splitext(live_photo.filename or ".jpg")[1] or ".jpg"

    doc_fd,  doc_path  = tempfile.mkstemp(suffix=doc_suffix)
    live_fd, live_path = tempfile.mkstemp(suffix=live_suffix)
    os.close(doc_fd);  os.close(live_fd)

    demo_mode = not (_OCR_AVAILABLE and _FACE_AVAILABLE and _FORENSICS_AVAILABLE)

    try:
        with open(doc_path,  "wb") as buf: shutil.copyfileobj(document.file,   buf)
        with open(live_path, "wb") as buf: shutil.copyfileobj(live_photo.file, buf)

        # ── MRZ Extraction ────────────────────────────────────────────────────
        if _OCR_AVAILABLE:
            mrz_result = extract_and_validate_mrz(doc_path)
        else:
            mrz_result = _mock_mrz_from_file(doc_path)

        doc_number = mrz_result.get("document_number", "UNKNOWN").strip()
        mrz_valid  = mrz_result.get("is_valid", False)

        # ── Blacklist Check ───────────────────────────────────────────────────
        is_blacklisted_flag = False
        if doc_number != "UNKNOWN":
            if db.query(BlacklistedDocument).filter(
                BlacklistedDocument.document_number == doc_number
            ).first():
                is_blacklisted_flag = True

        # ── Image Forensics ───────────────────────────────────────────────────
        if _FORENSICS_AVAILABLE:
            ela_score  = run_ela(doc_path)
            copy_move  = copy_move_detection(doc_path)
            forgery_flag = copy_move.get("forgery_detected", False)
        else:
            # Realistic demo: clean document
            ela_score    = round(1.2 + (os.path.getsize(doc_path) % 100) / 100, 2)
            forgery_flag = False
            copy_move    = {"forgery_detected": False, "suspicious_matches": 0, "_demo_mode": True}

        # ── Face Biometrics ───────────────────────────────────────────────────
        if _FACE_AVAILABLE:
            with open(doc_path,  "rb") as f: doc_bytes  = f.read()
            with open(live_path, "rb") as f: live_bytes = f.read()
            doc_embedding  = get_face_embedding(doc_bytes)
            live_embedding = get_face_embedding(live_bytes)
            if doc_embedding is None or live_embedding is None:
                raise HTTPException(
                    status_code=400,
                    detail="Could not detect a face in the document or live photo.",
                )
            similarity = calculate_cosine_similarity(doc_embedding, live_embedding)
        else:
            similarity = _mock_face_similarity(doc_path, live_path)

        is_face_match = similarity >= 0.45

        # ── Trust Score ───────────────────────────────────────────────────────
        scoring_result = calculate_trust_score(
            mrz_valid=mrz_valid,
            ela_score=ela_score,
            copy_move_detected=forgery_flag,
            face_similarity=similarity,
            is_blacklisted=is_blacklisted_flag,
        )

        # ── Persist to DB ─────────────────────────────────────────────────────
        db_log = VerificationLog(
            document_number  = doc_number,
            trust_score      = scoring_result["trust_score"],
            risk_level       = scoring_result["risk_level"],
            face_similarity  = round(similarity, 4),
            mrz_valid        = mrz_valid,
            ela_score        = round(ela_score, 2),
            forgery_detected = forgery_flag,
            officer_summary  = scoring_result["officer_summary"],
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)

        # ── Blockchain Audit ──────────────────────────────────────────────────
        bc_proof = record_audit_on_blockchain(
            log_id=db_log.id,
            document_number=doc_number,
            trust_score=scoring_result["trust_score"],
            risk_level=scoring_result["risk_level"],
        )

        return {
            "status":           "SUCCESS",
            "log_id":           db_log.id,
            "demo_mode":        demo_mode,
            "blockchain_audit": bc_proof,
            "scoring":          scoring_result,
            "details": {
                "mrz_check": mrz_result,
                "forensics": {
                    "ela_score":          round(ela_score, 2),
                    "copy_move_detected": forgery_flag,
                },
                "face_biometrics": {
                    "similarity_score": round(similarity, 4),
                    "is_match":         is_face_match,
                },
            },
        }

    finally:
        for path in (doc_path, live_path):
            if os.path.exists(path):
                os.remove(path)


@router.get("/audit-logs")
async def get_audit_logs(
    db:     Session = Depends(get_db),
    limit:  int     = Query(default=100, ge=1, le=500),
    offset: int     = Query(default=0,   ge=0),
):
    total = db.query(VerificationLog).count()
    logs  = (
        db.query(VerificationLog)
        .order_by(VerificationLog.timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "status":        "SUCCESS",
        "total_records": total,
        "returned":      len(logs),
        "limit":         limit,
        "offset":        offset,
        "logs":          logs,
    }