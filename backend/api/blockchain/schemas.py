"""
Blockchain API schemas.
"""

from typing import Optional, Any
from datetime import datetime
from pydantic import BaseModel


class AssetOnChainResponse(BaseModel):
    """Asset data from blockchain."""
    id: int
    issuer: str
    ipfs_hash: str
    value: int
    risk_tier: int
    status: int
    created_at: int


class InvestmentOnChainResponse(BaseModel):
    """Investment position from blockchain."""
    asset_id: int
    investor: str
    shares: int
    invested_amount: int
    claimed_returns: int


class RiskDataResponse(BaseModel):
    """Risk data from blockchain."""
    asset_id: int
    risk_score: int
    payment_risk: int
    market_risk: int
    issuer_risk: int
    combined_score: int


class AuctionResponse(BaseModel):
    """Auction data from blockchain."""
    id: int
    asset_id: int
    start_price: int
    current_bid: int
    highest_bidder: str
    end_time: int
    status: int


class LossClaimResponse(BaseModel):
    """Loss claim NFT data."""
    token_id: int
    owner: str
    asset_id: int
    investor: str
    loss_amount: int
    recovery_amount: int
    claimed: bool


class BlockchainEventResponse(BaseModel):
    """Indexed blockchain event."""
    id: int
    transaction_hash: str
    block_number: int
    contract_name: str
    event_name: str
    event_data: str
    created_at: datetime


class TransactionRequest(BaseModel):
    """Request to build a transaction."""
    asset_id: int
    amount: Optional[int] = None


class TransactionResponse(BaseModel):
    """Built transaction for signing."""
    to: str
    data: str
    value: str
    gas: Optional[int] = None
    gas_price: str
    chain_id: Optional[int] = None
