'use client';

/**
 * High Risk Assets Component for Admin Dashboard
 */

import { Asset, RiskLevel, AssetStatus } from '@/types';
import Link from 'next/link';

interface HighRiskAssetsProps {
  assets: Asset[];
}

export function HighRiskAssets({ assets }: HighRiskAssetsProps) {
  // Filter for high and critical risk assets
  const highRiskAssets = assets.filter(
    (asset) =>
      asset.risk_level === RiskLevel.HIGH ||
      asset.risk_level === RiskLevel.CRITICAL
  );

  if (highRiskAssets.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="flex items-center justify-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          No high-risk assets
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {highRiskAssets.slice(0, 5).map((asset) => (
        <div
          key={asset.id}
          className={`flex items-center justify-between p-4 rounded-lg border ${
            asset.risk_level === RiskLevel.CRITICAL
              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700'
          }`}
        >
          <div>
            <p className="font-medium">{asset.name}</p>
            <p className="text-sm text-gray-500">
              ${asset.value.toLocaleString()} • {asset.asset_type}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <RiskBadge level={asset.risk_level} />
            <StatusBadge status={asset.status} />
            <Link
              href={`/dashboard/admin/assets/${asset.id}`}
              className="text-terra-600 hover:underline text-sm"
            >
              View
            </Link>
          </div>
        </div>
      ))}
      
      {highRiskAssets.length > 5 && (
        <Link
          href="/dashboard/admin/risk"
          className="block text-center text-terra-600 hover:underline text-sm py-2"
        >
          View all {highRiskAssets.length} high-risk assets →
        </Link>
      )}
    </div>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; class: string }> = {
    [RiskLevel.LOW]: { label: 'Low', class: 'bg-green-100 text-green-800' },
    [RiskLevel.MEDIUM]: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' },
    [RiskLevel.HIGH]: { label: 'High', class: 'bg-orange-100 text-orange-800' },
    [RiskLevel.CRITICAL]: { label: 'Critical', class: 'bg-red-100 text-red-800' },
  };

  const { label, class: className } = config[level];

  return <span className={`badge ${className}`}>{label}</span>;
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const config: Record<AssetStatus, { label: string; class: string }> = {
    [AssetStatus.PENDING]: { label: 'Pending', class: 'badge-warning' },
    [AssetStatus.ACTIVE]: { label: 'Active', class: 'badge-success' },
    [AssetStatus.PAUSED]: { label: 'Paused', class: 'badge-info' },
    [AssetStatus.DEFAULTED]: { label: 'Defaulted', class: 'badge-danger' },
    [AssetStatus.RECOVERED]: { label: 'Recovered', class: 'badge-info' },
  };

  const { label, class: className } = config[status];

  return <span className={`badge ${className}`}>{label}</span>;
}
