// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IAssetRegistry.sol";

/**
 * @title RiskEngine
 * @dev Manages risk assessment and monitoring for assets
 * @notice Computes risk scores and triggers status changes based on objective criteria
 */
contract RiskEngine is AccessControl, ReentrancyGuard, Pausable {
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ============================================
    // STRUCTS
    // ============================================
    struct RiskAssessment {
        bytes32 assetId;
        uint256 riskScore; // 0-100
        uint256 paymentScore; // Based on payment history
        uint256 marketScore; // Based on market conditions
        uint256 issuerScore; // Based on issuer history
        uint256 lastUpdated;
        uint256 missedPayments;
        uint256 daysPastDue;
        bool isMonitored;
    }

    struct RiskThresholds {
        uint256 lowToMedium; // Score threshold
        uint256 mediumToHigh;
        uint256 highToCritical;
        uint256 maxMissedPayments; // Before triggering default review
        uint256 maxDaysPastDue; // Before triggering default review
    }

    // ============================================
    // STATE
    // ============================================
    IAssetRegistry public assetRegistry;
    
    mapping(bytes32 => RiskAssessment) public riskAssessments;
    RiskThresholds public thresholds;
    
    bytes32[] public monitoredAssets;
    mapping(bytes32 => uint256) public assetToMonitoredIndex;

    // Risk factor weights (sum to 100)
    uint256 public constant PAYMENT_WEIGHT = 40;
    uint256 public constant MARKET_WEIGHT = 30;
    uint256 public constant ISSUER_WEIGHT = 30;

    // ============================================
    // EVENTS
    // ============================================
    event RiskAssessmentUpdated(
        bytes32 indexed assetId,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );

    event PaymentRecorded(
        bytes32 indexed assetId,
        bool onTime,
        uint256 daysPastDue
    );

    event MissedPaymentRecorded(
        bytes32 indexed assetId,
        uint256 totalMissed,
        uint256 daysPastDue
    );

    event RiskThresholdBreached(
        bytes32 indexed assetId,
        string thresholdType,
        uint256 value
    );

    event AssetAddedToMonitoring(bytes32 indexed assetId);
    event AssetRemovedFromMonitoring(bytes32 indexed assetId);

    // ============================================
    // ERRORS
    // ============================================
    error AssetNotFound();
    error AlreadyMonitored();
    error NotMonitored();
    error InvalidThreshold();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor(address _assetRegistry) {
        assetRegistry = IAssetRegistry(_assetRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        // Default thresholds
        thresholds = RiskThresholds({
            lowToMedium: 30,
            mediumToHigh: 60,
            highToCritical: 80,
            maxMissedPayments: 2,
            maxDaysPastDue: 30
        });
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Add asset to monitoring
     * @param _assetId Asset ID
     */
    function addToMonitoring(bytes32 _assetId) external onlyRole(ADMIN_ROLE) {
        if (riskAssessments[_assetId].isMonitored) {
            revert AlreadyMonitored();
        }

        riskAssessments[_assetId] = RiskAssessment({
            assetId: _assetId,
            riskScore: 50, // Start at medium
            paymentScore: 50,
            marketScore: 50,
            issuerScore: 50,
            lastUpdated: block.timestamp,
            missedPayments: 0,
            daysPastDue: 0,
            isMonitored: true
        });

        assetToMonitoredIndex[_assetId] = monitoredAssets.length;
        monitoredAssets.push(_assetId);

        emit AssetAddedToMonitoring(_assetId);
    }

    /**
     * @notice Record a payment for an asset
     * @param _assetId Asset ID
     * @param _onTime Whether payment was on time
     * @param _daysPastDue Days past due (0 if on time)
     */
    function recordPayment(
        bytes32 _assetId,
        bool _onTime,
        uint256 _daysPastDue
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        if (!assessment.isMonitored) {
            revert NotMonitored();
        }

        if (_onTime) {
            // Improve payment score on successful payment
            if (assessment.paymentScore < 100) {
                assessment.paymentScore += 5;
                if (assessment.paymentScore > 100) assessment.paymentScore = 100;
            }
            // Reset days past due
            assessment.daysPastDue = 0;
            
            emit PaymentRecorded(_assetId, true, 0);
        } else {
            // Worsen payment score on late/missed payment
            if (assessment.paymentScore > 10) {
                assessment.paymentScore -= 10;
            }
            assessment.daysPastDue = _daysPastDue;
            
            emit PaymentRecorded(_assetId, false, _daysPastDue);
        }

        _updateRiskScore(_assetId);
    }

    /**
     * @notice Record a missed payment
     * @param _assetId Asset ID
     */
    function recordMissedPayment(bytes32 _assetId) external onlyRole(ORACLE_ROLE) whenNotPaused {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        if (!assessment.isMonitored) {
            revert NotMonitored();
        }

        assessment.missedPayments++;
        assessment.paymentScore = assessment.paymentScore > 20 ? assessment.paymentScore - 20 : 0;

        emit MissedPaymentRecorded(_assetId, assessment.missedPayments, assessment.daysPastDue);

        // Check thresholds
        if (assessment.missedPayments >= thresholds.maxMissedPayments) {
            emit RiskThresholdBreached(_assetId, "missedPayments", assessment.missedPayments);
        }

        _updateRiskScore(_assetId);
    }

    /**
     * @notice Update market score (from oracle)
     * @param _assetId Asset ID
     * @param _marketScore New market score (0-100)
     */
    function updateMarketScore(
        bytes32 _assetId,
        uint256 _marketScore
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        if (!assessment.isMonitored) {
            revert NotMonitored();
        }

        assessment.marketScore = _marketScore > 100 ? 100 : _marketScore;
        _updateRiskScore(_assetId);
    }

    /**
     * @notice Update issuer score
     * @param _assetId Asset ID
     * @param _issuerScore New issuer score (0-100)
     */
    function updateIssuerScore(
        bytes32 _assetId,
        uint256 _issuerScore
    ) external onlyRole(ORACLE_ROLE) whenNotPaused {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        if (!assessment.isMonitored) {
            revert NotMonitored();
        }

        assessment.issuerScore = _issuerScore > 100 ? 100 : _issuerScore;
        _updateRiskScore(_assetId);
    }

    /**
     * @notice Check if asset should be flagged for default
     * @param _assetId Asset ID
     */
    function checkDefaultConditions(bytes32 _assetId) external view returns (bool shouldDefault, string memory reason) {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        
        if (assessment.missedPayments >= thresholds.maxMissedPayments) {
            return (true, "Exceeded maximum missed payments");
        }
        
        if (assessment.daysPastDue >= thresholds.maxDaysPastDue) {
            return (true, "Exceeded maximum days past due");
        }
        
        if (assessment.riskScore >= 95) {
            return (true, "Critical risk score reached");
        }

        return (false, "");
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getRiskAssessment(bytes32 _assetId) external view returns (RiskAssessment memory) {
        return riskAssessments[_assetId];
    }

    function getRiskScore(bytes32 _assetId) external view returns (uint256) {
        return riskAssessments[_assetId].riskScore;
    }

    function getMonitoredAssets() external view returns (bytes32[] memory) {
        return monitoredAssets;
    }

    function getThresholds() external view returns (RiskThresholds memory) {
        return thresholds;
    }

    function getRiskLevel(bytes32 _assetId) external view returns (IAssetRegistry.RiskLevel) {
        uint256 score = riskAssessments[_assetId].riskScore;
        
        if (score < thresholds.lowToMedium) {
            return IAssetRegistry.RiskLevel.LOW;
        } else if (score < thresholds.mediumToHigh) {
            return IAssetRegistry.RiskLevel.MEDIUM;
        } else if (score < thresholds.highToCritical) {
            return IAssetRegistry.RiskLevel.HIGH;
        } else {
            return IAssetRegistry.RiskLevel.CRITICAL;
        }
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setThresholds(RiskThresholds calldata _thresholds) external onlyRole(ADMIN_ROLE) {
        if (_thresholds.lowToMedium >= _thresholds.mediumToHigh ||
            _thresholds.mediumToHigh >= _thresholds.highToCritical) {
            revert InvalidThreshold();
        }
        thresholds = _thresholds;
    }

    function setOracleRole(address _oracle) external onlyRole(ADMIN_ROLE) {
        _grantRole(ORACLE_ROLE, _oracle);
    }

    function removeFromMonitoring(bytes32 _assetId) external onlyRole(ADMIN_ROLE) {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        if (!assessment.isMonitored) {
            revert NotMonitored();
        }

        assessment.isMonitored = false;
        
        // Remove from array
        uint256 index = assetToMonitoredIndex[_assetId];
        uint256 lastIndex = monitoredAssets.length - 1;
        
        if (index != lastIndex) {
            bytes32 lastAssetId = monitoredAssets[lastIndex];
            monitoredAssets[index] = lastAssetId;
            assetToMonitoredIndex[lastAssetId] = index;
        }
        
        monitoredAssets.pop();
        delete assetToMonitoredIndex[_assetId];

        emit AssetRemovedFromMonitoring(_assetId);
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

    function _updateRiskScore(bytes32 _assetId) internal {
        RiskAssessment storage assessment = riskAssessments[_assetId];
        
        uint256 oldScore = assessment.riskScore;
        
        // Calculate weighted score (higher = more risky, so we invert the component scores)
        uint256 paymentRisk = 100 - assessment.paymentScore;
        uint256 marketRisk = 100 - assessment.marketScore;
        uint256 issuerRisk = 100 - assessment.issuerScore;
        
        assessment.riskScore = (paymentRisk * PAYMENT_WEIGHT + 
                                marketRisk * MARKET_WEIGHT + 
                                issuerRisk * ISSUER_WEIGHT) / 100;
        
        assessment.lastUpdated = block.timestamp;

        // Update asset registry risk level
        IAssetRegistry.RiskLevel newLevel = _scoreToRiskLevel(assessment.riskScore);
        assetRegistry.updateRiskLevel(_assetId, newLevel);

        emit RiskAssessmentUpdated(_assetId, oldScore, assessment.riskScore, block.timestamp);
    }

    function _scoreToRiskLevel(uint256 _score) internal view returns (IAssetRegistry.RiskLevel) {
        if (_score < thresholds.lowToMedium) {
            return IAssetRegistry.RiskLevel.LOW;
        } else if (_score < thresholds.mediumToHigh) {
            return IAssetRegistry.RiskLevel.MEDIUM;
        } else if (_score < thresholds.highToCritical) {
            return IAssetRegistry.RiskLevel.HIGH;
        } else {
            return IAssetRegistry.RiskLevel.CRITICAL;
        }
    }
}
