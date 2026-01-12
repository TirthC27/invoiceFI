// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDefaultEngine {
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

    struct DefaultConditions {
        uint256 minMissedPayments;
        uint256 minDaysPastDue;
        uint256 minRiskScore;
        bool requireAllConditions;
    }

    function checkAndDeclareDefault(bytes32 _assetId) external;
    function initiateRecovery(bytes32 _assetId, bytes32 _auctionId) external;
    function resolveDefault(bytes32 _assetId, uint256 _recoveredAmount) external;
    function getDefaultRecord(bytes32 _assetId) external view returns (DefaultRecord memory);
    function isDefaulted(bytes32 _assetId) external view returns (bool);
    function getDefaultedAssets() external view returns (bytes32[] memory);
    function previewDefaultEligibility(bytes32 _assetId) external view returns (
        bool eligible,
        string memory reason,
        uint256 missedPayments,
        uint256 daysPastDue,
        uint256 riskScore
    );
}
