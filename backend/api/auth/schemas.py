"""
Authentication schemas.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NonceRequest(BaseModel):
    """Request for authentication nonce."""
    wallet_address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")


class NonceResponse(BaseModel):
    """Response containing nonce for signing."""
    nonce: str
    message: str


class AuthRequest(BaseModel):
    """Authentication request with signature."""
    wallet_address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    signature: str


class UserResponse(BaseModel):
    """User information response."""
    wallet_address: str
    role: str
    kyc_status: str
    is_kyc_complete: bool
    created_at: datetime
    email: Optional[str] = None
    display_name: Optional[str] = None


class AuthResponse(BaseModel):
    """Authentication response with tokens."""
    access_token: str
    refresh_token: str
    token_type: str
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    """Token refresh response."""
    access_token: str
    token_type: str


class RoleUpdateRequest(BaseModel):
    """Role update request (admin only)."""
    wallet_address: str = Field(..., pattern="^0x[a-fA-F0-9]{40}$")
    role: str = Field(..., pattern="^(investor|asset_issuer|recovery_partner|admin)$")
