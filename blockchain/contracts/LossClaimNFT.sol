// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LossClaimNFT
 * @dev NFT representing loss claims from defaulted assets
 * @notice Investors receive these NFTs after asset default and recovery auction
 */
contract LossClaimNFT is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl, ReentrancyGuard {
    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // ============================================
    // STRUCTS
    // ============================================
    struct LossClaim {
        uint256 tokenId;
        address originalInvestor;
        bytes32 assetId;
        uint256 investedAmount;
        uint256 claimableAmount;
        uint256 recoveryPercentage; // Basis points
        bytes32 auctionId;
        bool claimed;
        uint256 mintedAt;
        uint256 claimedAt;
    }

    // ============================================
    // STATE
    // ============================================
    mapping(uint256 => LossClaim) public lossClaims;
    mapping(bytes32 => uint256[]) public assetClaims; // assetId => tokenIds
    mapping(address => uint256[]) public investorClaims; // investor => tokenIds
    
    uint256 private _tokenIdCounter;
    uint256 public totalClaimable;
    uint256 public totalClaimed;

    string public baseTokenURI;

    // ============================================
    // EVENTS
    // ============================================
    event LossClaimMinted(
        uint256 indexed tokenId,
        address indexed investor,
        bytes32 indexed assetId,
        uint256 investedAmount,
        uint256 claimableAmount,
        uint256 recoveryPercentage
    );

    event LossClaimClaimed(
        uint256 indexed tokenId,
        address indexed claimer,
        uint256 amount
    );

    event LossClaimTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    // ============================================
    // ERRORS
    // ============================================
    error AlreadyClaimed();
    error NotTokenOwner();
    error InsufficientClaimBalance();
    error InvalidRecoveryPercentage();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor() ERC721("TERRA Loss Claim", "TLOSS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Mint a loss claim NFT
     * @param _to Recipient address
     * @param _assetId Asset ID
     * @param _investedAmount Original invested amount
     * @param _claimableAmount Amount claimable from recovery
     * @param _recoveryPercentage Recovery percentage in basis points
     * @param _auctionId Recovery auction ID
     */
    function mint(
        address _to,
        bytes32 _assetId,
        uint256 _investedAmount,
        uint256 _claimableAmount,
        uint256 _recoveryPercentage,
        bytes32 _auctionId
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (_recoveryPercentage > 10000) {
            revert InvalidRecoveryPercentage();
        }

        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(_to, tokenId);

        lossClaims[tokenId] = LossClaim({
            tokenId: tokenId,
            originalInvestor: _to,
            assetId: _assetId,
            investedAmount: _investedAmount,
            claimableAmount: _claimableAmount,
            recoveryPercentage: _recoveryPercentage,
            auctionId: _auctionId,
            claimed: false,
            mintedAt: block.timestamp,
            claimedAt: 0
        });

        assetClaims[_assetId].push(tokenId);
        investorClaims[_to].push(tokenId);
        totalClaimable += _claimableAmount;

        emit LossClaimMinted(
            tokenId,
            _to,
            _assetId,
            _investedAmount,
            _claimableAmount,
            _recoveryPercentage
        );

        return tokenId;
    }

    /**
     * @notice Claim recovery funds for a token
     * @param _tokenId Token ID
     */
    function claim(uint256 _tokenId) external nonReentrant {
        if (ownerOf(_tokenId) != msg.sender) {
            revert NotTokenOwner();
        }

        LossClaim storage lc = lossClaims[_tokenId];
        if (lc.claimed) {
            revert AlreadyClaimed();
        }
        if (address(this).balance < lc.claimableAmount) {
            revert InsufficientClaimBalance();
        }

        lc.claimed = true;
        lc.claimedAt = block.timestamp;
        totalClaimed += lc.claimableAmount;

        (bool success, ) = payable(msg.sender).call{value: lc.claimableAmount}("");
        require(success, "Transfer failed");

        emit LossClaimClaimed(_tokenId, msg.sender, lc.claimableAmount);
    }

    /**
     * @notice Batch claim multiple tokens
     * @param _tokenIds Array of token IDs
     */
    function batchClaim(uint256[] calldata _tokenIds) external nonReentrant {
        uint256 totalAmount = 0;

        for (uint256 i = 0; i < _tokenIds.length; i++) {
            uint256 tokenId = _tokenIds[i];
            if (ownerOf(tokenId) != msg.sender) {
                revert NotTokenOwner();
            }

            LossClaim storage lc = lossClaims[tokenId];
            if (!lc.claimed) {
                lc.claimed = true;
                lc.claimedAt = block.timestamp;
                totalAmount += lc.claimableAmount;
                
                emit LossClaimClaimed(tokenId, msg.sender, lc.claimableAmount);
            }
        }

        if (totalAmount > 0) {
            if (address(this).balance < totalAmount) {
                revert InsufficientClaimBalance();
            }
            
            totalClaimed += totalAmount;
            
            (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
            require(success, "Transfer failed");
        }
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getLossClaim(uint256 _tokenId) external view returns (LossClaim memory) {
        return lossClaims[_tokenId];
    }

    function getAssetClaims(bytes32 _assetId) external view returns (uint256[] memory) {
        return assetClaims[_assetId];
    }

    function getInvestorClaims(address _investor) external view returns (uint256[] memory) {
        return investorClaims[_investor];
    }

    function getClaimableAmount(uint256 _tokenId) external view returns (uint256) {
        LossClaim storage lc = lossClaims[_tokenId];
        if (lc.claimed) return 0;
        return lc.claimableAmount;
    }

    function getTotalClaimableForInvestor(address _investor) external view returns (uint256) {
        uint256[] memory claims = investorClaims[_investor];
        uint256 total = 0;
        
        for (uint256 i = 0; i < claims.length; i++) {
            LossClaim storage lc = lossClaims[claims[i]];
            if (!lc.claimed && ownerOf(claims[i]) == _investor) {
                total += lc.claimableAmount;
            }
        }
        
        return total;
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    function setBaseURI(string calldata newBaseURI) external onlyRole(ADMIN_ROLE) {
        baseTokenURI = newBaseURI;
    }

    function setMinterRole(address _minter) external onlyRole(ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, _minter);
    }

    /**
     * @notice Deposit funds for claims
     */
    function depositClaimFunds() external payable onlyRole(ADMIN_ROLE) {}

    // ============================================
    // OVERRIDES
    // ============================================

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        address result = super._update(to, tokenId, auth);
        
        if (from != address(0) && to != address(0)) {
            emit LossClaimTransferred(tokenId, from, to);
        }
        
        return result;
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ============================================
    // RECEIVE
    // ============================================
    receive() external payable {}
}
