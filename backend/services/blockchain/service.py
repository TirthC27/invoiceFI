"""
Blockchain Service - Web3 interaction layer.

Provides methods for:
- Reading contract state
- Building transactions
- Verifying on-chain data

Single source of truth: BLOCKCHAIN
All data flows: Chain -> Indexer -> Database -> Frontend
"""

import json
from typing import Dict, Any, Optional, List
from decimal import Decimal
from web3 import Web3
from web3.contract import Contract
from web3.types import TxReceipt

from config.settings import settings


class BlockchainService:
    """
    Blockchain service for interacting with TERRA contracts.
    
    READ OPERATIONS: Query on-chain state
    WRITE OPERATIONS: Build transactions for signing
    
    All state is derived from blockchain.
    """
    
    def __init__(
        self,
        rpc_url: Optional[str] = None,
        private_key: Optional[str] = None,
    ):
        """
        Initialize blockchain service.
        
        Args:
            rpc_url: RPC URL (default from settings)
            private_key: Private key for signing (optional)
        """
        self.rpc_url = rpc_url or settings.MANTLE_RPC_URL
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.private_key = private_key
        
        # Initialize contracts (lazy loading)
        self._contracts: Dict[str, Contract] = {}
    
    def _get_contract(self, name: str) -> Contract:
        """Get or create contract instance."""
        if name not in self._contracts:
            address = getattr(settings, f"{name.upper()}_ADDRESS", None)
            if not address:
                raise ValueError(f"No address configured for {name}")
            
            abi = self._load_abi(name)
            self._contracts[name] = self.w3.eth.contract(
                address=Web3.to_checksum_address(address),
                abi=abi,
            )
        
        return self._contracts[name]
    
    def _load_abi(self, contract_name: str) -> list:
        """Load contract ABI from file."""
        import os
        
        abi_path = os.path.join(
            settings.BASE_DIR,
            "blockchain",
            "artifacts",
            f"{contract_name}.json",
        )
        
        if os.path.exists(abi_path):
            with open(abi_path, "r") as f:
                data = json.load(f)
                return data.get("abi", data)
        
        return []
    
    # ==================== Asset Registry ====================
    
    async def get_asset(self, asset_id: int) -> Dict[str, Any]:
        """
        Get asset details from chain.
        
        Args:
            asset_id: On-chain asset ID
        
        Returns:
            Asset data from blockchain
        """
        contract = self._get_contract("AssetRegistry")
        
        asset = contract.functions.getAsset(asset_id).call()
        
        return {
            "id": asset_id,
            "issuer": asset[0],
            "ipfs_hash": asset[1],
            "value": asset[2],
            "risk_tier": asset[3],
            "status": asset[4],
            "created_at": asset[5],
        }
    
    async def get_asset_status(self, asset_id: int) -> int:
        """Get asset status from chain."""
        contract = self._get_contract("AssetRegistry")
        return contract.functions.getAssetStatus(asset_id).call()
    
    async def build_register_asset_tx(
        self,
        issuer_address: str,
        ipfs_hash: str,
        value: int,
        risk_tier: int,
    ) -> Dict[str, Any]:
        """
        Build transaction to register an asset.
        
        Args:
            issuer_address: Address of asset issuer
            ipfs_hash: IPFS hash of asset documents
            value: Asset value in wei
            risk_tier: Risk tier (0-4)
        
        Returns:
            Transaction dict for signing
        """
        contract = self._get_contract("AssetRegistry")
        
        tx = contract.functions.registerAsset(
            ipfs_hash,
            value,
            risk_tier,
        ).build_transaction({
            "from": issuer_address,
            "nonce": self.w3.eth.get_transaction_count(issuer_address),
            "gas": 500000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        
        return tx
    
    # ==================== Investment Vault ====================
    
    async def get_investment(
        self,
        asset_id: int,
        investor_address: str,
    ) -> Dict[str, Any]:
        """
        Get investor's position for an asset.
        
        Args:
            asset_id: Asset ID
            investor_address: Investor address
        
        Returns:
            Investment position data
        """
        contract = self._get_contract("InvestmentVault")
        
        position = contract.functions.getPosition(
            asset_id,
            investor_address,
        ).call()
        
        return {
            "asset_id": asset_id,
            "investor": investor_address,
            "shares": position[0],
            "invested_amount": position[1],
            "claimed_returns": position[2],
        }
    
    async def get_asset_total_investment(self, asset_id: int) -> int:
        """Get total investment for an asset."""
        contract = self._get_contract("InvestmentVault")
        return contract.functions.getTotalInvested(asset_id).call()
    
    async def build_invest_tx(
        self,
        asset_id: int,
        investor_address: str,
        amount: int,
    ) -> Dict[str, Any]:
        """
        Build transaction to invest in an asset.
        
        Args:
            asset_id: Asset ID
            investor_address: Investor address
            amount: Amount to invest in wei
        
        Returns:
            Transaction dict for signing
        """
        contract = self._get_contract("InvestmentVault")
        
        tx = contract.functions.invest(asset_id).build_transaction({
            "from": investor_address,
            "value": amount,
            "nonce": self.w3.eth.get_transaction_count(investor_address),
            "gas": 300000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        
        return tx
    
    async def build_claim_returns_tx(
        self,
        asset_id: int,
        investor_address: str,
    ) -> Dict[str, Any]:
        """Build transaction to claim returns."""
        contract = self._get_contract("InvestmentVault")
        
        tx = contract.functions.claimReturns(asset_id).build_transaction({
            "from": investor_address,
            "nonce": self.w3.eth.get_transaction_count(investor_address),
            "gas": 200000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        
        return tx
    
    # ==================== Risk Engine ====================
    
    async def get_risk_score(self, asset_id: int) -> int:
        """Get current risk score for asset."""
        contract = self._get_contract("RiskEngine")
        return contract.functions.getRiskScore(asset_id).call()
    
    async def get_risk_breakdown(self, asset_id: int) -> Dict[str, Any]:
        """Get detailed risk breakdown."""
        contract = self._get_contract("RiskEngine")
        
        breakdown = contract.functions.getRiskBreakdown(asset_id).call()
        
        return {
            "payment_risk": breakdown[0],
            "market_risk": breakdown[1],
            "issuer_risk": breakdown[2],
            "combined_score": breakdown[3],
        }
    
    # ==================== Default Engine ====================
    
    async def check_default_conditions(self, asset_id: int) -> Dict[str, Any]:
        """
        Check if asset meets default conditions.
        
        IMPORTANT: Default is triggered by OBJECTIVE criteria only.
        No admin can manually trigger default.
        """
        contract = self._get_contract("DefaultEngine")
        
        can_default = contract.functions.canTriggerDefault(asset_id).call()
        conditions = contract.functions.getDefaultConditions(asset_id).call()
        
        return {
            "can_trigger": can_default,
            "missed_payments": conditions[0],
            "days_past_due": conditions[1],
            "risk_score": conditions[2],
            "thresholds": {
                "missed_payments": conditions[3],
                "days_past_due": conditions[4],
                "risk_score": conditions[5],
            },
        }
    
    async def build_trigger_default_tx(
        self,
        asset_id: int,
        caller_address: str,
    ) -> Dict[str, Any]:
        """
        Build transaction to trigger default.
        
        NOTE: This will only succeed if objective criteria are met.
        Contract will revert if conditions not satisfied.
        """
        contract = self._get_contract("DefaultEngine")
        
        tx = contract.functions.triggerDefault(asset_id).build_transaction({
            "from": caller_address,
            "nonce": self.w3.eth.get_transaction_count(caller_address),
            "gas": 400000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        
        return tx
    
    # ==================== Recovery Auction ====================
    
    async def get_auction(self, auction_id: int) -> Dict[str, Any]:
        """Get auction details."""
        contract = self._get_contract("RecoveryAuction")
        
        auction = contract.functions.getAuction(auction_id).call()
        
        return {
            "id": auction_id,
            "asset_id": auction[0],
            "start_price": auction[1],
            "current_bid": auction[2],
            "highest_bidder": auction[3],
            "end_time": auction[4],
            "status": auction[5],
        }
    
    async def get_active_auctions(self) -> List[Dict[str, Any]]:
        """Get all active auctions."""
        contract = self._get_contract("RecoveryAuction")
        
        auction_ids = contract.functions.getActiveAuctions().call()
        auctions = []
        
        for auction_id in auction_ids:
            auction = await self.get_auction(auction_id)
            auctions.append(auction)
        
        return auctions
    
    async def build_place_bid_tx(
        self,
        auction_id: int,
        bidder_address: str,
        bid_amount: int,
    ) -> Dict[str, Any]:
        """Build transaction to place a bid."""
        contract = self._get_contract("RecoveryAuction")
        
        tx = contract.functions.placeBid(auction_id).build_transaction({
            "from": bidder_address,
            "value": bid_amount,
            "nonce": self.w3.eth.get_transaction_count(bidder_address),
            "gas": 200000,
            "gasPrice": self.w3.eth.gas_price,
            "chainId": settings.CHAIN_ID,
        })
        
        return tx
    
    # ==================== Loss Claim NFT ====================
    
    async def get_loss_claim(self, token_id: int) -> Dict[str, Any]:
        """Get loss claim NFT details."""
        contract = self._get_contract("LossClaimNFT")
        
        claim = contract.functions.getLossClaim(token_id).call()
        owner = contract.functions.ownerOf(token_id).call()
        
        return {
            "token_id": token_id,
            "owner": owner,
            "asset_id": claim[0],
            "investor": claim[1],
            "loss_amount": claim[2],
            "recovery_amount": claim[3],
            "claimed": claim[4],
        }
    
    async def get_investor_claims(
        self,
        investor_address: str,
    ) -> List[Dict[str, Any]]:
        """Get all loss claims for an investor."""
        contract = self._get_contract("LossClaimNFT")
        
        balance = contract.functions.balanceOf(investor_address).call()
        claims = []
        
        for i in range(balance):
            token_id = contract.functions.tokenOfOwnerByIndex(
                investor_address,
                i,
            ).call()
            claim = await self.get_loss_claim(token_id)
            claims.append(claim)
        
        return claims
    
    # ==================== Utility Methods ====================
    
    async def get_current_block(self) -> int:
        """Get current block number."""
        return self.w3.eth.block_number
    
    async def get_transaction_receipt(
        self,
        tx_hash: str,
    ) -> Optional[TxReceipt]:
        """Get transaction receipt."""
        try:
            return self.w3.eth.get_transaction_receipt(tx_hash)
        except Exception:
            return None
    
    async def estimate_gas(self, tx: Dict[str, Any]) -> int:
        """Estimate gas for transaction."""
        return self.w3.eth.estimate_gas(tx)
    
    def wei_to_ether(self, wei: int) -> Decimal:
        """Convert wei to ether."""
        return Decimal(wei) / Decimal(10**18)
    
    def ether_to_wei(self, ether: Decimal) -> int:
        """Convert ether to wei."""
        return int(ether * Decimal(10**18))


# Singleton instance
blockchain_service = BlockchainService()
