"""
Agent log model for tracking agent execution and debugging.
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer
from uuid import uuid4

from db.database import Base


class AgentLog(Base):
    """Agent execution log for debugging and audit."""
    
    __tablename__ = "agent_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    
    # Agent identification
    agent_name = Column(String(100), nullable=False, index=True)
    
    # Entity reference
    entity_type = Column(String(50), nullable=False)  # 'kyc_profile', 'asset', 'payment', etc.
    entity_id = Column(String(100), nullable=False, index=True)
    
    # Log details
    level = Column(String(20), nullable=False, default='info')  # 'info', 'warning', 'error'
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)  # JSON string for additional data
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    def __repr__(self):
        return f"<AgentLog {self.agent_name} {self.entity_type}/{self.entity_id}>"
