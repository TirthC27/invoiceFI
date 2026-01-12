"""
Asset model for tokenized real-world assets.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Integer, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship

from db.database import Base


class AssetStatus(str, Enum):
    """Asset lifecycle status - mirrors on-chain status."""
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    FUNDED = "funded"
    PERFORMING = "performing"
    DELINQUENT = "delinquent"
    DEFAULT = "default"
    RECOVERED = "recovered"
    CLOSED = "closed"


class RiskLevel(str, Enum):
    """Risk classification levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Asset(Base):
    """
    Asset model - indexed from blockchain.
    This is the backend's view of on-chain asset state.
    """
    
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # On-chain identity
    asset_id = Column(String(66), unique=True, nullable=False, index=True)  # bytes32 hex
    issuer_address = Column(String(42), nullable=False, index=True)
    
    # Metadata
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    asset_type = Column(String(50), nullable=False)  # real_estate, invoice, equipment
    document_cid = Column(String(100), nullable=True)  # IPFS CID
    fingerprint_hash = Column(String(66), nullable=True)  # SHA-256 hash
    
    # Financials (indexed from chain)
    total_value = Column(Numeric(36, 18), nullable=False)  # Wei precision
    funding_goal = Column(Numeric(36, 18), nullable=False)
    funded_amount = Column(Numeric(36, 18), default=0)
    expected_yield = Column(Integer, nullable=False)  # Basis points
    term_days = Column(Integer, nullable=False)
    
    # Status (synced with chain)
    status = Column(SQLEnum(AssetStatus), nullable=False, default=AssetStatus.DRAFT)
    risk_level = Column(SQLEnum(RiskLevel), nullable=False, default=RiskLevel.MEDIUM)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    funding_deadline = Column(DateTime, nullable=True)
    maturity_date = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    
    # Blockchain reference
    creation_tx_hash = Column(String(66), nullable=True)
    creation_block = Column(Integer, nullable=True)
    
    # AI Agent data
    ai_verification_score = Column(Integer, nullable=True)  # 0-100
    ai_extracted_data = Column(Text, nullable=True)  # JSON
    
    # Relationships
    issuer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    def __repr__(self):
        return f"<Asset {self.asset_id[:10]}... status={self.status}>"
    
    @property
    def funding_progress(self) -> float:
        """Calculate funding progress percentage."""
        if self.funding_goal == 0:
            return 0
        return float(self.funded_amount / self.funding_goal * 100)
    
    @property
    def is_investable(self) -> bool:
        """Check if asset can receive investments."""
        return self.status in [AssetStatus.ACTIVE, AssetStatus.FUNDED]
    
    @property
    def is_defaulted(self) -> bool:
        """Check if asset is in default."""
        return self.status == AssetStatus.DEFAULT
