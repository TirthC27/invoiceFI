"""
Assets API routes.

Handles asset registration, retrieval, and management.
All data is synced from blockchain - no mocking.
"""

from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from api.auth.utils import get_current_user, require_role, require_kyc_and_role
from api.assets.schemas import (
    AssetResponse,
    AssetListResponse,
    AssetCreateRequest,
    AssetStatusUpdateRequest,
)
from db.database import get_db
from db.models.user import User, UserRole
from db.models.asset import Asset, AssetStatus, RiskLevel
from services.blockchain.asset_service import AssetBlockchainService

router = APIRouter()

# Blockchain service
asset_service = AssetBlockchainService()


@router.get("", response_model=AssetListResponse)
async def list_assets(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    risk_filter: Optional[str] = Query(None, description="Filter by risk level"),
    issuer: Optional[str] = Query(None, description="Filter by issuer address"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all assets with optional filters.
    
    Data is fetched from database (synced from blockchain).
    """
    query = select(Asset)
    
    # Apply filters
    conditions = []
    if status_filter:
        try:
            status_enum = AssetStatus(status_filter)
            conditions.append(Asset.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {status_filter}",
            )
    
    if risk_filter:
        try:
            risk_enum = RiskLevel(risk_filter)
            conditions.append(Asset.risk_level == risk_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid risk level: {risk_filter}",
            )
    
    if issuer:
        conditions.append(Asset.issuer_address == issuer.lower())
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    assets = result.scalars().all()
    
    # Get total count
    count_result = await db.execute(select(Asset).where(and_(*conditions)) if conditions else select(Asset))
    total = len(count_result.scalars().all())
    
    return AssetListResponse(
        assets=[_asset_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + len(assets) < total,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific asset by ID.
    
    Data is fetched from database (synced from blockchain).
    """
    result = await db.execute(
        select(Asset).where(Asset.asset_id == asset_id)
    )
    asset = result.scalar_one_or_none()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )
    
    return _asset_to_response(asset)


@router.post("", response_model=AssetResponse)
async def create_asset(
    request: AssetCreateRequest,
    current_user: User = Depends(require_kyc_and_role(UserRole.ASSET_ISSUER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new asset.
    
    Requires:
    - KYC completion (enforced)
    - Asset Issuer role
    
    This will:
    1. Validate the request
    2. Register the asset on-chain
    3. Index the asset in the database
    """
    # Create asset on blockchain
    try:
        tx_result = await asset_service.register_asset(
            issuer_address=current_user.wallet_address,
            metadata=request.metadata,
            total_value=request.total_value,
            funding_goal=request.funding_goal,
            expected_yield=request.expected_yield,
            term_days=request.term_days,
            funding_period_days=request.funding_period_days,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register asset on-chain: {str(e)}",
        )
    
    # Create local database record
    asset = Asset(
        asset_id=tx_result["asset_id"],
        issuer_address=current_user.wallet_address,
        name=request.metadata.name,
        description=request.metadata.description,
        asset_type=request.metadata.asset_type,
        document_cid=request.metadata.document_cid,
        fingerprint_hash=request.metadata.fingerprint_hash,
        total_value=request.total_value,
        funding_goal=request.funding_goal,
        funded_amount=0,
        expected_yield=request.expected_yield,
        term_days=request.term_days,
        status=AssetStatus.PENDING_VERIFICATION,
        risk_level=RiskLevel.MEDIUM,
        funding_deadline=tx_result.get("funding_deadline"),
        maturity_date=tx_result.get("maturity_date"),
        creation_tx_hash=tx_result.get("tx_hash"),
        creation_block=tx_result.get("block_number"),
        issuer_id=current_user.id,
    )
    
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    
    return _asset_to_response(asset)


@router.get("/issuer/my-assets", response_model=AssetListResponse)
async def get_my_assets(
    current_user: User = Depends(require_kyc_and_role(UserRole.ASSET_ISSUER)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get assets owned by the current issuer.
    """
    result = await db.execute(
        select(Asset).where(Asset.issuer_address == current_user.wallet_address)
    )
    assets = result.scalars().all()
    
    return AssetListResponse(
        assets=[_asset_to_response(a) for a in assets],
        total=len(assets),
        page=1,
        page_size=len(assets),
        has_more=False,
    )


@router.get("/defaulted", response_model=AssetListResponse)
async def get_defaulted_assets(
    current_user: User = Depends(require_role(UserRole.RECOVERY_PARTNER, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Get all defaulted assets (for Recovery Partners).
    """
    result = await db.execute(
        select(Asset).where(Asset.status == AssetStatus.DEFAULT)
    )
    assets = result.scalars().all()
    
    return AssetListResponse(
        assets=[_asset_to_response(a) for a in assets],
        total=len(assets),
        page=1,
        page_size=len(assets),
        has_more=False,
    )


def _asset_to_response(asset: Asset) -> AssetResponse:
    """Convert Asset model to response schema."""
    return AssetResponse(
        asset_id=asset.asset_id,
        issuer_address=asset.issuer_address,
        name=asset.name,
        description=asset.description,
        asset_type=asset.asset_type,
        document_cid=asset.document_cid,
        fingerprint_hash=asset.fingerprint_hash,
        total_value=str(asset.total_value),
        funding_goal=str(asset.funding_goal),
        funded_amount=str(asset.funded_amount),
        funding_progress=asset.funding_progress,
        expected_yield=asset.expected_yield,
        term_days=asset.term_days,
        status=asset.status.value,
        risk_level=asset.risk_level.value,
        created_at=asset.created_at,
        funding_deadline=asset.funding_deadline,
        maturity_date=asset.maturity_date,
        is_investable=asset.is_investable,
        is_defaulted=asset.is_defaulted,
    )
