"""
Investment model - tracks investor positions.
"""

from datetime import datetime
from decimal import Decimal
from sqlalchemy import Column, String, DateTime, Integer, Numeric, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from db.database import Base


class Investment(Base):
    """
    Investment position model - indexed from blockchain.
    Tracks investor positions in assets.
    """
    
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # On-chain identity
    investment_id = Column(String(66), unique=True, nullable=False, index=True)  # bytes32 hex
    asset_id = Column(String(66), nullable=False, index=True)
    investor_address = Column(String(42), nullable=False, index=True)
    
    # Investment details (from chain)
    amount = Column(Numeric(36, 18), nullable=False)  # Wei
    shares = Column(Numeric(36, 18), nullable=False)
    expected_return = Column(Numeric(36, 18), nullable=False)
    claimed_returns = Column(Numeric(36, 18), default=0)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_exited = Column(Boolean, default=False)
    
    # Timestamps
    invested_at = Column(DateTime, nullable=False)
    exited_at = Column(DateTime, nullable=True)
    last_claim_at = Column(DateTime, nullable=True)
    last_synced_at = Column(DateTime, default=datetime.utcnow)
    
    # Blockchain reference
    investment_tx_hash = Column(String(66), nullable=True)
    investment_block = Column(Integer, nullable=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    def __repr__(self):
        return f"<Investment {self.investment_id[:10]}... amount={self.amount}>"
    
    @property
    def pending_returns(self) -> Decimal:
        """Calculate pending unclaimed returns."""
        return self.expected_return - self.claimed_returns
    
    @property
    def current_value(self) -> Decimal:
        """Calculate current value of investment."""
        if self.is_exited:
            return Decimal(0)
        return self.amount + self.pending_returns
