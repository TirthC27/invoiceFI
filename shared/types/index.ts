/**
 * TERRA Shared Asset Schema
 * 
 * This schema is the single source of truth for asset data structures
 * used across contracts, backend, and frontend.
 * 
 * VERSION: 1.0.0
 */

// ============================================
// ENUMS
// ============================================

export enum AssetStatus {
  DRAFT = 0,
  PENDING_VERIFICATION = 1,
  ACTIVE = 2,
  FUNDED = 3,
  PERFORMING = 4,
  DELINQUENT = 5,
  DEFAULT = 6,
  RECOVERED = 7,
  CLOSED = 8,
}

export enum RiskLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export enum UserRole {
  INVESTOR = "investor",
  ASSET_ISSUER = "asset_issuer",
  RECOVERY_PARTNER = "recovery_partner",
  ADMIN = "admin",
}

export enum KYCStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  PENDING_REVIEW = "pending_review",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum PaymentStatus {
  PENDING = 0,
  PAID = 1,
  LATE = 2,
  MISSED = 3,
  DEFAULTED = 4,
}

export enum AuctionStatus {
  NOT_STARTED = 0,
  ACTIVE = 1,
  ENDED = 2,
  SETTLED = 3,
  CANCELLED = 4,
}

// ============================================
// CORE ASSET TYPES
// ============================================

export interface AssetMetadata {
  name: string;
  description: string;
  assetType: string; // e.g., "real_estate", "invoice", "equipment"
  documentCID: string; // IPFS CID for asset documents
  fingerprintHash: string; // SHA-256 hash of document fingerprint
  location?: string;
  valuationDate: number; // Unix timestamp
  externalId?: string; // External reference ID
}

export interface Asset {
  id: string; // Unique asset ID (bytes32 on-chain)
  issuer: string; // Issuer wallet address
  metadata: AssetMetadata;
  totalValue: bigint; // Total asset value in wei
  fundingGoal: bigint; // Target funding amount
  fundedAmount: bigint; // Current funded amount
  expectedYield: number; // Annual yield in basis points (e.g., 1200 = 12%)
  term: number; // Term in days
  status: AssetStatus;
  riskLevel: RiskLevel;
  createdAt: number; // Unix timestamp
  fundingDeadline: number; // Unix timestamp
  maturityDate: number; // Unix timestamp
}

// ============================================
// INVESTMENT TYPES
// ============================================

export interface Investment {
  id: string;
  investorAddress: string;
  assetId: string;
  amount: bigint;
  shares: bigint; // Proportional ownership
  investedAt: number;
  expectedReturn: bigint;
  claimedReturns: bigint;
  status: "active" | "matured" | "defaulted" | "exited";
}

export interface InvestmentPosition {
  assetId: string;
  asset: Asset;
  investment: Investment;
  currentValue: bigint;
  unrealizedReturn: bigint;
  realizedReturn: bigint;
  healthScore: number; // 0-100
}

// ============================================
// PAYMENT TYPES
// ============================================

export interface PaymentSchedule {
  assetId: string;
  paymentNumber: number;
  dueDate: number;
  amount: bigint;
  status: PaymentStatus;
  paidDate?: number;
  paidAmount?: bigint;
  lateFee?: bigint;
}

export interface PaymentHistory {
  assetId: string;
  payments: PaymentSchedule[];
  totalPaid: bigint;
  totalDue: bigint;
  missedPayments: number;
  consecutiveMissed: number;
}

// ============================================
// RISK & DEFAULT TYPES
// ============================================

