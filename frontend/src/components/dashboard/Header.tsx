'use client';

/**
 * Dashboard Header
 */

import { ConnectButton } from '@/components/ConnectButton';
import { useAuthStore } from '@/store/auth';
import { KYCStatus } from '@/types';

export function Header() {
  const { user } = useAuthStore();

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 flex items-center justify-between">
      {/* Mobile menu button */}
      <button className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* KYC Status indicator */}
      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-2">KYC:</span>
            <KYCStatusBadge status={user.kyc_status} />
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Connect Button */}
        <ConnectButton showBalance={false} />
      </div>
    </header>
  );
}

function KYCStatusBadge({ status }: { status: KYCStatus }) {
  const config = {
    [KYCStatus.NOT_STARTED]: { label: 'Not Started', class: 'badge-warning' },
    [KYCStatus.PENDING]: { label: 'Pending', class: 'badge-info' },
    [KYCStatus.APPROVED]: { label: 'Approved', class: 'badge-success' },
    [KYCStatus.REJECTED]: { label: 'Rejected', class: 'badge-danger' },
  };

  const { label, class: className } = config[status] || config[KYCStatus.NOT_STARTED];

  return <span className={`badge ${className}`}>{label}</span>;
}
