// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILossClaimNFT {
    struct LossClaim {
        uint256 tokenId;
        address originalInvestor;
        bytes32 assetId;
        uint256 investedAmount;
        uint256 claimableAmount;
        uint256 recoveryPercentage;
        bytes32 auctionId;
        bool claimed;
        uint256 mintedAt;
        uint256 claimedAt;
    }

    function mint(
        address _to,
        bytes32 _assetId,
        uint256 _investedAmount,
        uint256 _claimableAmount,
        uint256 _recoveryPercentage,
        bytes32 _auctionId
    ) external returns (uint256);

    function claim(uint256 _tokenId) external;
    function batchClaim(uint256[] calldata _tokenIds) external;
    
    function getLossClaim(uint256 _tokenId) external view returns (LossClaim memory);
    function getAssetClaims(bytes32 _assetId) external view returns (uint256[] memory);
    function getInvestorClaims(address _investor) external view returns (uint256[] memory);
    function getClaimableAmount(uint256 _tokenId) external view returns (uint256);
    function getTotalClaimableForInvestor(address _investor) external view returns (uint256);
}
