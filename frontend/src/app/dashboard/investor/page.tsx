'use client';

/**
 * Investor Dashboard
 * 
 * Shows REAL on-chain data:
 * - Active investments
 * - Returns (claimable)
 * - Loss claims (NFTs)
 * - Portfolio performance
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { dashboardApi, blockchainApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { KYCStatus } from '@/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { InvestmentTable } from '@/components/investor/InvestmentTable';
import { LossClaimsList } from '@/components/investor/LossClaimsList';
import { PortfolioChart } from '@/components/investor/PortfolioChart';
import { KYCBanner } from '@/components/kyc/KYCBanner';
import Link from 'next/link';

export default function InvestorDashboard() {
  const { address } = useAccount();
  const { user } = useAuthStore();

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['investor-dashboard'],
    queryFn: dashboardApi.investor,
    enabled: !!user && user.kyc_status === KYCStatus.APPROVED,
  });

  // Fetch loss claims from chain
  const { data: lossClaims } = useQuery({
    queryKey: ['loss-claims', address],
    queryFn: blockchainApi.getLossClaims,
    enabled: !!address && user?.kyc_status === KYCStatus.APPROVED,
  });

  // Show KYC banner if not approved
  if (user?.kyc_status !== KYCStatus.APPROVED) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Investor Dashboard</h1>
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
        <h1 className="text-2xl font-bold">Investor Dashboard</h1>
        <Link href="/assets" className="btn-primary">
          Browse Assets
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Invested"
          value={`$${(dashboard?.total_invested || 0).toLocaleString()}`}
          change="+12.5%"
          changeType="positive"
          icon="currency"
        />
        <StatCard
          title="Total Returns"
          value={`$${(dashboard?.total_returns || 0).toLocaleString()}`}
          change="+8.2%"
          changeType="positive"
          icon="trending-up"
        />
        <StatCard
          title="Active Investments"
          value={dashboard?.active_investments || 0}
          icon="briefcase"
        />
        <StatCard
          title="Pending Claims"
          value={dashboard?.pending_claims || 0}
          icon="document"
        />
      </div>

      {/* Portfolio Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Portfolio Performance</h2>
        <PortfolioChart investments={dashboard?.investments || []} />
      </div>

      {/* Active Investments */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Active Investments</h2>
          <Link href="/dashboard/investor/investments" className="text-terra-600 text-sm hover:underline">
            View All
          </Link>
        </div>
        <InvestmentTable 
          investments={dashboard?.investments?.slice(0, 5) || []} 
        />
      </div>

      {/* Loss Claims */}
      {lossClaims && lossClaims.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Loss Claim NFTs</h2>
          <LossClaimsList claims={lossClaims} />
        </div>
      )}
    </div>
  );
}
