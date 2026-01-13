"""
System event model for timeline and audit trail.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, JSON
from uuid import uuid4

from db.database import Base


class Event(Base):
    """System event log for timeline and audit."""
    
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Event classification
    event_type = Column(String(100), nullable=False, index=True)
    source = Column(String(50), nullable=False, index=True)  # 'blockchain', 'agent', 'system', 'user'
    
    # Event payload (use JSON for cross-db compatibility)
    payload = Column(JSON, nullable=False)
    
    # Optional references
    user_id = Column(Integer, nullable=True, index=True)
    asset_id = Column(String(66), nullable=True, index=True)
    transaction_hash = Column(String(66), nullable=True, index=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<Event {self.event_type} from={self.source}>"
