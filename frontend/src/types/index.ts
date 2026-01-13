/**
 * TERRA Frontend Types
 * 
 * Mirrors shared/types/index.ts for frontend use
 */

// ==================== Enums ====================

export enum UserRole {
  INVESTOR = 'investor',
  ASSET_ISSUER = 'asset_issuer',
  RECOVERY_PARTNER = 'recovery_partner',
  ADMIN = 'admin',
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AssetStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  DEFAULTED = 'defaulted',
  RECOVERED = 'recovered',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AssetType {
  REAL_ESTATE = 'real_estate',
  INVOICE = 'invoice',
  EQUIPMENT = 'equipment',
  COMMODITY = 'commodity',
  OTHER = 'other',
}

export enum AuctionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  ENDED = 'ended',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

// ==================== User Types ====================

export interface User {
  id: string;
  wallet_address: string;
  role: UserRole;
  kyc_status: KYCStatus;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==================== Asset Types ====================

export interface Asset {
  id: string;
  chain_asset_id?: number;
  name: string;
  description: string;
  asset_type: string;
  value: number;
  currency: string;
  status: AssetStatus;
  risk_level: RiskLevel;
  issuer_id: string;
  ipfs_hash?: string;
  fingerprint_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetOnChain {
  id: number;
  issuer: string;
  ipfs_hash: string;
  value: bigint;
  risk_tier: number;
  status: number;
  created_at: number;
}

// ==================== Investment Types ====================

export interface Investment {
  id: string;
  asset_id: string;
  investor_id: string;
  amount: number;
  shares: number;
  status: string;
  created_at: string;
}

export interface InvestmentOnChain {
  asset_id: number;
  investor: string;
  shares: bigint;
  invested_amount: bigint;
  claimed_returns: bigint;
}

// ==================== Payment Types ====================

export interface Payment {
  id: string;
  asset_id: string;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: string;
}

// ==================== Risk Types ====================

export interface RiskData {
  asset_id: number;
  risk_score: number;
  payment_risk: number;
  market_risk: number;
  issuer_risk: number;
  combined_score: number;
}

// ==================== Auction Types ====================

export interface Auction {
  id: number;
  asset_id: number;
  start_price: bigint;
  current_bid: bigint;
  highest_bidder: string;
  end_time: number;
  status: AuctionStatus;
}

// ==================== Loss Claim Types ====================

export interface LossClaim {
  token_id: number;
  owner: string;
  asset_id: number;
  investor: string;
  loss_amount: bigint;
  recovery_amount: bigint;
  claimed: boolean;
}

// ==================== Dashboard Types ====================

export interface InvestorDashboard {
  total_invested: number;
  total_returns: number;
  active_investments: number;
  pending_claims: number;
  investments: Investment[];
  loss_claims: LossClaim[];
}

export interface IssuerDashboard {
  total_assets: number;
  total_value: number;
  active_assets: number;
  defaulted_assets: number;
  assets: Asset[];
  upcoming_payments: Payment[];
}

export interface RecoveryDashboard {
  active_auctions: number;
  won_auctions: number;
  total_bid_value: number;
  auctions: Auction[];
}

export interface AdminDashboard {
  total_users: number;
  total_assets: number;
  total_volume: number;
  pending_kyc: number;
  high_risk_assets: Asset[];
  recent_events: BlockchainEvent[];
}

// ==================== Blockchain Types ====================

export interface BlockchainEvent {
  id: number;
  transaction_hash: string;
  block_number: number;
  contract_name: string;
  event_name: string;
  event_data: string;
  created_at: string;
}

export interface Transaction {
  to: string;
  data: string;
  value: string;
  gas?: number;
  gas_price: string;
  chain_id?: number;
}

// ==================== API Response Types ====================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ErrorResponse {
  detail: string;
  status_code: number;
}
