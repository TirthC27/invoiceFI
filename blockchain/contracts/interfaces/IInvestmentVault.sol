// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IInvestmentVault {
    struct Investment {
        bytes32 id;
        address investor;
        bytes32 assetId;
        uint256 amount;
        uint256 shares;
        uint256 investedAt;
        uint256 expectedReturn;
        uint256 claimedReturns;
        bool isActive;
        bool isExited;
    }

    struct AssetPool {
        bytes32 assetId;
        uint256 totalInvested;
        uint256 totalShares;
        uint256 totalReturnsDistributed;
        uint256 availableForClaims;
        bool isOpen;
    }

    function invest(bytes32 _assetId) external payable;
    function distributeReturns(bytes32 _assetId) external payable;
    function claimReturns(bytes32 _investmentId) external;
    function exitOnDefault(bytes32 _investmentId) external;
    function getInvestment(bytes32 _investmentId) external view returns (Investment memory);
    function getInvestorPositions(address _investor) external view returns (bytes32[] memory);
    function getAssetPool(bytes32 _assetId) external view returns (AssetPool memory);
    function getAssetInvestors(bytes32 _assetId) external view returns (address[] memory);
    function calculatePendingReturns(bytes32 _investmentId) external view returns (uint256);
}
