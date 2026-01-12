'use client';

/**
 * Asset Issuer Dashboard
 * 
 * Shows REAL on-chain data:
 * - Registered assets
 * - Payment schedules
 * - Risk scores
 * - Compliance status
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { dashboardApi, blockchainApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { KYCStatus } from '@/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { AssetTable } from '@/components/issuer/AssetTable';
import { PaymentSchedule } from '@/components/issuer/PaymentSchedule';
import { RiskOverview } from '@/components/issuer/RiskOverview';
import { KYCBanner } from '@/components/kyc/KYCBanner';
import Link from 'next/link';

export default function IssuerDashboard() {
  const { address } = useAccount();
  const { user } = useAuthStore();

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['issuer-dashboard'],
    queryFn: dashboardApi.issuer,
    enabled: !!user && user.kyc_status === KYCStatus.APPROVED,
  });

  // Show KYC banner if not approved
  if (user?.kyc_status !== KYCStatus.APPROVED) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Asset Issuer Dashboard</h1>
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
        <h1 className="text-2xl font-bold">Asset Issuer Dashboard</h1>
        <Link href="/dashboard/issuer/assets/new" className="btn-primary">
          Register New Asset
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={dashboard?.total_assets || 0}
          icon="building"
        />
        <StatCard
          title="Total Value"
          value={`$${(dashboard?.total_value || 0).toLocaleString()}`}
          icon="currency"
        />
        <StatCard
          title="Active Assets"
          value={dashboard?.active_assets || 0}
          changeType="positive"
          icon="check-circle"
        />
        <StatCard
          title="Defaulted Assets"
          value={dashboard?.defaulted_assets || 0}
          changeType={dashboard?.defaulted_assets > 0 ? 'negative' : 'neutral'}
          icon="exclamation"
        />
      </div>

      {/* Upcoming Payments Alert */}
      {dashboard?.upcoming_payments?.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-yellow-800 dark:text-yellow-200">
              You have {dashboard.upcoming_payments.length} upcoming payment(s) due soon
            </span>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Assets</h2>
          <Link href="/dashboard/issuer/assets" className="text-terra-600 text-sm hover:underline">
            View All
          </Link>
        </div>
        <AssetTable assets={dashboard?.assets?.slice(0, 5) || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Schedule */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Upcoming Payments</h2>
          <PaymentSchedule payments={dashboard?.upcoming_payments || []} />
        </div>

        {/* Risk Overview */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Risk Overview</h2>
          <RiskOverview assets={dashboard?.assets || []} />
        </div>
      </div>
    </div>
  );
}
