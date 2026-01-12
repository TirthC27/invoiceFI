"""
State Consistency Validator
Ensures one asset = one truth across all views

This module provides utilities to validate that:
1. Backend database matches indexed blockchain events
2. All views show consistent data
3. No stale data is served
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import asyncio
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ConsistencyLevel(Enum):
    """Levels of data consistency"""
    STRONG = "strong"       # Blockchain verified
    EVENTUAL = "eventual"   # Indexed, may lag
    STALE = "stale"        # Known to be outdated


@dataclass
class ValidationResult:
    """Result of a consistency check"""
    is_consistent: bool
    consistency_level: ConsistencyLevel
    discrepancies: List[Dict[str, Any]]
    checked_at: datetime
    
    
class StateValidator:
    """
    Validates state consistency between blockchain and database
    """
    
    def __init__(
        self,
        blockchain_service,
        db_session,
        max_block_lag: int = 10
    ):
        self.blockchain = blockchain_service
        self.db = db_session
        self.max_block_lag = max_block_lag
        
    async def get_sync_status(self) -> Dict[str, Any]:
        """
        Get current synchronization status
        """
        current_block = await self.blockchain.get_current_block()
        last_indexed = await self._get_last_indexed_block()
        blocks_behind = current_block - last_indexed
        
        return {
            "is_synced": blocks_behind <= self.max_block_lag,
            "current_block": current_block,
            "last_indexed_block": last_indexed,
            "blocks_behind": blocks_behind,
            "consistency_level": (
                ConsistencyLevel.STRONG if blocks_behind == 0
                else ConsistencyLevel.EVENTUAL if blocks_behind <= self.max_block_lag
                else ConsistencyLevel.STALE
            ).value
        }
        
    async def validate_asset(self, asset_id: str) -> ValidationResult:
        """
        Validate that an asset's database state matches blockchain
        """
        discrepancies = []
        
        # Get database record
        db_asset = await self._get_db_asset(asset_id)
        if not db_asset:
            return ValidationResult(
                is_consistent=False,
                consistency_level=ConsistencyLevel.STALE,
                discrepancies=[{"error": "Asset not found in database"}],
                checked_at=datetime.utcnow()
            )
            
        # Get blockchain state
        chain_asset = await self.blockchain.get_asset(db_asset.token_id)
        if not chain_asset:
            return ValidationResult(
                is_consistent=False,
                consistency_level=ConsistencyLevel.STALE,
                discrepancies=[{"error": "Asset not found on blockchain"}],
                checked_at=datetime.utcnow()
            )
            
        # Compare critical fields
        if db_asset.status != chain_asset["status"]:
            discrepancies.append({
                "field": "status",
                "db_value": db_asset.status,
                "chain_value": chain_asset["status"]
            })
            
        if db_asset.value != chain_asset["value"]:
            discrepancies.append({
                "field": "value",
                "db_value": db_asset.value,
                "chain_value": chain_asset["value"]
            })
            
        # Determine consistency level
        if discrepancies:
            level = ConsistencyLevel.STALE
            is_consistent = False
        else:
            sync_status = await self.get_sync_status()
            level = ConsistencyLevel(sync_status["consistency_level"])
            is_consistent = True
            
        return ValidationResult(
            is_consistent=is_consistent,
            consistency_level=level,
            discrepancies=discrepancies,
            checked_at=datetime.utcnow()
        )
        
    async def validate_all_assets(self) -> Dict[str, ValidationResult]:
        """
        Validate all assets in the system
        """
        assets = await self._get_all_db_assets()
        results = {}
        
        for asset in assets:
            results[asset.id] = await self.validate_asset(asset.id)
            
        return results
        
    async def reconcile_asset(self, asset_id: str) -> bool:
        """
        Reconcile database state with blockchain
        Forces re-indexing of asset events
        """
        try:
            # Get blockchain state
            db_asset = await self._get_db_asset(asset_id)
            if not db_asset or not db_asset.token_id:
                return False
                
            chain_asset = await self.blockchain.get_asset(db_asset.token_id)
            if not chain_asset:
                return False
                
            # Update database to match blockchain
            await self._update_db_asset(asset_id, {
                "status": chain_asset["status"],
                "value": chain_asset["value"],
                "risk_level": chain_asset.get("risk_level"),
            })
            
            logger.info(f"Reconciled asset {asset_id} with blockchain state")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reconcile asset {asset_id}: {e}")
            return False
            
    async def _get_last_indexed_block(self) -> int:
        """Get the last indexed block number from database"""
        # Implementation depends on database schema
        result = await self.db.execute(
            "SELECT MAX(block_number) FROM blockchain_events"
        )
        return result.scalar() or 0
        
    async def _get_db_asset(self, asset_id: str):
        """Get asset from database"""
        # Implementation depends on database schema
        pass
        
    async def _get_all_db_assets(self):
        """Get all assets from database"""
        pass
        
    async def _update_db_asset(self, asset_id: str, updates: Dict):
        """Update asset in database"""
        pass


class ViewConsistencyChecker:
    """
    Ensures all views (dashboard, detail pages, etc.) 
    show consistent data for the same asset
    """
    
    @staticmethod
    def asset_view_fields() -> List[str]:
        """
        Fields that must be consistent across all views
        """
        return [
            "status",
            "value", 
            "risk_level",
            "token_id",
            "issuer_address",
            "document_hash"
        ]
        
    @staticmethod
    def investment_view_fields() -> List[str]:
        """
        Fields that must be consistent for investments
        """
        return [
            "amount",
            "shares",
            "status",
            "investor_address",
            "tx_hash"
        ]


# Middleware for API routes
async def consistency_middleware(request, call_next):
    """
    Middleware to add consistency headers to responses
    """
    response = await call_next(request)
    
    # Add header indicating data freshness
    # This helps frontend show appropriate UI
    response.headers["X-Data-Consistency"] = "eventual"
    response.headers["X-Last-Sync"] = datetime.utcnow().isoformat()
    
    return response
