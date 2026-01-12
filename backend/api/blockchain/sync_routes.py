"""
Blockchain Sync Status API Routes
Provides endpoints for checking data synchronization status
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from pydantic import BaseModel
from datetime import datetime

from services.state_validator import StateValidator, ConsistencyLevel
from db.database import get_db_session

router = APIRouter(prefix="/blockchain", tags=["blockchain"])


class SyncStatusResponse(BaseModel):
    """Response model for sync status"""
    is_synced: bool
    current_block: int
    last_indexed_block: int
    blocks_behind: int
    consistency_level: str
    
    
class ValidationResponse(BaseModel):
    """Response model for validation results"""
    is_consistent: bool
    consistency_level: str
    discrepancies: list
    checked_at: datetime


@router.get("/sync-status", response_model=SyncStatusResponse)
async def get_sync_status(
    db = Depends(get_db_session)
) -> SyncStatusResponse:
    """
    Get current blockchain synchronization status.
    
    Returns information about how up-to-date the indexed data is
    compared to the actual blockchain state.
    """
    # In production, inject blockchain_service
    # For now, return mock data
    return SyncStatusResponse(
        is_synced=True,
        current_block=12345678,
        last_indexed_block=12345678,
        blocks_behind=0,
        consistency_level=ConsistencyLevel.STRONG.value
    )


@router.get("/validate/asset/{asset_id}", response_model=ValidationResponse)
async def validate_asset(
    asset_id: str,
    db = Depends(get_db_session)
) -> ValidationResponse:
    """
    Validate that an asset's database state matches blockchain.
    
    This endpoint allows checking if there are any discrepancies
    between the indexed database state and the actual blockchain state.
    """
    # In production, use real validator
    return ValidationResponse(
        is_consistent=True,
        consistency_level=ConsistencyLevel.STRONG.value,
        discrepancies=[],
        checked_at=datetime.utcnow()
    )


@router.post("/reconcile/asset/{asset_id}")
async def reconcile_asset(
    asset_id: str,
    db = Depends(get_db_session)
) -> Dict[str, Any]:
    """
    Force reconciliation of asset state with blockchain.
    
    This triggers a re-indexing of the asset's blockchain events
    and updates the database to match the blockchain state.
    
    Note: This is an admin-only operation.
    """
    # In production, verify admin role and use real reconciliation
    return {
        "success": True,
        "message": f"Asset {asset_id} reconciled with blockchain",
        "reconciled_at": datetime.utcnow().isoformat()
    }


@router.get("/events")
async def get_blockchain_events(
    event_name: str = None,
    asset_id: str = None,
    limit: int = 50,
    offset: int = 0,
    db = Depends(get_db_session)
) -> Dict[str, Any]:
    """
    Get indexed blockchain events.
    
    Events are indexed from the blockchain and stored for efficient querying.
    This is the authoritative source for event history.
    """
    # In production, query indexed events from database
    return {
        "items": [],
        "total": 0,
        "page": offset // limit + 1,
        "page_size": limit
    }
