"""
Recovery bid model for auction tracking.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Numeric, Boolean, Integer
from uuid import uuid4

from db.database import Base


class RecoveryBid(Base):
    """Recovery auction bid tracking."""
    
    __tablename__ = "recovery_bids"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Asset reference
    asset_address = Column(String(66), nullable=False, index=True)
    asset_id = Column(String(66), nullable=False, index=True)
    
    # Bidder
    bidder_wallet = Column(String(42), nullable=False, index=True)
    bidder_user_id = Column(Integer, nullable=True)
    
    # Bid details
    amount = Column(Numeric(78, 0), nullable=False)  # Wei precision
    bid_number = Column(Integer, nullable=False)  # Sequence number
    
    # Status
    is_winning = Column(Boolean, default=False)
    is_accepted = Column(Boolean, default=False)
    
    # Blockchain reference
    transaction_hash = Column(String(66), nullable=True, index=True)
    block_number = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    accepted_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<RecoveryBid asset={self.asset_address[:10]} bidder={self.bidder_wallet[:10]} amount={self.amount}>"
