"""
Blockchain API routes.

Exposes blockchain data to frontend.
All data is read from chain via indexer -> database.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db.models.user import User
from db.models.blockchain_event import BlockchainEvent
from api.auth.utils import get_current_user
from services.blockchain.service import blockchain_service
from api.blockchain.schemas import (
    AssetOnChainResponse,
    InvestmentOnChainResponse,
    RiskDataResponse,
    AuctionResponse,
    LossClaimResponse,
    BlockchainEventResponse,
    TransactionRequest,
    TransactionResponse,
)

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


@router.get("/assets/{asset_id}", response_model=AssetOnChainResponse)
async def get_asset_on_chain(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    """
    Get asset data directly from blockchain.
    
    This is the source of truth for asset state.
    """
    try:
        asset = await blockchain_service.get_asset(asset_id)
        return AssetOnChainResponse(**asset)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset not found on chain: {str(e)}",
        )


@router.get("/assets/{asset_id}/risk", response_model=RiskDataResponse)
async def get_asset_risk(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    """Get risk data for asset from chain."""
    try:
        risk_score = await blockchain_service.get_risk_score(asset_id)
        breakdown = await blockchain_service.get_risk_breakdown(asset_id)
        
        return RiskDataResponse(
            asset_id=asset_id,
            risk_score=risk_score,
            **breakdown,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk data not found: {str(e)}",
        )


@router.get("/investments/{asset_id}", response_model=InvestmentOnChainResponse)
async def get_my_investment(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    """Get current user's investment position from chain."""
    try:
        investment = await blockchain_service.get_investment(
            asset_id=asset_id,
            investor_address=current_user.wallet_address,
        )
        return InvestmentOnChainResponse(**investment)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investment not found: {str(e)}",
        )


@router.get("/auctions", response_model=List[AuctionResponse])
async def get_active_auctions(
    current_user: User = Depends(get_current_user),
):
    """Get all active recovery auctions."""
    try:
        auctions = await blockchain_service.get_active_auctions()
        return [AuctionResponse(**a) for a in auctions]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get auctions: {str(e)}",
        )


@router.get("/auctions/{auction_id}", response_model=AuctionResponse)
async def get_auction(
    auction_id: int,
    current_user: User = Depends(get_current_user),
):
    """Get specific auction details."""
    try:
        auction = await blockchain_service.get_auction(auction_id)
        return AuctionResponse(**auction)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Auction not found: {str(e)}",
        )


@router.get("/claims", response_model=List[LossClaimResponse])
async def get_my_loss_claims(
    current_user: User = Depends(get_current_user),
):
    """Get current user's loss claim NFTs."""
    try:
        claims = await blockchain_service.get_investor_claims(
            investor_address=current_user.wallet_address,
        )
        return [LossClaimResponse(**c) for c in claims]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get claims: {str(e)}",
        )


@router.get("/events", response_model=List[BlockchainEventResponse])
async def get_recent_events(
    contract_name: Optional[str] = None,
    event_name: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent blockchain events."""
    query = select(BlockchainEvent).order_by(BlockchainEvent.block_number.desc())
    
    if contract_name:
        query = query.where(BlockchainEvent.contract_name == contract_name)
    if event_name:
        query = query.where(BlockchainEvent.event_name == event_name)
    
    query = query.limit(limit)
    
    result = await db.execute(query)
    events = result.scalars().all()
    
    return [
        BlockchainEventResponse(
            id=e.id,
            transaction_hash=e.transaction_hash,
            block_number=e.block_number,
            contract_name=e.contract_name,
            event_name=e.event_name,
            event_data=e.event_data,
            created_at=e.created_at,
        )
        for e in events
    ]


# ==================== Transaction Building ====================

@router.post("/tx/invest", response_model=TransactionResponse)
async def build_invest_transaction(
    request: TransactionRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Build investment transaction for signing.
    
    Frontend will sign with wallet and broadcast.
    """
    if not current_user.kyc_status == "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC approval required to invest",
        )
    
    try:
        tx = await blockchain_service.build_invest_tx(
            asset_id=request.asset_id,
            investor_address=current_user.wallet_address,
            amount=request.amount,
        )
        
        return TransactionResponse(
            to=tx["to"],
            data=tx["data"],
            value=str(tx.get("value", 0)),
            gas=tx.get("gas"),
            gas_price=str(tx.get("gasPrice", 0)),
            chain_id=tx.get("chainId"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to build transaction: {str(e)}",
        )


@router.post("/tx/claim-returns", response_model=TransactionResponse)
async def build_claim_returns_transaction(
    asset_id: int,
    current_user: User = Depends(get_current_user),
):
    """Build transaction to claim investment returns."""
    try:
        tx = await blockchain_service.build_claim_returns_tx(
            asset_id=asset_id,
            investor_address=current_user.wallet_address,
        )
        
        return TransactionResponse(
            to=tx["to"],
            data=tx["data"],
            value=str(tx.get("value", 0)),
            gas=tx.get("gas"),
            gas_price=str(tx.get("gasPrice", 0)),
            chain_id=tx.get("chainId"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to build transaction: {str(e)}",
        )


@router.post("/tx/bid", response_model=TransactionResponse)
async def build_bid_transaction(
    auction_id: int,
    amount: int,
    current_user: User = Depends(get_current_user),
):
    """Build transaction to place auction bid."""
    # Check if user is recovery partner
    if current_user.role.value not in ["recovery_partner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recovery partners can bid",
        )
    
    try:
        tx = await blockchain_service.build_place_bid_tx(
            auction_id=auction_id,
            bidder_address=current_user.wallet_address,
            bid_amount=amount,
        )
        
        return TransactionResponse(
            to=tx["to"],
            data=tx["data"],
            value=str(tx.get("value", 0)),
            gas=tx.get("gas"),
            gas_price=str(tx.get("gasPrice", 0)),
            chain_id=tx.get("chainId"),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to build transaction: {str(e)}",
        )
