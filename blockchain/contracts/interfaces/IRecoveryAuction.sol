// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRecoveryAuction {
    enum AuctionStatus {
        NOT_STARTED,
        ACTIVE,
        ENDED,
        SETTLED,
        CANCELLED
    }

    struct Auction {
        bytes32 id;
        bytes32 assetId;
        uint256 startTime;
        uint256 endTime;
        uint256 minimumBid;
        uint256 currentBid;
        address highestBidder;
        AuctionStatus status;
        uint256 totalInvestment;
        uint256 settlementAmount;
        bool fundsDistributed;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    function createAuction(
        bytes32 _assetId,
        uint256 _minimumBid,
        uint256 _duration,
        uint256 _totalInvestment
    ) external returns (bytes32);
    
    function placeBid(bytes32 _auctionId) external payable;
    function withdrawBid(bytes32 _auctionId) external;
    function endAuction(bytes32 _auctionId) external;
    function settleAuction(bytes32 _auctionId) external;
    
    function getAuction(bytes32 _auctionId) external view returns (Auction memory);
    function getAuctionBids(bytes32 _auctionId) external view returns (Bid[] memory);
    function getActiveAuctions() external view returns (bytes32[] memory);
    function isAuctionActive(bytes32 _auctionId) external view returns (bool);
}
