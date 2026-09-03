# app/db/models.py
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Index
from datetime import datetime
from app.db.session import Base


class BlacklistedDocument(Base):
    __tablename__ = "blacklisted_documents"

    id              = Column(Integer, primary_key=True, index=True)
    document_number = Column(String, unique=True, index=True, nullable=False)
    holder_name     = Column(String, nullable=True)
    # e.g. "Interpol Wanted", "Fraudulent History", "Lookout Circular"
    reason          = Column(String, nullable=False)
    added_at        = Column(DateTime, default=datetime.utcnow)


class VerificationLog(Base):
    __tablename__ = "verification_logs"

    id               = Column(Integer, primary_key=True, index=True)
    document_number  = Column(String, index=True, nullable=True)
    trust_score      = Column(Float, nullable=False)
    risk_level       = Column(String, nullable=False)
    face_similarity  = Column(Float, nullable=False)
    mrz_valid        = Column(Boolean, nullable=False)
    ela_score        = Column(Float, nullable=False)
    forgery_detected = Column(Boolean, nullable=False)
    officer_summary  = Column(String, nullable=True)
    # EFFICIENCY FIX: index=True lets ORDER BY timestamp DESC use an index scan
    # instead of a full-table sort — critical once logs grow beyond ~10k rows.
    timestamp        = Column(DateTime, default=datetime.utcnow, index=True)