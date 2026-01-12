// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRiskEngine {
    struct RiskAssessment {
        bytes32 assetId;
        uint256 riskScore;
        uint256 paymentScore;
        uint256 marketScore;
        uint256 issuerScore;
        uint256 lastUpdated;
        uint256 missedPayments;
        uint256 daysPastDue;
        bool isMonitored;
    }

    struct RiskThresholds {
        uint256 lowToMedium;
        uint256 mediumToHigh;
        uint256 highToCritical;
        uint256 maxMissedPayments;
        uint256 maxDaysPastDue;
    }

    function getRiskAssessment(bytes32 _assetId) external view returns (RiskAssessment memory);
    function getRiskScore(bytes32 _assetId) external view returns (uint256);
    function checkDefaultConditions(bytes32 _assetId) external view returns (bool shouldDefault, string memory reason);
    function getThresholds() external view returns (RiskThresholds memory);
    function recordPayment(bytes32 _assetId, bool _onTime, uint256 _daysPastDue) external;
    function recordMissedPayment(bytes32 _assetId) external;
}
