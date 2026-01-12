'use client';

/**
 * Assets List Page - Browse all available assets
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Asset, AssetType, AssetStatus, RiskLevel } from '@/types';
import Link from 'next/link';

export default function AssetsPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    search: '',
  });

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await api.get('/assets', { params: filter });
        setAssets(response.data.items || []);
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [filter]);

  const filteredAssets = assets.filter((asset) => {
    if (filter.search) {
      const search = filter.search.toLowerCase();
      if (
        !asset.name.toLowerCase().includes(search) &&
        !asset.description.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (filter.type && asset.asset_type !== filter.type) return false;
    if (filter.status && asset.status !== filter.status) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Investment Opportunities
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Browse tokenized real-world assets on Mantle
            </p>
          </div>
          {user?.role === 'issuer' && (
            <Link href="/dashboard/issuer/assets/new" className="btn-primary">
              + Register Asset
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search assets..."
              className="input"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
            <select
              className="input"
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            >
              <option value="">All Types</option>
              {Object.values(AssetType).map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value={AssetStatus.ACTIVE}>Active</option>
              <option value={AssetStatus.PENDING}>Pending</option>
            </select>
            <button
              onClick={() => setFilter({ type: '', status: '', search: '' })}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Asset Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse h-64" />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No assets found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link href={`/assets/${asset.id}`}>
      <div className="card hover:shadow-lg transition-shadow cursor-pointer">
        <div className="h-32 bg-gradient-to-br from-terra-500 to-terra-700 rounded-t-xl flex items-center justify-center">
          <AssetTypeIcon type={asset.asset_type} />
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{asset.name}</h3>
            <RiskBadge level={asset.risk_level} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {asset.description}
          </p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-2xl font-bold text-terra-600">
                ${asset.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">{asset.asset_type.replace('_', ' ')}</p>
            </div>
            <StatusBadge status={asset.status} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function AssetTypeIcon({ type }: { type: AssetType }) {
  const icons: Record<AssetType, string> = {
    [AssetType.REAL_ESTATE]: '🏠',
    [AssetType.VEHICLE]: '🚗',
    [AssetType.EQUIPMENT]: '⚙️',
    [AssetType.INVOICE]: '📄',
    [AssetType.OTHER]: '📦',
  };

  return <span className="text-4xl">{icons[type] || '📦'}</span>;
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

function RiskBadge({ level }: { level: RiskLevel }) {
  const config: Record<RiskLevel, { label: string; class: string }> = {
    [RiskLevel.LOW]: { label: 'Low Risk', class: 'bg-green-100 text-green-800' },
    [RiskLevel.MEDIUM]: { label: 'Medium', class: 'bg-yellow-100 text-yellow-800' },
    [RiskLevel.HIGH]: { label: 'High', class: 'bg-orange-100 text-orange-800' },
    [RiskLevel.CRITICAL]: { label: 'Critical', class: 'bg-red-100 text-red-800' },
  };

  const { label, class: className } = config[level];

  return <span className={`badge ${className} text-xs`}>{label}</span>;
}
