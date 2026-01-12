'use client';

/**
 * Admin Dashboard
 * 
 * VIEW ONLY for sensitive operations.
 * Cannot trigger defaults - only objective criteria can.
 * Can pause/unpause contracts and update oracle configs.
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { dashboardApi, blockchainApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { UserRole } from '@/types';
import { StatCard } from '@/components/dashboard/StatCard';
import { HighRiskAssets } from '@/components/admin/HighRiskAssets';
import { RecentEvents } from '@/components/admin/RecentEvents';
import { SystemStatus } from '@/components/admin/SystemStatus';
import { KYCQueue } from '@/components/admin/KYCQueue';

export default function AdminDashboard() {
  const { address } = useAccount();
  const { user } = useAuthStore();

  // Verify admin role
  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  // Fetch dashboard data
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardApi.admin,
  });

  // Fetch recent blockchain events
  const { data: events } = useQuery({
    queryKey: ['blockchain-events'],
    queryFn: () => blockchainApi.getEvents({ limit: 20 }),
  });

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
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="badge badge-info">View Only Mode</div>
      </div>

      {/* Important Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium text-blue-800 dark:text-blue-200">Admin Limitations</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Defaults can only be triggered by objective on-chain criteria (missed payments, risk thresholds).
              Admin actions are limited to: pause/unpause contracts, update oracle configurations, and view-only monitoring.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={dashboard?.total_users || 0}
          icon="users"
        />
        <StatCard
          title="Total Assets"
          value={dashboard?.total_assets || 0}
          icon="building"
        />
        <StatCard
          title="Total Volume"
          value={`$${(dashboard?.total_volume || 0).toLocaleString()}`}
          icon="currency"
        />
        <StatCard
          title="Pending KYC"
          value={dashboard?.pending_kyc || 0}
          changeType={dashboard?.pending_kyc > 0 ? 'warning' : 'neutral'}
          icon="document"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <SystemStatus />
        </div>

        {/* KYC Queue */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">KYC Review Queue</h2>
          <KYCQueue />
        </div>
      </div>

      {/* High Risk Assets */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">High Risk Assets (View Only)</h2>
        <HighRiskAssets assets={dashboard?.high_risk_assets || []} />
      </div>

      {/* Recent Blockchain Events */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Blockchain Events</h2>
        <RecentEvents events={events || []} />
      </div>
    </div>
  );
}
