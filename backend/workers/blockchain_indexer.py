"""
Blockchain Event Indexer Worker.

Indexes events from TERRA smart contracts on Mantle:
- AssetRegistry events
- InvestmentVault events
- PaymentEngine events
- DefaultEngine events
- RecoveryAuction events

Runs as Celery worker with Redis as broker.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from web3 import Web3
from web3.contract import Contract
from web3.types import LogReceipt
from celery import Celery

from config.settings import settings
from db.database import get_db
from db.models.blockchain_event import BlockchainEvent
from db.models.asset import Asset, AssetStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    "blockchain_indexer",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    worker_prefetch_multiplier=1,
)


class BlockchainIndexer:
    """
    Blockchain event indexer for TERRA platform.
    
    Indexes all contract events and updates database state.
    """
    
    # Event signatures for filtering
    EVENT_SIGNATURES = {
        "AssetRegistered": "AssetRegistered(uint256,address,string,uint256,uint256)",
        "AssetStatusChanged": "AssetStatusChanged(uint256,uint8)",
        "InvestmentMade": "InvestmentMade(uint256,address,uint256,uint256)",
        "ReturnsDistributed": "ReturnsDistributed(uint256,uint256)",
        "PaymentReceived": "PaymentReceived(uint256,uint256,uint256)",
        "PaymentMissed": "PaymentMissed(uint256,uint256)",
        "DefaultTriggered": "DefaultTriggered(uint256,uint8)",
        "AuctionCreated": "AuctionCreated(uint256,uint256,uint256,uint256)",
        "BidPlaced": "BidPlaced(uint256,address,uint256)",
        "AuctionSettled": "AuctionSettled(uint256,address,uint256)",
        "LossClaimMinted": "LossClaimMinted(uint256,address,uint256,uint256)",
        "RiskScoreUpdated": "RiskScoreUpdated(uint256,uint256)",
    }
    
    def __init__(
        self,
        rpc_url: str,
        contracts: Dict[str, Dict[str, Any]],
        start_block: int = 0,
    ):
        """
        Initialize the indexer.
        
        Args:
            rpc_url: Mantle RPC URL
            contracts: Contract addresses and ABIs
            start_block: Block to start indexing from
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.contracts = {}
        self.start_block = start_block
        self.last_indexed_block = start_block
        
        # Initialize contract instances
        for name, config in contracts.items():
            self.contracts[name] = self.w3.eth.contract(
                address=Web3.to_checksum_address(config["address"]),
                abi=config["abi"],
            )
    
    async def index_events(
        self,
        from_block: int,
        to_block: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Index events from specified block range.
        
        Args:
            from_block: Starting block number
            to_block: Ending block number (default: latest)
        
        Returns:
            List of indexed events
        """
        if to_block is None:
            to_block = self.w3.eth.block_number
        
        indexed_events = []
        
        for contract_name, contract in self.contracts.items():
            try:
                events = await self._get_contract_events(
                    contract=contract,
                    contract_name=contract_name,
                    from_block=from_block,
                    to_block=to_block,
                )
                indexed_events.extend(events)
            except Exception as e:
                logger.error(f"Error indexing {contract_name} events: {e}")
        
        # Update last indexed block
        self.last_indexed_block = to_block
        
        return indexed_events
    
    async def _get_contract_events(
        self,
        contract: Contract,
        contract_name: str,
        from_block: int,
        to_block: int,
    ) -> List[Dict[str, Any]]:
        """Get all events from a contract in block range."""
        events = []
        
        # Get all events from contract
        try:
            logs = contract.events.all_logs(
                fromBlock=from_block,
                toBlock=to_block,
            )
            
            for log in logs:
                event_data = self._parse_log(log, contract_name)
                if event_data:
                    events.append(event_data)
        except Exception as e:
            # Fallback: try individual event types
            for event_name in self.EVENT_SIGNATURES:
                try:
                    if hasattr(contract.events, event_name):
                        event_filter = getattr(contract.events, event_name)
                        logs = event_filter.get_logs(
                            fromBlock=from_block,
                            toBlock=to_block,
                        )
                        
                        for log in logs:
                            event_data = self._parse_log(log, contract_name)
                            if event_data:
                                events.append(event_data)
                except Exception:
                    continue
        
        return events
    
    def _parse_log(
        self,
        log: LogReceipt,
        contract_name: str,
    ) -> Optional[Dict[str, Any]]:
        """Parse a log receipt into event data."""
        try:
            return {
                "contract_name": contract_name,
                "event_name": log.event,
                "block_number": log.blockNumber,
                "transaction_hash": log.transactionHash.hex(),
                "log_index": log.logIndex,
                "args": dict(log.args),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error parsing log: {e}")
            return None
    
    async def process_event(
        self,
        event: Dict[str, Any],
        db_session,
    ) -> bool:
        """
        Process a single event and update database.
        
        Args:
            event: Event data
            db_session: Database session
        
        Returns:
            True if processed successfully
        """
        event_name = event.get("event_name")
        args = event.get("args", {})
        
        try:
            # Store event in database
            db_event = BlockchainEvent(
                transaction_hash=event.get("transaction_hash"),
                block_number=event.get("block_number"),
                contract_name=event.get("contract_name"),
                event_name=event_name,
                event_data=json.dumps(args, default=str),
                processed=False,
            )
            db_session.add(db_event)
            
            # Process specific event types
            if event_name == "AssetRegistered":
                await self._process_asset_registered(args, db_session)
            elif event_name == "AssetStatusChanged":
                await self._process_asset_status_changed(args, db_session)
            elif event_name == "InvestmentMade":
                await self._process_investment_made(args, db_session)
            elif event_name == "DefaultTriggered":
                await self._process_default_triggered(args, db_session)
            elif event_name == "RiskScoreUpdated":
                await self._process_risk_score_updated(args, db_session)
            
            # Mark as processed
            db_event.processed = True
            db_event.processed_at = datetime.utcnow()
            
            await db_session.commit()
            return True
        
        except Exception as e:
            logger.error(f"Error processing event {event_name}: {e}")
            await db_session.rollback()
            return False
    
    async def _process_asset_registered(
        self,
        args: Dict[str, Any],
        db_session,
    ):
        """Process AssetRegistered event."""
        asset_id = args.get("assetId")
        issuer = args.get("issuer")
        ipfs_hash = args.get("ipfsHash")
        value = args.get("value")
        risk_tier = args.get("riskTier")
        
        # Update or create asset in database
        from sqlalchemy import select
        
        result = await db_session.execute(
            select(Asset).where(Asset.chain_asset_id == str(asset_id))
        )
        asset = result.scalar_one_or_none()
        
        if asset:
            asset.status = AssetStatus.ACTIVE
            asset.chain_value = value
            asset.chain_risk_tier = risk_tier
        else:
            logger.info(f"Asset {asset_id} registered on-chain but not in database")
    
    async def _process_asset_status_changed(
        self,
        args: Dict[str, Any],
        db_session,
    ):
        """Process AssetStatusChanged event."""
        asset_id = args.get("assetId")
        new_status = args.get("newStatus")
        
        from sqlalchemy import select
        
        result = await db_session.execute(
            select(Asset).where(Asset.chain_asset_id == str(asset_id))
        )
        asset = result.scalar_one_or_none()
        
        if asset:
            status_map = {
                0: AssetStatus.PENDING,
                1: AssetStatus.ACTIVE,
                2: AssetStatus.PAUSED,
                3: AssetStatus.DEFAULTED,
                4: AssetStatus.RECOVERED,
            }
            asset.status = status_map.get(new_status, AssetStatus.PENDING)
    
    async def _process_investment_made(
        self,
        args: Dict[str, Any],
        db_session,
    ):
        """Process InvestmentMade event."""
        asset_id = args.get("assetId")
        investor = args.get("investor")
        amount = args.get("amount")
        shares = args.get("shares")
        
        logger.info(f"Investment: {amount} for asset {asset_id} by {investor}")
    
    async def _process_default_triggered(
        self,
        args: Dict[str, Any],
        db_session,
    ):
        """Process DefaultTriggered event."""
        asset_id = args.get("assetId")
        reason = args.get("reason")
        
        from sqlalchemy import select
        
        result = await db_session.execute(
            select(Asset).where(Asset.chain_asset_id == str(asset_id))
        )
        asset = result.scalar_one_or_none()
        
        if asset:
            asset.status = AssetStatus.DEFAULTED
            logger.warning(f"Asset {asset_id} defaulted with reason: {reason}")
    
    async def _process_risk_score_updated(
        self,
        args: Dict[str, Any],
        db_session,
    ):
        """Process RiskScoreUpdated event."""
        asset_id = args.get("assetId")
        new_score = args.get("newScore")
        
        from sqlalchemy import select
        
        result = await db_session.execute(
            select(Asset).where(Asset.chain_asset_id == str(asset_id))
        )
        asset = result.scalar_one_or_none()
        
        if asset:
            asset.chain_risk_score = new_score


# Celery tasks
@celery_app.task(bind=True, max_retries=3)
def index_block_range(self, from_block: int, to_block: int):
    """
    Celery task to index a block range.
    
    Args:
        from_block: Starting block
        to_block: Ending block
    """
    try:
        # Get contract configs from settings
        contracts = get_contract_configs()
        
        indexer = BlockchainIndexer(
            rpc_url=settings.MANTLE_RPC_URL,
            contracts=contracts,
            start_block=from_block,
        )
        
        # Run async indexing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        events = loop.run_until_complete(
            indexer.index_events(from_block, to_block)
        )
        
        logger.info(f"Indexed {len(events)} events from blocks {from_block}-{to_block}")
        
        return {
            "status": "success",
            "events_indexed": len(events),
            "from_block": from_block,
            "to_block": to_block,
        }
    
    except Exception as e:
        logger.error(f"Error in index_block_range: {e}")
        raise self.retry(exc=e, countdown=60)


@celery_app.task
def index_latest_blocks():
    """
    Celery task to index latest blocks.
    Runs periodically via Celery Beat.
    """
    from backend.db.database import get_last_indexed_block
    
    try:
        # Get last indexed block from database
        last_block = get_last_indexed_block() or settings.INDEXER_START_BLOCK
        
        # Get contract configs
        contracts = get_contract_configs()
        
        indexer = BlockchainIndexer(
            rpc_url=settings.MANTLE_RPC_URL,
            contracts=contracts,
            start_block=last_block,
        )
        
        # Get latest block
        latest_block = indexer.w3.eth.block_number
        
        if latest_block <= last_block:
            return {"status": "no_new_blocks"}
        
        # Index new blocks
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        events = loop.run_until_complete(
            indexer.index_events(last_block + 1, latest_block)
        )
        
        logger.info(f"Indexed {len(events)} events from blocks {last_block + 1}-{latest_block}")
        
        return {
            "status": "success",
            "events_indexed": len(events),
            "from_block": last_block + 1,
            "to_block": latest_block,
        }
    
    except Exception as e:
        logger.error(f"Error in index_latest_blocks: {e}")
        return {"status": "error", "error": str(e)}


def get_contract_configs() -> Dict[str, Dict[str, Any]]:
    """Get contract configurations from settings/files."""
    import os
    
    contracts = {}
    abi_dir = os.path.join(settings.BASE_DIR, "blockchain", "artifacts")
    
    contract_addresses = {
        "AssetRegistry": settings.ASSET_REGISTRY_ADDRESS,
        "InvestmentVault": settings.INVESTMENT_VAULT_ADDRESS,
        "RiskEngine": settings.RISK_ENGINE_ADDRESS,
        "DefaultEngine": settings.DEFAULT_ENGINE_ADDRESS,
        "RecoveryAuction": settings.RECOVERY_AUCTION_ADDRESS,
        "LossClaimNFT": settings.LOSS_CLAIM_NFT_ADDRESS,
    }
    
    for name, address in contract_addresses.items():
        if not address:
            continue
        
        # Try to load ABI
        abi_path = os.path.join(abi_dir, f"{name}.json")
        if os.path.exists(abi_path):
            with open(abi_path, "r") as f:
                abi_data = json.load(f)
                abi = abi_data.get("abi", abi_data)
        else:
            abi = []  # Empty ABI, will use raw logs
        
        contracts[name] = {
            "address": address,
            "abi": abi,
        }
    
    return contracts


# Celery Beat schedule
celery_app.conf.beat_schedule = {
    "index-latest-blocks": {
        "task": "backend.workers.blockchain_indexer.index_latest_blocks",
        "schedule": 30.0,  # Every 30 seconds
    },
}
