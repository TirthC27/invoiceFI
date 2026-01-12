"""
Assets API schemas.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AssetMetadataCreate(BaseModel):
    """Asset metadata for creation."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    asset_type: str = Field(..., max_length=50)  # real_estate, invoice, equipment
    document_cid: str  # IPFS CID of asset documents
    fingerprint_hash: str  # SHA-256 hash of document fingerprint


class AssetCreateRequest(BaseModel):
    """Asset creation request."""
    metadata: AssetMetadataCreate
    total_value: str  # Wei as string (BigInt)
    funding_goal: str  # Wei as string
    expected_yield: int = Field(..., ge=0, le=5000)  # Basis points (max 50%)
    term_days: int = Field(..., ge=1, le=3650)  # Max 10 years
    funding_period_days: int = Field(..., ge=7, le=90)  # 7-90 days


class AssetResponse(BaseModel):
    """Asset response."""
    asset_id: str
    issuer_address: str
    name: str
    description: Optional[str] = None
    asset_type: str
    document_cid: Optional[str] = None
    fingerprint_hash: Optional[str] = None
    total_value: str
    funding_goal: str
    funded_amount: str
    funding_progress: float
    expected_yield: int
    term_days: int
    status: str
    risk_level: str
    created_at: datetime
    funding_deadline: Optional[datetime] = None
    maturity_date: Optional[datetime] = None
    is_investable: bool
    is_defaulted: bool


class AssetListResponse(BaseModel):
    """Paginated asset list response."""
    assets: List[AssetResponse]
    total: int
    page: int
    page_size: int
    has_more: bool


class AssetStatusUpdateRequest(BaseModel):
    """Asset status update request."""
    status: str
