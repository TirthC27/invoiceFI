// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IAssetRegistry.sol";
import "./LossClaimNFT.sol";

/**
 * @title RecoveryAuction
 * @dev Manages recovery auctions for defaulted assets
 * @notice Handles bidding, settlement, and loss claim NFT minting
 */
contract RecoveryAuction is AccessControl, ReentrancyGuard, Pausable {
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEFAULT_ENGINE_ROLE = keccak256("DEFAULT_ENGINE_ROLE");

    // ============================================
    // ENUMS
    // ============================================
    enum AuctionStatus {
        NOT_STARTED,
        ACTIVE,
        ENDED,
        SETTLED,
        CANCELLED
    }

    // ============================================
    // STRUCTS
    // ============================================
    struct Auction {
        bytes32 id;
        bytes32 assetId;
        uint256 startTime;
        uint256 endTime;
        uint256 minimumBid;
        uint256 currentBid;
        address highestBidder;
        AuctionStatus status;
        uint256 totalInvestment; // Original investment to recover
        uint256 settlementAmount;
        bool fundsDistributed;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    // ============================================
    // STATE
    // ============================================
    IAssetRegistry public assetRegistry;
    LossClaimNFT public lossClaimNFT;
    address public defaultEngine;
    address public investmentVault;
    
    mapping(bytes32 => Auction) public auctions;
    mapping(bytes32 => Bid[]) public auctionBids;
    mapping(bytes32 => mapping(address => uint256)) public bidderDeposits;
    
    bytes32[] public activeAuctionIds;
    bytes32[] public completedAuctionIds;
    
    uint256 public auctionCount;
    uint256 public constant MIN_AUCTION_DURATION = 1 days;
    uint256 public constant MAX_AUCTION_DURATION = 14 days;
    uint256 public constant MIN_BID_INCREMENT = 100; // Basis points (1%)
    uint256 public constant RECOVERY_PARTNER_FEE = 250; // 2.5%

    // ============================================
    // EVENTS
    // ============================================
    event AuctionCreated(
        bytes32 indexed auctionId,
        bytes32 indexed assetId,
        uint256 minimumBid,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 timestamp
    );

    event BidWithdrawn(
        bytes32 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        bytes32 indexed auctionId,
        address winner,
        uint256 winningBid
    );

    event AuctionSettled(
        bytes32 indexed auctionId,
        uint256 settlementAmount,
        uint256 recoveryPercentage
    );

    event FundsDistributed(
        bytes32 indexed auctionId,
        uint256 totalDistributed,
        uint256 claimCount
    );

    // ============================================
    // ERRORS
    // ============================================
    error AuctionNotFound();
    error AuctionNotActive();
    error AuctionStillActive();
    error BidTooLow();
    error NotHighestBidder();
    error NoBidsToWithdraw();
    error AuctionAlreadySettled();
    error AssetNotDefaulted();
    error InvalidDuration();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor(
        address _assetRegistry,
        address _lossClaimNFT,
        address _investmentVault
    ) {
        assetRegistry = IAssetRegistry(_assetRegistry);
        lossClaimNFT = LossClaimNFT(payable(_lossClaimNFT));
        investmentVault = _investmentVault;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Create a new auction for a defaulted asset
     * @param _assetId Defaulted asset ID
     * @param _minimumBid Minimum bid amount
     * @param _duration Auction duration in seconds
     */
    function createAuction(
        bytes32 _assetId,
        uint256 _minimumBid,
        uint256 _duration,
        uint256 _totalInvestment
    ) external onlyRole(DEFAULT_ENGINE_ROLE) returns (bytes32) {
        // Verify asset is defaulted
        if (!assetRegistry.isAssetDefaulted(_assetId)) {
            revert AssetNotDefaulted();
        }
        
        if (_duration < MIN_AUCTION_DURATION || _duration > MAX_AUCTION_DURATION) {
            revert InvalidDuration();
        }

        bytes32 auctionId = keccak256(
            abi.encodePacked(_assetId, block.timestamp, auctionCount)
        );

        auctions[auctionId] = Auction({
            id: auctionId,
            assetId: _assetId,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            minimumBid: _minimumBid,
            currentBid: 0,
            highestBidder: address(0),
            status: AuctionStatus.ACTIVE,
            totalInvestment: _totalInvestment,
            settlementAmount: 0,
            fundsDistributed: false
        });

        activeAuctionIds.push(auctionId);
        auctionCount++;

        emit AuctionCreated(auctionId, _assetId, _minimumBid, block.timestamp, block.timestamp + _duration);

        return auctionId;
    }

    /**
     * @notice Place a bid on an auction
     * @param _auctionId Auction ID
     */
    function placeBid(bytes32 _auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        if (auction.startTime == 0) {
            revert AuctionNotFound();
        }
        if (auction.status != AuctionStatus.ACTIVE) {
            revert AuctionNotActive();
        }
        if (block.timestamp > auction.endTime) {
            revert AuctionNotActive();
        }

        uint256 totalBid = bidderDeposits[_auctionId][msg.sender] + msg.value;
        
        // Check minimum bid
        if (totalBid < auction.minimumBid) {
            revert BidTooLow();
        }
        
        // Check bid increment if there's already a bid
        if (auction.currentBid > 0) {
            uint256 minIncrement = (auction.currentBid * MIN_BID_INCREMENT) / 10000;
            if (totalBid < auction.currentBid + minIncrement) {
                revert BidTooLow();
            }
        }

        // Update state
        bidderDeposits[_auctionId][msg.sender] = totalBid;
        auction.currentBid = totalBid;
        auction.highestBidder = msg.sender;

        auctionBids[_auctionId].push(Bid({
            bidder: msg.sender,
            amount: totalBid,
            timestamp: block.timestamp
        }));

        emit BidPlaced(_auctionId, msg.sender, totalBid, block.timestamp);
    }

    /**
     * @notice Withdraw bid (only if not highest bidder)
     * @param _auctionId Auction ID
     */
    function withdrawBid(bytes32 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        if (auction.startTime == 0) {
            revert AuctionNotFound();
        }
        
        uint256 deposit = bidderDeposits[_auctionId][msg.sender];
        if (deposit == 0) {
            revert NoBidsToWithdraw();
        }
        
        // Cannot withdraw if highest bidder on active auction
        if (auction.status == AuctionStatus.ACTIVE && msg.sender == auction.highestBidder) {
            revert NotHighestBidder();
        }

        bidderDeposits[_auctionId][msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: deposit}("");
        require(success, "Transfer failed");

        emit BidWithdrawn(_auctionId, msg.sender, deposit);
    }

    /**
     * @notice End auction and determine winner
     * @param _auctionId Auction ID
     */
    function endAuction(bytes32 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        if (auction.startTime == 0) {
            revert AuctionNotFound();
        }
        if (auction.status != AuctionStatus.ACTIVE) {
            revert AuctionNotActive();
        }
        if (block.timestamp < auction.endTime) {
            revert AuctionStillActive();
        }

        auction.status = AuctionStatus.ENDED;

        // Move from active to completed
        _removeFromActiveAuctions(_auctionId);
        completedAuctionIds.push(_auctionId);

        emit AuctionEnded(_auctionId, auction.highestBidder, auction.currentBid);
    }

    /**
     * @notice Settle auction and distribute funds
     * @param _auctionId Auction ID
     */
    function settleAuction(bytes32 _auctionId) external nonReentrant whenNotPaused {
        Auction storage auction = auctions[_auctionId];
        if (auction.status != AuctionStatus.ENDED) {
            revert AuctionNotActive();
        }
        if (auction.fundsDistributed) {
            revert AuctionAlreadySettled();
        }

        auction.status = AuctionStatus.SETTLED;
        auction.settlementAmount = auction.currentBid;
        
        // Calculate recovery percentage
        uint256 recoveryPercentage = 0;
        if (auction.totalInvestment > 0) {
            recoveryPercentage = (auction.currentBid * 10000) / auction.totalInvestment;
        }

        // Deduct recovery partner fee
        uint256 fee = (auction.currentBid * RECOVERY_PARTNER_FEE) / 10000;
        uint256 netRecovery = auction.currentBid - fee;

        // Transfer fee to recovery partner (highest bidder is the recovery partner)
        if (fee > 0) {
            (bool feeSuccess, ) = payable(auction.highestBidder).call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }

        auction.fundsDistributed = true;

        emit AuctionSettled(_auctionId, netRecovery, recoveryPercentage);
    }

    /**
     * @notice Mint loss claim NFTs for investors
     * @param _auctionId Auction ID
     * @param _investors Array of investor addresses
     * @param _amounts Array of invested amounts
     */
    function mintLossClaimNFTs(
        bytes32 _auctionId,
        address[] calldata _investors,
        uint256[] calldata _amounts
    ) external onlyRole(ADMIN_ROLE) {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.SETTLED, "Not settled");
        require(_investors.length == _amounts.length, "Array mismatch");

        uint256 recoveryPercentage = 0;
        if (auction.totalInvestment > 0) {
            recoveryPercentage = (auction.settlementAmount * 10000) / auction.totalInvestment;
        }

        for (uint256 i = 0; i < _investors.length; i++) {
            uint256 claimable = (_amounts[i] * recoveryPercentage) / 10000;
            
            lossClaimNFT.mint(
                _investors[i],
                auction.assetId,
                _amounts[i],
                claimable,
                recoveryPercentage,
                _auctionId
            );
        }

        emit FundsDistributed(_auctionId, auction.settlementAmount, _investors.length);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getAuction(bytes32 _auctionId) external view returns (Auction memory) {
        return auctions[_auctionId];
    }

    function getAuctionBids(bytes32 _auctionId) external view returns (Bid[] memory) {
        return auctionBids[_auctionId];
    }

    function getActiveAuctions() external view returns (bytes32[] memory) {
        return activeAuctionIds;
    }

    function getCompletedAuctions() external view returns (bytes32[] memory) {
        return completedAuctionIds;
    }

    function getBidderDeposit(bytes32 _auctionId, address _bidder) external view returns (uint256) {
        return bidderDeposits[_auctionId][_bidder];
    }

    function isAuctionActive(bytes32 _auctionId) external view returns (bool) {
        Auction storage auction = auctions[_auctionId];
        return auction.status == AuctionStatus.ACTIVE && block.timestamp <= auction.endTime;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setDefaultEngine(address _defaultEngine) external onlyRole(ADMIN_ROLE) {
        defaultEngine = _defaultEngine;
        _grantRole(DEFAULT_ENGINE_ROLE, _defaultEngine);
    }

    function cancelAuction(bytes32 _auctionId) external onlyRole(ADMIN_ROLE) {
        Auction storage auction = auctions[_auctionId];
        require(auction.status == AuctionStatus.ACTIVE, "Not active");
        
        auction.status = AuctionStatus.CANCELLED;
        _removeFromActiveAuctions(_auctionId);
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

    function _removeFromActiveAuctions(bytes32 _auctionId) internal {
        uint256 length = activeAuctionIds.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeAuctionIds[i] == _auctionId) {
                activeAuctionIds[i] = activeAuctionIds[length - 1];
                activeAuctionIds.pop();
                break;
            }
        }
    }

    // ============================================
    // RECEIVE
    // ============================================
    receive() external payable {}
}
