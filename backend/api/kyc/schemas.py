"""
KYC API schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class KYCStatusResponse(BaseModel):
    """KYC status response."""
    status: str
    is_complete: bool
    has_document: bool
    has_selfie: bool
    verification_score: Optional[float] = None
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None


class KYCExtractedData(BaseModel):
    """Extracted data from document OCR."""
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    document_number: Optional[str] = None
    document_type: Optional[str] = None
    nationality: Optional[str] = None
    expiration_date: Optional[str] = None
    confidence: float = 0.0
    raw_text: Optional[str] = None


class KYCProfileResponse(BaseModel):
    """KYC profile response."""
    wallet_address: str
    document_cid: Optional[str] = None
    selfie_cid: Optional[str] = None
    full_name: Optional[str] = None
    document_type: Optional[str] = None
    ocr_confidence: Optional[float] = None
    face_match_score: Optional[float] = None
    overall_score: Optional[float] = None
    status: str
    submitted_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None


class KYCSubmitRequest(BaseModel):
    """KYC submission request."""
    confirm: bool = Field(..., description="Confirm submission for review")


class KYCReviewRequest(BaseModel):
    """KYC review request (admin)."""
    approved: bool
    reason: Optional[str] = None
    notes: Optional[str] = None


class FaceMatchResult(BaseModel):
    """Face matching result."""
    match_score: float
    is_match: bool
    confidence: float
    details: Optional[dict] = None
