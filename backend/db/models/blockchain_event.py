"""
Blockchain event model - indexed events from chain.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, JSON

from db.database import Base


class BlockchainEvent(Base):
    """
    Blockchain event model - stores indexed events from smart contracts.
    This is the source of truth for syncing backend state with chain state.
    """
    
    __tablename__ = "blockchain_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Event identification
    event_name = Column(String(100), nullable=False, index=True)
    contract_address = Column(String(42), nullable=False, index=True)
    
    # Transaction details
    transaction_hash = Column(String(66), nullable=False, unique=True, index=True)
    block_number = Column(Integer, nullable=False, index=True)
    block_timestamp = Column(DateTime, nullable=False)
    log_index = Column(Integer, nullable=False)
    
    # Event data
    args = Column(JSON, nullable=False)  # Decoded event arguments
    raw_data = Column(Text, nullable=True)  # Raw event data
    
    # Processing status
    processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime, nullable=True)
    processing_error = Column(Text, nullable=True)
    
    # Timestamps
    indexed_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<BlockchainEvent {self.event_name} tx={self.transaction_hash[:10]}...>"
    
    @property
    def is_pending(self) -> bool:
        """Check if event is pending processing."""
        return not self.processed and self.processing_error is None


# Event types we index
EVENT_TYPES = [
    "AssetRegistered",
    "AssetStatusChanged",
    "AssetRiskLevelChanged",
    "AssetFundingUpdated",
    "InvestmentMade",
    "ReturnsDistributed",
    "ReturnsClaimed",
    "InvestmentExited",
    "PaymentRecorded",
    "MissedPaymentRecorded",
    "DefaultDeclared",
    "RecoveryInitiated",
    "AuctionCreated",
    "BidPlaced",
    "AuctionEnded",
    "AuctionSettled",
    "LossClaimMinted",
    "LossClaimClaimed",
]
