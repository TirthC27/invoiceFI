// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IAssetRegistry.sol";
import "./interfaces/IRiskEngine.sol";

/**
 * @title DefaultEngine
 * @dev Manages default declaration and recovery initiation
 * @notice CRITICAL: No admin-triggered default in production. Default is based on objective criteria only.
 */
contract DefaultEngine is AccessControl, ReentrancyGuard, Pausable {
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    // Note: No role can manually trigger default - it must be based on conditions

    // ============================================
    // STRUCTS
    // ============================================
    struct DefaultRecord {
        bytes32 assetId;
        uint256 defaultDate;
        string reason;
        uint256 missedPayments;
        uint256 daysPastDue;
        uint256 outstandingAmount;
        bool recoveryInitiated;
        bytes32 recoveryAuctionId;
        bool isResolved;
    }

    // Default trigger conditions
    struct DefaultConditions {
        uint256 minMissedPayments;
        uint256 minDaysPastDue;
        uint256 minRiskScore;
        bool requireAllConditions; // If true, all must be met. If false, any one suffices
    }

    // ============================================
    // STATE
    // ============================================
    IAssetRegistry public assetRegistry;
    IRiskEngine public riskEngine;
    address public recoveryAuction;
    
    mapping(bytes32 => DefaultRecord) public defaultRecords;
    bytes32[] public defaultedAssets;
    
    DefaultConditions public defaultConditions;

    // ============================================
    // EVENTS
    // ============================================
    event DefaultDeclared(
        bytes32 indexed assetId,
        string reason,
        uint256 outstandingAmount,
        uint256 timestamp
    );

    event RecoveryInitiated(
        bytes32 indexed assetId,
        bytes32 recoveryAuctionId,
        uint256 timestamp
    );

    event DefaultResolved(
        bytes32 indexed assetId,
        uint256 recoveredAmount,
        uint256 timestamp
    );

    event DefaultConditionsUpdated(
        uint256 minMissedPayments,
        uint256 minDaysPastDue,
        uint256 minRiskScore
    );

    // ============================================
    // ERRORS
    // ============================================
    error AssetNotFound();
    error AlreadyDefaulted();
    error DefaultConditionsNotMet();
    error RecoveryAlreadyInitiated();
    error InvalidRecoveryAuction();
    error NotDefaulted();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor(address _assetRegistry, address _riskEngine) {
        assetRegistry = IAssetRegistry(_assetRegistry);
        riskEngine = IRiskEngine(_riskEngine);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Default conditions - can be updated by admin
        defaultConditions = DefaultConditions({
            minMissedPayments: 2,
            minDaysPastDue: 30,
            minRiskScore: 85,
            requireAllConditions: false // Any single condition triggers default eligibility
        });
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Check and declare default if conditions are met
     * @dev This is the ONLY way to declare default - based on objective criteria
     * @param _assetId Asset ID to check
     */
    function checkAndDeclareDefault(bytes32 _assetId) external nonReentrant whenNotPaused {
        // Verify asset exists and is not already defaulted
        IAssetRegistry.Asset memory asset = assetRegistry.getAsset(_assetId);
        if (assetRegistry.isAssetDefaulted(_assetId)) {
            revert AlreadyDefaulted();
        }

        // Get risk assessment
        (bool shouldDefault, string memory reason) = riskEngine.checkDefaultConditions(_assetId);
        
        if (!shouldDefault) {
            // Double check with our own conditions
            IRiskEngine.RiskAssessment memory assessment = riskEngine.getRiskAssessment(_assetId);
            
            bool conditionsMet = _checkDefaultConditions(assessment);
            if (!conditionsMet) {
                revert DefaultConditionsNotMet();
            }
            reason = _buildDefaultReason(assessment);
        }

        // Declare default
        _declareDefault(_assetId, reason, asset);
    }

    /**
     * @notice Initiate recovery process for defaulted asset
     * @param _assetId Asset ID
     * @param _auctionId Recovery auction ID (from RecoveryAuction contract)
     */
    function initiateRecovery(
        bytes32 _assetId,
        bytes32 _auctionId
    ) external nonReentrant whenNotPaused {
        DefaultRecord storage record = defaultRecords[_assetId];
        if (record.defaultDate == 0) {
            revert NotDefaulted();
        }
        if (record.recoveryInitiated) {
            revert RecoveryAlreadyInitiated();
        }

        record.recoveryInitiated = true;
        record.recoveryAuctionId = _auctionId;

        emit RecoveryInitiated(_assetId, _auctionId, block.timestamp);
    }

    /**
     * @notice Mark default as resolved after recovery
     * @param _assetId Asset ID
     * @param _recoveredAmount Amount recovered
     */
    function resolveDefault(
        bytes32 _assetId,
        uint256 _recoveredAmount
    ) external nonReentrant {
        // Should be called by RecoveryAuction contract
        DefaultRecord storage record = defaultRecords[_assetId];
        if (record.defaultDate == 0) {
            revert NotDefaulted();
        }

        record.isResolved = true;

        // Update asset status in registry
        assetRegistry.updateAssetStatus(_assetId, IAssetRegistry.AssetStatus.RECOVERED);

        emit DefaultResolved(_assetId, _recoveredAmount, block.timestamp);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getDefaultRecord(bytes32 _assetId) external view returns (DefaultRecord memory) {
        return defaultRecords[_assetId];
    }

    function isDefaulted(bytes32 _assetId) external view returns (bool) {
        return defaultRecords[_assetId].defaultDate > 0;
    }

    function getDefaultedAssets() external view returns (bytes32[] memory) {
        return defaultedAssets;
    }

    function getDefaultConditions() external view returns (DefaultConditions memory) {
        return defaultConditions;
    }

    /**
     * @notice Preview if an asset would qualify for default
     * @param _assetId Asset ID
     */
    function previewDefaultEligibility(bytes32 _assetId) external view returns (
        bool eligible,
        string memory reason,
        uint256 missedPayments,
        uint256 daysPastDue,
        uint256 riskScore
    ) {
        IRiskEngine.RiskAssessment memory assessment = riskEngine.getRiskAssessment(_assetId);
        
        eligible = _checkDefaultConditions(assessment);
        reason = eligible ? _buildDefaultReason(assessment) : "Conditions not met";
        missedPayments = assessment.missedPayments;
        daysPastDue = assessment.daysPastDue;
        riskScore = assessment.riskScore;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Update default conditions
     * @dev Admin can adjust thresholds but CANNOT manually trigger default
     */
    function setDefaultConditions(DefaultConditions calldata _conditions) external onlyRole(ADMIN_ROLE) {
        defaultConditions = _conditions;
        
        emit DefaultConditionsUpdated(
            _conditions.minMissedPayments,
            _conditions.minDaysPastDue,
            _conditions.minRiskScore
        );
    }

    function setRecoveryAuction(address _recoveryAuction) external onlyRole(ADMIN_ROLE) {
        recoveryAuction = _recoveryAuction;
    }

    function setRiskEngine(address _riskEngine) external onlyRole(ADMIN_ROLE) {
        riskEngine = IRiskEngine(_riskEngine);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _checkDefaultConditions(
        IRiskEngine.RiskAssessment memory _assessment
    ) internal view returns (bool) {
        bool missedPaymentsMet = _assessment.missedPayments >= defaultConditions.minMissedPayments;
        bool daysPastDueMet = _assessment.daysPastDue >= defaultConditions.minDaysPastDue;
        bool riskScoreMet = _assessment.riskScore >= defaultConditions.minRiskScore;

        if (defaultConditions.requireAllConditions) {
            return missedPaymentsMet && daysPastDueMet && riskScoreMet;
        } else {
            return missedPaymentsMet || daysPastDueMet || riskScoreMet;
        }
    }

    function _buildDefaultReason(
        IRiskEngine.RiskAssessment memory _assessment
    ) internal view returns (string memory) {
        if (_assessment.missedPayments >= defaultConditions.minMissedPayments) {
            return "Missed payment threshold exceeded";
        }
        if (_assessment.daysPastDue >= defaultConditions.minDaysPastDue) {
            return "Days past due threshold exceeded";
        }
        if (_assessment.riskScore >= defaultConditions.minRiskScore) {
            return "Critical risk score reached";
        }
        return "Multiple risk factors";
    }

    function _declareDefault(
        bytes32 _assetId,
        string memory _reason,
        IAssetRegistry.Asset memory _asset
    ) internal {
        IRiskEngine.RiskAssessment memory assessment = riskEngine.getRiskAssessment(_assetId);
        
        // Calculate outstanding amount
        uint256 outstanding = _asset.fundedAmount; // Simplified - full principal

        defaultRecords[_assetId] = DefaultRecord({
            assetId: _assetId,
            defaultDate: block.timestamp,
            reason: _reason,
            missedPayments: assessment.missedPayments,
            daysPastDue: assessment.daysPastDue,
            outstandingAmount: outstanding,
            recoveryInitiated: false,
            recoveryAuctionId: bytes32(0),
            isResolved: false
        });

        defaultedAssets.push(_assetId);

        // Update asset registry
        assetRegistry.updateAssetStatus(_assetId, IAssetRegistry.AssetStatus.DEFAULT);

        emit DefaultDeclared(_assetId, _reason, outstanding, block.timestamp);
    }
}
