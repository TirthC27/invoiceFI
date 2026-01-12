"""
Payment model - tracks payment history for assets.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Integer, Numeric, Boolean, ForeignKey

from db.database import Base


class PaymentStatus(str, Enum):
    """Payment status."""
    PENDING = "pending"
    PAID = "paid"
    LATE = "late"
    MISSED = "missed"
    DEFAULTED = "defaulted"


class Payment(Base):
    """
    Payment schedule and history model.
    Tracks scheduled and actual payments for assets.
    """
    
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Asset reference
    asset_id = Column(String(66), nullable=False, index=True)
    
    # Payment details
    payment_number = Column(Integer, nullable=False)
    scheduled_amount = Column(Numeric(36, 18), nullable=False)
    actual_amount = Column(Numeric(36, 18), nullable=True)
    late_fee = Column(Numeric(36, 18), default=0)
    
    # Dates
    due_date = Column(DateTime, nullable=False)
    paid_date = Column(DateTime, nullable=True)
    
    # Status
    status = Column(SQLEnum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    days_past_due = Column(Integer, default=0)
    
    # Blockchain reference
    payment_tx_hash = Column(String(66), nullable=True)
    payment_block = Column(Integer, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Payment {self.asset_id[:10]}... #{self.payment_number} status={self.status}>"
    
    @property
    def is_overdue(self) -> bool:
        """Check if payment is overdue."""
        if self.status in [PaymentStatus.PAID]:
            return False
        return datetime.utcnow() > self.due_date
    
    def calculate_days_past_due(self) -> int:
        """Calculate days past due."""
        if not self.is_overdue:
            return 0
        delta = datetime.utcnow() - self.due_date
        return delta.days
