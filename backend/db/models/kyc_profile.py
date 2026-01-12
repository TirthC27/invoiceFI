"""
KYC Profile model - stores verified KYC data.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from db.database import Base


class KYCProfile(Base):
    """
    KYC Profile model.
    
    Stores extracted and verified KYC data.
    OCR output may be mocked in Phase 2, but:
    - KYC status is REAL and enforced
    - KYC completion is required for protected operations
    """
    
    __tablename__ = "kyc_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    wallet_address = Column(String(42), nullable=False, index=True)
    
    # Document CIDs (stored on IPFS)
    document_cid = Column(String(100), nullable=True)
    selfie_cid = Column(String(100), nullable=True)
    
    # Extracted data (from OCR - may be mocked in Phase 2)
    full_name = Column(String(200), nullable=True)
    date_of_birth = Column(String(20), nullable=True)
    document_number = Column(String(100), nullable=True)
    document_type = Column(String(50), nullable=True)  # passport, drivers_license, national_id
    nationality = Column(String(100), nullable=True)
    expiration_date = Column(String(20), nullable=True)
    
    # Full extracted data JSON
    extracted_data = Column(JSON, nullable=True)
    
    # Verification scores (from AI agents)
    ocr_confidence = Column(Float, nullable=True)
    face_match_score = Column(Float, nullable=True)
    name_match_score = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    
    # Review data
    reviewed_by = Column(String(42), nullable=True)  # Admin wallet address
    review_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<KYCProfile user_id={self.user_id}>"
    
    @property
    def is_complete(self) -> bool:
        """Check if KYC profile has all required data."""
        return (
            self.document_cid is not None
            and self.selfie_cid is not None
            and self.full_name is not None
        )
    
    @property
    def verification_passed(self) -> bool:
        """Check if verification scores meet thresholds."""
        if self.overall_score is None:
            return False
        return self.overall_score >= 0.75  # 75% threshold
