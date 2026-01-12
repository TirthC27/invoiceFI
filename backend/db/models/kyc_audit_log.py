"""
KYC Audit Log model - tracks KYC actions for compliance.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Text, JSON

from db.database import Base


class KYCAuditLog(Base):
    """
    KYC Audit Log model.
    
    Tracks all KYC-related actions for compliance and auditing.
    """
    
    __tablename__ = "kyc_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # User reference
    user_id = Column(Integer, nullable=False, index=True)
    wallet_address = Column(String(42), nullable=False, index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)
    # Actions: document_uploaded, selfie_uploaded, ocr_processed, 
    #          face_match_processed, submitted_for_review, approved, rejected
    
    # Actor (who performed the action)
    actor_address = Column(String(42), nullable=True)  # Null for system actions
    actor_type = Column(String(20), nullable=False)  # user, system, admin, agent
    
    # Additional data
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<KYCAuditLog {self.action} user={self.user_id}>"


# Audit action types
class KYCAuditAction:
    DOCUMENT_UPLOADED = "document_uploaded"
    SELFIE_UPLOADED = "selfie_uploaded"
    OCR_PROCESSED = "ocr_processed"
    FACE_MATCH_PROCESSED = "face_match_processed"
    VERIFICATION_STARTED = "verification_started"
    VERIFICATION_COMPLETED = "verification_completed"
    SUBMITTED_FOR_REVIEW = "submitted_for_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    STATUS_CHANGED = "status_changed"
    DATA_UPDATED = "data_updated"