export interface RiskAssessment {
  assetId: string;
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  factors: RiskFactor[];
  lastUpdated: number;
  nextReviewDate: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

export interface DefaultState {
  assetId: string;
  isDefaulted: boolean;
  defaultDate?: number;
  reason?: string;
  missedPayments: number;
  daysPastDue: number;
  outstandingAmount: bigint;
  recoveryInitiated: boolean;
  recoveryAuctionId?: string;
}

// ============================================
// RECOVERY & AUCTION TYPES
// ============================================

export interface RecoveryAuction {
  id: string;
  assetId: string;
  startTime: number;
  endTime: number;
  minimumBid: bigint;
  currentBid: bigint;
  highestBidder?: string;
  status: AuctionStatus;
  bids: AuctionBid[];
  settlementTx?: string;
}

export interface AuctionBid {
  bidder: string;
  amount: bigint;
  timestamp: number;
  txHash: string;
}

export interface LossClaimNFT {
  tokenId: string;
  investorAddress: string;
  assetId: string;
  investedAmount: bigint;
  claimableAmount: bigint;
  recoveryPercentage: number;
  auctionId: string;
  claimed: boolean;
  mintedAt: number;
}

// ============================================
// USER & KYC TYPES
// ============================================

export interface User {
  address: string;
  role: UserRole;
  kycStatus: KYCStatus;
  kycCompletedAt?: number;
  profileCID?: string; // IPFS CID for encrypted profile data
  createdAt: number;
  lastLoginAt: number;
}

export interface KYCProfile {
  userId: string;
  address: string;
  documentCID: string;
  selfieCID: string;
  extractedData: KYCExtractedData;
  verificationScore: number;
  status: KYCStatus;
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

export interface KYCExtractedData {
  fullName: string;
  dateOfBirth: string;
  documentNumber: string;
  documentType: string;
  nationality: string;
  expirationDate: string;
  matchScore: number;
}

// ============================================
// BLOCKCHAIN EVENT TYPES
// ============================================

export interface BlockchainEvent {
  eventName: string;
  contractAddress: string;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: number;
  args: Record<string, unknown>;
  processed: boolean;
  processedAt?: number;
}

export interface AssetRegisteredEvent extends BlockchainEvent {
  eventName: "AssetRegistered";
  args: {
    assetId: string;
    issuer: string;
    totalValue: bigint;
    fundingGoal: bigint;
  };
}

export interface InvestmentMadeEvent extends BlockchainEvent {
  eventName: "InvestmentMade";
  args: {
    investmentId: string;
    assetId: string;
    investor: string;
    amount: bigint;
  };
}

export interface PaymentReceivedEvent extends BlockchainEvent {
  eventName: "PaymentReceived";
  args: {
    assetId: string;
    paymentNumber: number;
    amount: bigint;
    payer: string;
  };
}

export interface DefaultDeclaredEvent extends BlockchainEvent {
  eventName: "DefaultDeclared";
  args: {
    assetId: string;
    reason: string;
    outstandingAmount: bigint;
  };
}

export interface AuctionStartedEvent extends BlockchainEvent {
  eventName: "AuctionStarted";
  args: {
    auctionId: string;
    assetId: string;
    minimumBid: bigint;
    endTime: number;
  };
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: number;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface InvestorDashboard {
  totalInvested: bigint;
  totalExpectedYield: bigint;
  totalRealizedYield: bigint;
  portfolioHealth: number; // 0-100
  attentionAlerts: DashboardAlert[];
  positions: InvestmentPosition[];
  recentTransactions: BlockchainEvent[];
}

export interface IssuerDashboard {
  totalAssets: number;
  totalFundsRaised: bigint;
  activeAssets: number;
  defaultedAssets: number;
  upcomingPayments: PaymentSchedule[];
  assets: Asset[];
  attentionAlerts: DashboardAlert[];
}

export interface RecoveryDashboard {
  activeAuctions: RecoveryAuction[];
  myBids: AuctionBid[];
  wonAuctions: RecoveryAuction[];
  totalRecovered: bigint;
}

export interface AdminDashboard {
  systemHealth: number;
  totalAssets: number;
  totalInvestments: bigint;
  defaultRate: number;
  pendingKYC: number;
  riskOverview: RiskOverview;
  recentEvents: BlockchainEvent[];
}

export interface DashboardAlert {
  id: string;
  type: "warning" | "critical" | "info";
  title: string;
  message: string;
  assetId?: string;
  actionRequired: boolean;
  actionUrl?: string;
  createdAt: number;
}

export interface RiskOverview {
  lowRiskAssets: number;
  mediumRiskAssets: number;
  highRiskAssets: number;
  criticalRiskAssets: number;
  averageRiskScore: number;
}

// ============================================
// CONTRACT ADDRESSES CONFIG
// ============================================

export interface ContractAddresses {
  assetRegistry: string;
  investmentVault: string;
  riskEngine: string;
  defaultEngine: string;
  recoveryAuction: string;
  lossClaimNFT: string;
}

export const MANTLE_TESTNET_CONTRACTS: ContractAddresses = {
  assetRegistry: "",
  investmentVault: "",
  riskEngine: "",
  defaultEngine: "",
  recoveryAuction: "",
  lossClaimNFT: "",
};

export const MANTLE_MAINNET_CONTRACTS: ContractAddresses = {
  assetRegistry: "",
  investmentVault: "",
  riskEngine: "",
  defaultEngine: "",
  recoveryAuction: "",
  lossClaimNFT: "",
};

// ============================================
// CHAIN CONFIGURATION
// ============================================

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  contracts: ContractAddresses;
}

export const MANTLE_TESTNET: ChainConfig = {
  chainId: 5003,
  name: "Mantle Sepolia Testnet",
  rpcUrl: "https://rpc.sepolia.mantle.xyz",
  explorerUrl: "https://sepolia.mantlescan.xyz",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
  },
  contracts: MANTLE_TESTNET_CONTRACTS,
};

export const MANTLE_MAINNET: ChainConfig = {
  chainId: 5000,
  name: "Mantle Mainnet",
  rpcUrl: "https://rpc.mantle.xyz",
  explorerUrl: "https://mantlescan.xyz",
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
  },
  contracts: MANTLE_MAINNET_CONTRACTS,
};

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  5003: MANTLE_TESTNET,
  5000: MANTLE_MAINNET,
};
