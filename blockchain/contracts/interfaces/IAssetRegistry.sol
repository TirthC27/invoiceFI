// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAssetRegistry {
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
        uint256 expectedYield;
        uint256 term;
        AssetStatus status;
        RiskLevel riskLevel;
        uint256 createdAt;
        uint256 fundingDeadline;
        uint256 maturityDate;
    }

    function getAsset(bytes32 _assetId) external view returns (Asset memory);
    function getAssetsByIssuer(address _issuer) external view returns (bytes32[] memory);
    function getAllAssetIds() external view returns (bytes32[] memory);
    function getAssetStatus(bytes32 _assetId) external view returns (AssetStatus);
    function getAssetRiskLevel(bytes32 _assetId) external view returns (RiskLevel);
    function isAssetActive(bytes32 _assetId) external view returns (bool);
    function isAssetDefaulted(bytes32 _assetId) external view returns (bool);
    function updateAssetStatus(bytes32 _assetId, AssetStatus _newStatus) external;
    function updateRiskLevel(bytes32 _assetId, RiskLevel _newLevel) external;
    function updateFundedAmount(bytes32 _assetId, uint256 _additionalFunding) external;
}
