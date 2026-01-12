"""
Agent Runner - TERRA AI Agents Orchestration.

Coordinates execution of:
- KYC Consistency Agent: Cross-validates KYC data with asset documents
- Asset Document Agent: Extracts asset data and generates fingerprints
- Behavior & Escalation Agent: Monitors payments and triggers escalations

All agents perform REAL processing - NO MOCKING.
"""

import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from agents.kyc_agent.consistency_agent import KYCConsistencyAgent
from agents.asset_agent.document_agent import AssetDocumentAgent
from agents.behavior_agent.escalation_agent import BehaviorEscalationAgent


class AgentType(str, Enum):
    """Available agent types."""
    KYC_CONSISTENCY = "kyc_consistency"
    ASSET_DOCUMENT = "asset_document"
    BEHAVIOR_ESCALATION = "behavior_escalation"


@dataclass
class AgentResult:
    """Result from agent execution."""
    agent_type: AgentType
    success: bool
    result: Dict[str, Any]
    execution_time_ms: float
    errors: List[str]
    timestamp: datetime


class AgentRunner:
    """
    Agent Runner - orchestrates AI agent execution.
    
    Provides:
    - Single agent execution
    - Pipeline execution
    - Result aggregation
    - Error handling
    """
    
    def __init__(
        self,
        smtp_config: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize Agent Runner.
        
        Args:
            smtp_config: Email configuration for escalation agent
        """
        self.kyc_agent = KYCConsistencyAgent()
        self.asset_agent = AssetDocumentAgent()
        
        smtp_config = smtp_config or {}
        self.behavior_agent = BehaviorEscalationAgent(
            smtp_host=smtp_config.get("host", "smtp.gmail.com"),
            smtp_port=smtp_config.get("port", 587),
            smtp_user=smtp_config.get("user"),
            smtp_password=smtp_config.get("password"),
        )
    
    async def run_kyc_consistency(
        self,
        kyc_profile: Dict[str, Any],
        asset_document_content: bytes,
        asset_document_type: str = "image",
    ) -> AgentResult:
        """
        Run KYC Consistency Agent.
        
        Args:
            kyc_profile: KYC profile data
            asset_document_content: Asset document bytes
            asset_document_type: Document type
        
        Returns:
            AgentResult with consistency check results
        """
        start_time = datetime.utcnow()
        errors = []
        
        try:
            result = await self.kyc_agent.run(
                kyc_profile=kyc_profile,
                asset_document_content=asset_document_content,
                asset_document_type=asset_document_type,
            )
            success = True
        except Exception as e:
            result = {}
            errors.append(str(e))
            success = False
        
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        return AgentResult(
            agent_type=AgentType.KYC_CONSISTENCY,
            success=success,
            result=result,
            execution_time_ms=execution_time,
            errors=errors,
            timestamp=start_time,
        )
    
    async def run_asset_document(
        self,
        document_content: bytes,
        document_type: str = "image",
        expected_asset_type: Optional[str] = None,
    ) -> AgentResult:
        """
        Run Asset Document Agent.
        
        Args:
            document_content: Document bytes
            document_type: Document type
            expected_asset_type: Hint about asset type
        
        Returns:
            AgentResult with extracted asset data and fingerprint
        """
        start_time = datetime.utcnow()
        errors = []
        
        try:
            result = await self.asset_agent.run(
                document_content=document_content,
                document_type=document_type,
                expected_asset_type=expected_asset_type,
            )
            success = True
        except Exception as e:
            result = {}
            errors.append(str(e))
            success = False
        
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        return AgentResult(
            agent_type=AgentType.ASSET_DOCUMENT,
            success=success,
            result=result,
            execution_time_ms=execution_time,
            errors=errors,
            timestamp=start_time,
        )
    
    async def run_behavior_escalation(
        self,
        asset_id: str,
        issuer_id: str,
        payment_history: List[Dict[str, Any]],
        current_payment: Optional[Dict[str, Any]] = None,
        investor_id: Optional[str] = None,
        recipient_email: Optional[str] = None,
    ) -> AgentResult:
        """
        Run Behavior & Escalation Agent.
        
        Args:
            asset_id: Asset identifier
            issuer_id: Issuer identifier
            payment_history: Historical payments
            current_payment: Current payment status
            investor_id: Optional investor ID
            recipient_email: Email for notifications
        
        Returns:
            AgentResult with behavior analysis and escalation
        """
        start_time = datetime.utcnow()
        errors = []
        
        try:
            result = await self.behavior_agent.run(
                asset_id=asset_id,
                issuer_id=issuer_id,
                payment_history=payment_history,
                current_payment=current_payment,
                investor_id=investor_id,
                recipient_email=recipient_email,
            )
            success = True
        except Exception as e:
            result = {}
            errors.append(str(e))
            success = False
        
        end_time = datetime.utcnow()
        execution_time = (end_time - start_time).total_seconds() * 1000
        
        return AgentResult(
            agent_type=AgentType.BEHAVIOR_ESCALATION,
            success=success,
            result=result,
            execution_time_ms=execution_time,
            errors=errors,
            timestamp=start_time,
        )
    
    async def run_asset_onboarding_pipeline(
        self,
        kyc_profile: Dict[str, Any],
        asset_document_content: bytes,
        asset_document_type: str = "image",
        expected_asset_type: Optional[str] = None,
    ) -> Dict[str, AgentResult]:
        """
        Run full asset onboarding pipeline.
        
        Executes:
        1. Asset Document Agent - Extract asset info
        2. KYC Consistency Agent - Validate against KYC
        
        Args:
            kyc_profile: KYC profile data
            asset_document_content: Asset document bytes
            asset_document_type: Document type
            expected_asset_type: Hint about asset type
        
        Returns:
            Dict with agent results
        """
        results = {}
        
        # Run asset document extraction first
        asset_result = await self.run_asset_document(
            document_content=asset_document_content,
            document_type=asset_document_type,
            expected_asset_type=expected_asset_type,
        )
        results["asset_document"] = asset_result
        
        # Run KYC consistency check
        kyc_result = await self.run_kyc_consistency(
            kyc_profile=kyc_profile,
            asset_document_content=asset_document_content,
            asset_document_type=asset_document_type,
        )
        results["kyc_consistency"] = kyc_result
        
        # Aggregate results
        results["pipeline_success"] = all(r.success for r in results.values() if isinstance(r, AgentResult))
        
        if asset_result.success and kyc_result.success:
            results["onboarding_approved"] = kyc_result.result.get("is_consistent", False)
            results["fingerprint_hash"] = asset_result.result.get("fingerprint_hash")
        else:
            results["onboarding_approved"] = False
            results["fingerprint_hash"] = None
        
        return results
    
    async def run_payment_monitoring_pipeline(
        self,
        assets: List[Dict[str, Any]],
        recipient_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Run payment monitoring for multiple assets.
        
        Args:
            assets: List of asset data with payment history
            recipient_email: Email for escalation notifications
        
        Returns:
            Monitoring results for all assets
        """
        results = {
            "total_assets": len(assets),
            "assets_analyzed": 0,
            "escalations": [],
            "high_risk_assets": [],
            "results": [],
        }
        
        for asset in assets:
            try:
                result = await self.run_behavior_escalation(
                    asset_id=asset.get("asset_id"),
                    issuer_id=asset.get("issuer_id"),
                    payment_history=asset.get("payment_history", []),
                    current_payment=asset.get("current_payment"),
                    recipient_email=recipient_email,
                )
                
                results["assets_analyzed"] += 1
                results["results"].append({
                    "asset_id": asset.get("asset_id"),
                    "result": result,
                })
                
                if result.success and result.result.get("escalation", {}).get("required"):
                    results["escalations"].append({
                        "asset_id": asset.get("asset_id"),
                        "level": result.result["escalation"]["level"],
                        "reason": result.result["escalation"]["reason"],
                    })
                
                if result.success:
                    risk_score = result.result.get("behavior_analysis", {}).get("risk_score", 0)
                    if risk_score >= 0.7:
                        results["high_risk_assets"].append({
                            "asset_id": asset.get("asset_id"),
                            "risk_score": risk_score,
                        })
            
            except Exception as e:
                results["results"].append({
                    "asset_id": asset.get("asset_id"),
                    "error": str(e),
                })
        
        return results


# Convenience function for running agents
async def run_agent(
    agent_type: AgentType,
    **kwargs,
) -> AgentResult:
    """
    Run a single agent.
    
    Args:
        agent_type: Type of agent to run
        **kwargs: Agent-specific parameters
    
    Returns:
        AgentResult
    """
    runner = AgentRunner()
    
    if agent_type == AgentType.KYC_CONSISTENCY:
        return await runner.run_kyc_consistency(**kwargs)
    elif agent_type == AgentType.ASSET_DOCUMENT:
        return await runner.run_asset_document(**kwargs)
    elif agent_type == AgentType.BEHAVIOR_ESCALATION:
        return await runner.run_behavior_escalation(**kwargs)
    else:
        raise ValueError(f"Unknown agent type: {agent_type}")
