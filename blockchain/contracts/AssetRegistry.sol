// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AssetRegistry
 * @dev Registry for tokenized real-world assets
 * @notice Manages asset creation, status, and metadata
 */
contract AssetRegistry is AccessControl, ReentrancyGuard, Pausable {
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RISK_ENGINE_ROLE = keccak256("RISK_ENGINE_ROLE");

    // ============================================
    // ENUMS
    // ============================================
    enum AssetStatus {
        DRAFT,
        PENDING_VERIFICATION,
        ACTIVE,
        FUNDED,
        PERFORMING,
        DELINQUENT,
        DEFAULT,
        RECOVERED,
        CLOSED
    }

    enum RiskLevel {
        LOW,
        MEDIUM,
        HIGH,
        CRITICAL
    }

    // ============================================
    // STRUCTS
    // ============================================
    struct AssetMetadata {
        string name;
        string description;
        string assetType;
        string documentCID;
        bytes32 fingerprintHash;
        uint256 valuationDate;
    }

    struct Asset {
        bytes32 id;
        address issuer;
        AssetMetadata metadata;
        uint256 totalValue;
        uint256 fundingGoal;
        uint256 fundedAmount;
        uint256 expectedYield; // In basis points (e.g., 1200 = 12%)
        uint256 term; // In days
        AssetStatus status;
        RiskLevel riskLevel;
        uint256 createdAt;
        uint256 fundingDeadline;
        uint256 maturityDate;
    }

    // ============================================
    // STATE
    // ============================================
    mapping(bytes32 => Asset) public assets;
    mapping(address => bytes32[]) public issuerAssets;
    bytes32[] public allAssetIds;
    
    uint256 public assetCount;
    uint256 public constant MIN_FUNDING_PERIOD = 7 days;
    uint256 public constant MAX_FUNDING_PERIOD = 90 days;
    uint256 public constant MAX_YIELD = 5000; // 50% max annual yield

    // ============================================
    // EVENTS
    // ============================================
    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed issuer,
        uint256 totalValue,
        uint256 fundingGoal,
        uint256 fundingDeadline
    );

    event AssetStatusChanged(
        bytes32 indexed assetId,
        AssetStatus oldStatus,
        AssetStatus newStatus,
        uint256 timestamp
    );

    event AssetRiskLevelChanged(
        bytes32 indexed assetId,
        RiskLevel oldLevel,
        RiskLevel newLevel,
        uint256 timestamp
    );

    event AssetFundingUpdated(
        bytes32 indexed assetId,
        uint256 newFundedAmount,
        uint256 fundingGoal
    );

    event AssetMetadataUpdated(
        bytes32 indexed assetId,
        string documentCID,
        bytes32 fingerprintHash
    );

    // ============================================
    // ERRORS
    // ============================================
    error AssetNotFound(bytes32 assetId);
    error InvalidFundingPeriod();
    error InvalidYield();
    error InvalidStatus();
    error UnauthorizedIssuer();
    error AssetAlreadyExists();
    error FundingDeadlinePassed();
    error InvalidTransition();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Register a new asset
     * @param _metadata Asset metadata
     * @param _totalValue Total value of the asset
     * @param _fundingGoal Target funding amount
     * @param _expectedYield Expected annual yield in basis points
     * @param _term Term in days
     * @param _fundingPeriod Funding period in days
     */
    function registerAsset(
        AssetMetadata calldata _metadata,
        uint256 _totalValue,
        uint256 _fundingGoal,
        uint256 _expectedYield,
        uint256 _term,
        uint256 _fundingPeriod
    ) external onlyRole(ISSUER_ROLE) whenNotPaused nonReentrant returns (bytes32) {
        // Validate inputs
        if (_fundingPeriod < MIN_FUNDING_PERIOD || _fundingPeriod > MAX_FUNDING_PERIOD) {
            revert InvalidFundingPeriod();
        }
        if (_expectedYield > MAX_YIELD) {
            revert InvalidYield();
        }

        // Generate unique asset ID
        bytes32 assetId = keccak256(
            abi.encodePacked(
                msg.sender,
                _metadata.fingerprintHash,
                block.timestamp,
                assetCount
            )
        );

        if (assets[assetId].createdAt != 0) {
            revert AssetAlreadyExists();
        }

        uint256 fundingDeadline = block.timestamp + _fundingPeriod;
        uint256 maturityDate = fundingDeadline + (_term * 1 days);

        // Create asset
        assets[assetId] = Asset({
            id: assetId,
            issuer: msg.sender,
            metadata: _metadata,
            totalValue: _totalValue,
            fundingGoal: _fundingGoal,
            fundedAmount: 0,
            expectedYield: _expectedYield,
            term: _term,
            status: AssetStatus.PENDING_VERIFICATION,
            riskLevel: RiskLevel.MEDIUM,
            createdAt: block.timestamp,
            fundingDeadline: fundingDeadline,
            maturityDate: maturityDate
        });

        issuerAssets[msg.sender].push(assetId);
        allAssetIds.push(assetId);
        assetCount++;

        emit AssetRegistered(
            assetId,
            msg.sender,
            _totalValue,
            _fundingGoal,
            fundingDeadline
        );

        return assetId;
    }

    /**
     * @notice Update asset status
     * @param _assetId Asset ID
     * @param _newStatus New status
     */
    function updateAssetStatus(
        bytes32 _assetId,
        AssetStatus _newStatus
    ) external whenNotPaused {
        Asset storage asset = assets[_assetId];
        if (asset.createdAt == 0) {
            revert AssetNotFound(_assetId);
        }

        // Check authorization
        bool isIssuer = asset.issuer == msg.sender;
        bool isAdmin = hasRole(ADMIN_ROLE, msg.sender);
        bool isRiskEngine = hasRole(RISK_ENGINE_ROLE, msg.sender);

        if (!isIssuer && !isAdmin && !isRiskEngine) {
            revert UnauthorizedIssuer();
        }

        // Validate status transition
        _validateStatusTransition(asset.status, _newStatus, isAdmin, isRiskEngine);

        AssetStatus oldStatus = asset.status;
        asset.status = _newStatus;

        emit AssetStatusChanged(_assetId, oldStatus, _newStatus, block.timestamp);
    }

    /**
     * @notice Update asset risk level (only Risk Engine)
     * @param _assetId Asset ID
     * @param _newLevel New risk level
     */
    function updateRiskLevel(
        bytes32 _assetId,
        RiskLevel _newLevel
    ) external onlyRole(RISK_ENGINE_ROLE) whenNotPaused {
        Asset storage asset = assets[_assetId];
        if (asset.createdAt == 0) {
            revert AssetNotFound(_assetId);
        }

        RiskLevel oldLevel = asset.riskLevel;
        asset.riskLevel = _newLevel;

        emit AssetRiskLevelChanged(_assetId, oldLevel, _newLevel, block.timestamp);
    }

    /**
     * @notice Update funded amount (called by Investment Vault)
     * @param _assetId Asset ID
     * @param _additionalFunding Additional funding amount
     */
    function updateFundedAmount(
        bytes32 _assetId,
        uint256 _additionalFunding
    ) external whenNotPaused {
        // This should be called by Investment Vault contract
        Asset storage asset = assets[_assetId];
        if (asset.createdAt == 0) {
            revert AssetNotFound(_assetId);
        }

        asset.fundedAmount += _additionalFunding;

        // Auto-update status if fully funded
        if (asset.fundedAmount >= asset.fundingGoal && asset.status == AssetStatus.ACTIVE) {
            AssetStatus oldStatus = asset.status;
            asset.status = AssetStatus.FUNDED;
            emit AssetStatusChanged(_assetId, oldStatus, AssetStatus.FUNDED, block.timestamp);
        }

        emit AssetFundingUpdated(_assetId, asset.fundedAmount, asset.fundingGoal);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getAsset(bytes32 _assetId) external view returns (Asset memory) {
        if (assets[_assetId].createdAt == 0) {
            revert AssetNotFound(_assetId);
        }
        return assets[_assetId];
    }

    function getAssetsByIssuer(address _issuer) external view returns (bytes32[] memory) {
        return issuerAssets[_issuer];
    }

    function getAllAssetIds() external view returns (bytes32[] memory) {
        return allAssetIds;
    }

    function getAssetStatus(bytes32 _assetId) external view returns (AssetStatus) {
        if (assets[_assetId].createdAt == 0) {
            revert AssetNotFound(_assetId);
        }
        return assets[_assetId].status;
    }

    function getAssetRiskLevel(bytes32 _assetId) external view returns (RiskLevel) {
        if (assets[_assetId].createdAt == 0) {
            revert AssetNotFound(_assetId);
        }
        return assets[_assetId].riskLevel;
    }

    function isAssetActive(bytes32 _assetId) external view returns (bool) {
        Asset storage asset = assets[_assetId];
        return asset.status == AssetStatus.ACTIVE || 
               asset.status == AssetStatus.FUNDED || 
               asset.status == AssetStatus.PERFORMING;
    }

    function isAssetDefaulted(bytes32 _assetId) external view returns (bool) {
        return assets[_assetId].status == AssetStatus.DEFAULT;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function grantIssuerRole(address _issuer) external onlyRole(ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, _issuer);
    }

    function revokeIssuerRole(address _issuer) external onlyRole(ADMIN_ROLE) {
        _revokeRole(ISSUER_ROLE, _issuer);
    }

    function setRiskEngineRole(address _riskEngine) external onlyRole(ADMIN_ROLE) {
        _grantRole(RISK_ENGINE_ROLE, _riskEngine);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _validateStatusTransition(
        AssetStatus _current,
        AssetStatus _new,
        bool _isAdmin,
        bool _isRiskEngine
    ) internal pure {
        // Define valid transitions
        if (_current == AssetStatus.DRAFT) {
            if (_new != AssetStatus.PENDING_VERIFICATION) revert InvalidTransition();
        } else if (_current == AssetStatus.PENDING_VERIFICATION) {
            if (_new != AssetStatus.ACTIVE && _new != AssetStatus.DRAFT) revert InvalidTransition();
        } else if (_current == AssetStatus.ACTIVE) {
            if (_new != AssetStatus.FUNDED && _new != AssetStatus.CLOSED) revert InvalidTransition();
        } else if (_current == AssetStatus.FUNDED) {
            if (_new != AssetStatus.PERFORMING) revert InvalidTransition();
        } else if (_current == AssetStatus.PERFORMING) {
            if (_new != AssetStatus.DELINQUENT && _new != AssetStatus.CLOSED) revert InvalidTransition();
        } else if (_current == AssetStatus.DELINQUENT) {
            // Only Risk Engine can transition to DEFAULT
            if (_new == AssetStatus.DEFAULT && !_isRiskEngine) revert InvalidTransition();
            if (_new != AssetStatus.DEFAULT && _new != AssetStatus.PERFORMING) revert InvalidTransition();
        } else if (_current == AssetStatus.DEFAULT) {
            if (_new != AssetStatus.RECOVERED) revert InvalidTransition();
        }
    }
}
