from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import engine
from app.db.models import Base

# Apne DB session ko import kar rahe hain
from app.db.session import get_db

# 🚀 NAYA: Apne Document OCR API ko import kar rahe hain
from app.api.v1 import document, forensics, face, verification

app = FastAPI(title="SIH Backend - Phase 3")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/")
def health_check():
    return {"status": "SUCCESS", "message": "Phase 1: Base Server is LIVE!"}

@app.get("/test-db")
def test_database(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "SUCCESS", "message": "Phase 2: Database se Connection Makkhan hai!"}
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}

# 🚀 NAYA: FastAPI ko bol rahe hain ki document wale APIs ko list me add kare
app.include_router(document.router, prefix="/api/v1/document", tags=["Document AI"])
app.include_router(forensics.router, prefix="/api/v1/forensics", tags=["Image Forensics"])
app.include_router(face.router, prefix="/api/v1/face", tags=["Face Biometrics"])
app.include_router(verification.router, prefix="/api/v1", tags=["Master Verification Pipeline"])