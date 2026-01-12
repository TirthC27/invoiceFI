'use client';

/**
 * Asset Table Component for Issuers
 */

import { Asset, AssetStatus, RiskLevel } from '@/types';
import Link from 'next/link';

interface AssetTableProps {
  assets: Asset[];
}

export function AssetTable({ assets }: AssetTableProps) {
  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No assets registered yet</p>
        <Link href="/dashboard/issuer/assets/new" className="text-terra-600 hover:underline mt-2 inline-block">
          Register your first asset
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Value</th>
            <th>Status</th>
            <th>Risk</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => (
            <tr key={asset.id}>
              <td>
                <div>
                  <p className="font-medium">{asset.name}</p>
                  <p className="text-xs text-gray-500">{asset.id.slice(0, 8)}...</p>
                </div>
              </td>
              <td className="capitalize">{asset.asset_type.replace('_', ' ')}</td>
              <td>${asset.value.toLocaleString()}</td>
              <td>
                <StatusBadge status={asset.status} />
              </td>
              <td>
                <RiskBadge level={asset.risk_level} />
              </td>
              <td>
                <Link
                  href={`/dashboard/issuer/assets/${asset.id}`}
                  className="text-terra-600 hover:underline text-sm"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const config: Record<AssetStatus, { label: string; class: string }> = {
    [AssetStatus.PENDING]: { label: 'Pending', class: 'badge-warning' },
    [AssetStatus.ACTIVE]: { label: 'Active', class: 'badge-success' },
    [AssetStatus.PAUSED]: { label: 'Paused', class: 'badge-info' },
    [AssetStatus.DEFAULTED]: { label: 'Defaulted', class: 'badge-danger' },
    [AssetStatus.RECOVERED]: { label: 'Recovered', class: 'badge-info' },
  };

  const { label, class: className } = config[status] || config[AssetStatus.PENDING];

  return <span className={`badge ${className}`}>{label}</span>;
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; class: string }> = {
    [RiskLevel.LOW]: { label: 'Low', class: 'bg-green-100 text-green-800' },
    [RiskLevel.MEDIUM]: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' },
    [RiskLevel.HIGH]: { label: 'High', class: 'bg-orange-100 text-orange-800' },
    [RiskLevel.CRITICAL]: { label: 'Critical', class: 'bg-red-100 text-red-800' },
  };

  const { label, class: className } = config[level] || config[RiskLevel.LOW];

  return <span className={`badge ${className}`}>{label}</span>;
}
