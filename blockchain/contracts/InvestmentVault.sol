// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAssetRegistry.sol";

/**
 * @title InvestmentVault
 * @dev Manages investor deposits and returns for tokenized assets
 * @notice Handles investments, yield distribution, and exit mechanisms
 */
contract InvestmentVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // ROLES
    // ============================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEFAULT_ENGINE_ROLE = keccak256("DEFAULT_ENGINE_ROLE");

    // ============================================
    // STRUCTS
    // ============================================
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

    // ============================================
    // STATE
    // ============================================
    IAssetRegistry public assetRegistry;
    
    mapping(bytes32 => Investment) public investments;
    mapping(address => bytes32[]) public investorPositions;
    mapping(bytes32 => AssetPool) public assetPools;
    mapping(bytes32 => address[]) public assetInvestors;
    mapping(bytes32 => mapping(address => uint256)) public investorShares;
    
    uint256 public investmentCount;
    uint256 public constant MIN_INVESTMENT = 0.01 ether;
    uint256 public constant SHARE_PRECISION = 1e18;

    // ============================================
    // EVENTS
    // ============================================
    event InvestmentMade(
        bytes32 indexed investmentId,
        bytes32 indexed assetId,
        address indexed investor,
        uint256 amount,
        uint256 shares
    );

    event ReturnsDistributed(
        bytes32 indexed assetId,
        uint256 totalAmount,
        uint256 timestamp
    );

    event ReturnsClaimed(
        bytes32 indexed investmentId,
        address indexed investor,
        uint256 amount
    );

    event InvestmentExited(
        bytes32 indexed investmentId,
        address indexed investor,
        uint256 returnedAmount
    );

    event EmergencyWithdrawal(
        bytes32 indexed assetId,
        address indexed investor,
        uint256 amount
    );

    // ============================================
    // ERRORS
    // ============================================
    error InvestmentBelowMinimum();
    error AssetNotActive();
    error FundingDeadlinePassed();
    error InvestmentNotFound();
    error NoReturnsAvailable();
    error PoolNotOpen();
    error Unauthorized();
    error AlreadyExited();
    error AssetNotDefaulted();
    error InsufficientPoolBalance();

    // ============================================
    // CONSTRUCTOR
    // ============================================
    constructor(address _assetRegistry) {
        assetRegistry = IAssetRegistry(_assetRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ============================================
    // EXTERNAL FUNCTIONS
    // ============================================

    /**
     * @notice Invest in an asset
     * @param _assetId Asset ID to invest in
     */
    function invest(bytes32 _assetId) external payable nonReentrant whenNotPaused {
        if (msg.value < MIN_INVESTMENT) {
            revert InvestmentBelowMinimum();
        }

        // Get asset details from registry
        IAssetRegistry.Asset memory asset = assetRegistry.getAsset(_assetId);
        
        // Validate asset is investable
        if (!assetRegistry.isAssetActive(_assetId)) {
            revert AssetNotActive();
        }
        if (block.timestamp > asset.fundingDeadline) {
            revert FundingDeadlinePassed();
        }

        // Initialize pool if needed
        if (!assetPools[_assetId].isOpen) {
            assetPools[_assetId] = AssetPool({
                assetId: _assetId,
                totalInvested: 0,
                totalShares: 0,
                totalReturnsDistributed: 0,
                availableForClaims: 0,
                isOpen: true
            });
        }

        AssetPool storage pool = assetPools[_assetId];
        if (!pool.isOpen) {
            revert PoolNotOpen();
        }

        // Calculate shares
        uint256 shares = _calculateShares(msg.value, pool.totalInvested, pool.totalShares);

        // Create investment record
        bytes32 investmentId = keccak256(
            abi.encodePacked(msg.sender, _assetId, block.timestamp, investmentCount)
        );

        // Calculate expected return based on yield
        uint256 expectedReturn = (msg.value * asset.expectedYield * asset.term) / (365 * 10000);

        investments[investmentId] = Investment({
            id: investmentId,
            investor: msg.sender,
            assetId: _assetId,
            amount: msg.value,
            shares: shares,
            investedAt: block.timestamp,
            expectedReturn: expectedReturn,
            claimedReturns: 0,
            isActive: true,
            isExited: false
        });

        // Update state
        investorPositions[msg.sender].push(investmentId);
        pool.totalInvested += msg.value;
        pool.totalShares += shares;
        investorShares[_assetId][msg.sender] += shares;
        
        // Track investor in asset
        if (investorShares[_assetId][msg.sender] == shares) {
            assetInvestors[_assetId].push(msg.sender);
        }

        investmentCount++;

        // Update asset registry with new funding
        assetRegistry.updateFundedAmount(_assetId, msg.value);

        emit InvestmentMade(investmentId, _assetId, msg.sender, msg.value, shares);
    }

    /**
     * @notice Distribute returns to an asset pool (called by issuer or payment processor)
     * @param _assetId Asset ID
     */
    function distributeReturns(bytes32 _assetId) external payable nonReentrant whenNotPaused {
        AssetPool storage pool = assetPools[_assetId];
        if (pool.totalInvested == 0) {
            revert AssetNotActive();
        }

        pool.availableForClaims += msg.value;
        pool.totalReturnsDistributed += msg.value;

        emit ReturnsDistributed(_assetId, msg.value, block.timestamp);
    }

    /**
     * @notice Claim available returns for an investment
     * @param _investmentId Investment ID
     */
    function claimReturns(bytes32 _investmentId) external nonReentrant whenNotPaused {
        Investment storage inv = investments[_investmentId];
        if (inv.investedAt == 0) {
            revert InvestmentNotFound();
        }
        if (inv.investor != msg.sender) {
            revert Unauthorized();
        }
        if (inv.isExited) {
            revert AlreadyExited();
        }

        AssetPool storage pool = assetPools[inv.assetId];
        
        // Calculate claimable amount based on shares
        uint256 claimable = _calculateClaimableReturns(inv, pool);
        if (claimable == 0) {
            revert NoReturnsAvailable();
        }
        if (claimable > pool.availableForClaims) {
            revert InsufficientPoolBalance();
        }

        inv.claimedReturns += claimable;
        pool.availableForClaims -= claimable;

        (bool success, ) = payable(msg.sender).call{value: claimable}("");
        require(success, "Transfer failed");

        emit ReturnsClaimed(_investmentId, msg.sender, claimable);
    }

    /**
     * @notice Exit investment during default (emergency exit)
     * @param _investmentId Investment ID
     */
    function exitOnDefault(bytes32 _investmentId) external nonReentrant {
        Investment storage inv = investments[_investmentId];
        if (inv.investedAt == 0) {
            revert InvestmentNotFound();
        }
        if (inv.investor != msg.sender) {
            revert Unauthorized();
        }
        if (inv.isExited) {
            revert AlreadyExited();
        }
        if (!assetRegistry.isAssetDefaulted(inv.assetId)) {
            revert AssetNotDefaulted();
        }

        inv.isExited = true;
        inv.isActive = false;

        // This triggers the recovery flow - actual payout handled by DefaultEngine
        emit InvestmentExited(_investmentId, msg.sender, 0);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getInvestment(bytes32 _investmentId) external view returns (Investment memory) {
        return investments[_investmentId];
    }

    function getInvestorPositions(address _investor) external view returns (bytes32[] memory) {
        return investorPositions[_investor];
    }

    function getAssetPool(bytes32 _assetId) external view returns (AssetPool memory) {
        return assetPools[_assetId];
    }

    function getAssetInvestors(bytes32 _assetId) external view returns (address[] memory) {
        return assetInvestors[_assetId];
    }

    function getInvestorSharesForAsset(bytes32 _assetId, address _investor) external view returns (uint256) {
        return investorShares[_assetId][_investor];
    }

    function calculatePendingReturns(bytes32 _investmentId) external view returns (uint256) {
        Investment storage inv = investments[_investmentId];
        if (inv.investedAt == 0 || inv.isExited) return 0;
        
        AssetPool storage pool = assetPools[inv.assetId];
        return _calculateClaimableReturns(inv, pool);
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

    function setAssetRegistry(address _assetRegistry) external onlyRole(ADMIN_ROLE) {
        assetRegistry = IAssetRegistry(_assetRegistry);
    }

    function setDefaultEngineRole(address _defaultEngine) external onlyRole(ADMIN_ROLE) {
        _grantRole(DEFAULT_ENGINE_ROLE, _defaultEngine);
    }

    /**
     * @notice Close a pool (for completed or defaulted assets)
     * @param _assetId Asset ID
     */
    function closePool(bytes32 _assetId) external onlyRole(ADMIN_ROLE) {
        assetPools[_assetId].isOpen = false;
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    function _calculateShares(
        uint256 _amount,
        uint256 _totalInvested,
        uint256 _totalShares
    ) internal pure returns (uint256) {
        if (_totalShares == 0) {
            return _amount * SHARE_PRECISION;
        }
        return (_amount * _totalShares) / _totalInvested;
    }

    function _calculateClaimableReturns(
        Investment storage _inv,
        AssetPool storage _pool
    ) internal view returns (uint256) {
        if (_pool.totalShares == 0 || _pool.availableForClaims == 0) return 0;
        
        // Calculate proportional share of available returns
        uint256 totalClaimable = (_inv.shares * _pool.availableForClaims) / _pool.totalShares;
        
        // Subtract already claimed
        if (totalClaimable <= _inv.claimedReturns) return 0;
        
        return totalClaimable - _inv.claimedReturns;
    }

    // ============================================
    // RECEIVE
    // ============================================
    receive() external payable {}
}
