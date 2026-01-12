"""
User model for authentication and roles.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Boolean, Integer
from sqlalchemy.orm import relationship

from db.database import Base


class UserRole(str, Enum):
    """User roles - stored server-side, not mocked."""
    INVESTOR = "investor"
    ASSET_ISSUER = "asset_issuer"
    RECOVERY_PARTNER = "recovery_partner"
    ADMIN = "admin"


class KYCStatus(str, Enum):
    """KYC verification status."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    """User model with role-based access control."""
    
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    
    # Role - stored server-side, used for gating
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.INVESTOR)
    
    # KYC Status - enforced, not mocked
    kyc_status = Column(SQLEnum(KYCStatus), nullable=False, default=KYCStatus.NOT_STARTED)
    kyc_completed_at = Column(DateTime, nullable=True)
    kyc_profile_id = Column(Integer, nullable=True)
    
    # Profile
    email = Column(String(255), nullable=True)
    display_name = Column(String(100), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Nonce for wallet signature verification
    nonce = Column(String(64), nullable=True)
    
    def __repr__(self):
        return f"<User {self.wallet_address} role={self.role}>"
    
    @property
    def is_kyc_complete(self) -> bool:
        """Check if user has completed KYC."""
        return self.kyc_status == KYCStatus.APPROVED
    
    def can_access_role(self, required_role: UserRole) -> bool:
        """Check if user has the required role."""
        # Admin can access everything
        if self.role == UserRole.ADMIN:
            return True
        return self.role == required_role
