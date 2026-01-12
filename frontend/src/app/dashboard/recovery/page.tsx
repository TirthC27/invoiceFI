'use client';

/**
 * Recovery Partner Dashboard
 * 
 * Shows REAL on-chain data:
 * - Active auctions
 * - Bid history
 * - Won auctions
 * - Settlement status
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { dashboardApi, blockchainApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { KYCStatus } from '@/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { AuctionTable } from '@/components/recovery/AuctionTable';
import { BidHistory } from '@/components/recovery/BidHistory';
import { KYCBanner } from '@/components/kyc/KYCBanner';

export default function RecoveryDashboard() {
  const { address } = useAccount();
  const { user } = useAuthStore();

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['recovery-dashboard'],
    queryFn: dashboardApi.recovery,
    enabled: !!user && user.kyc_status === KYCStatus.APPROVED,
  });

  // Fetch active auctions from chain
  const { data: auctions } = useQuery({
    queryKey: ['active-auctions'],
    queryFn: blockchainApi.getAuctions,
    enabled: !!address && user?.kyc_status === KYCStatus.APPROVED,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Show KYC banner if not approved
  if (user?.kyc_status !== KYCStatus.APPROVED) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Recovery Partner Dashboard</h1>
        <KYCBanner status={user?.kyc_status || KYCStatus.NOT_STARTED} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Recovery Partner Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Auctions"
          value={auctions?.length || 0}
          icon="gavel"
        />
        <StatCard
          title="Won Auctions"
          value={dashboard?.won_auctions || 0}
          icon="trophy"
        />
        <StatCard
          title="Total Bid Value"
          value={`$${(dashboard?.total_bid_value || 0).toLocaleString()}`}
          icon="currency"
        />
      </div>

      {/* Active Auctions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Active Auctions</h2>
        {auctions && auctions.length > 0 ? (
          <AuctionTable auctions={auctions} userAddress={address || ''} />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p>No active auctions at this time</p>
            <p className="text-sm mt-2">Auctions are created when assets enter default recovery</p>
          </div>
        )}
      </div>

      {/* Bid History */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Your Bid History</h2>
        <BidHistory bids={dashboard?.bids || []} />
      </div>
    </div>
  );
}
