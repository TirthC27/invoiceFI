'use client';

/**
 * Asset Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { Asset, AssetStatus, RiskLevel, Investment, Payment } from '@/types';
import Link from 'next/link';

export default function AssetDetailPage() {
  const params = useParams();
  const { address } = useAccount();
  const { user } = useAuthStore();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [investAmount, setInvestAmount] = useState('');
  const [isInvesting, setIsInvesting] = useState(false);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const [assetRes, investmentsRes, paymentsRes] = await Promise.all([
          api.get(`/assets/${params.id}`),
          api.get(`/assets/${params.id}/investments`),
          api.get(`/assets/${params.id}/payments`),
        ]);
        setAsset(assetRes.data);
        setInvestments(investmentsRes.data.items || []);
        setPayments(paymentsRes.data.items || []);
      } catch (error) {
        console.error('Failed to fetch asset:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchAsset();
    }
  }, [params.id]);

  const handleInvest = async () => {
    if (!investAmount || !asset) return;
    
    setIsInvesting(true);
    try {
      await api.post(`/assets/${asset.id}/invest`, {
        amount: parseFloat(investAmount),
      });
      // Refresh investments
      const res = await api.get(`/assets/${asset.id}/investments`);
      setInvestments(res.data.items || []);
      setInvestAmount('');
    } catch (error) {
      console.error('Investment failed:', error);
    } finally {
      setIsInvesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-terra-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Asset Not Found</h1>
          <Link href="/assets" className="text-terra-600 hover:underline">
            Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = asset.issuer_address.toLowerCase() === address?.toLowerCase();
  const canInvest = 
    user?.kyc_status === 'approved' &&
    user?.role === 'investor' &&
    asset.status === AssetStatus.ACTIVE;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/assets" className="text-terra-600 hover:underline">
            ← Back to Assets
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <div className="card">
              <div className="h-48 bg-gradient-to-br from-terra-500 to-terra-700 rounded-t-xl flex items-center justify-center">
                <span className="text-6xl">
                  {asset.asset_type === 'real_estate' ? '🏠' :
                   asset.asset_type === 'vehicle' ? '🚗' :
                   asset.asset_type === 'equipment' ? '⚙️' :
                   asset.asset_type === 'invoice' ? '📄' : '📦'}
                </span>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl font-bold">{asset.name}</h1>
                    <p className="text-gray-500 capitalize">
                      {asset.asset_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <RiskBadge level={asset.risk_level} />
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {asset.description}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Asset Value</p>
                    <p className="text-2xl font-bold text-terra-600">
                      ${asset.value.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Token ID</p>
                    <p className="text-lg font-mono">
                      {asset.token_id || 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment History */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Investment History</h2>
              {investments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No investments yet
                </p>
              ) : (
                <div className="space-y-3">
                  {investments.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">${inv.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {inv.investor_address.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{inv.shares} shares</p>
                        <p className="text-xs text-gray-500">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Schedule */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Payment Schedule</h2>
              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No payments scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">${payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          Due: {new Date(payment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`badge ${
                        payment.status === 'paid' ? 'badge-success' :
                        payment.status === 'overdue' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Invest Card */}
            {canInvest && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Invest in this Asset</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">
                    Investment Amount (USD)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="100"
                  />
                </div>
                <button
                  onClick={handleInvest}
                  disabled={isInvesting || !investAmount}
                  className="btn-primary w-full"
                >
                  {isInvesting ? 'Processing...' : 'Invest Now'}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Minimum investment: $100
                </p>
              </div>
            )}

            {/* KYC Required Notice */}
            {user && user.kyc_status !== 'approved' && (
              <div className="card p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  KYC Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  Complete KYC verification to invest in assets.
                </p>
                <Link href="/auth/kyc" className="btn-primary w-full text-center">
                  Complete KYC
                </Link>
              </div>
            )}

            {/* Asset Info */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Asset Information</h2>
              <div className="space-y-3">
                <InfoRow label="Issuer" value={`${asset.issuer_address.slice(0, 6)}...${asset.issuer_address.slice(-4)}`} />
                <InfoRow label="Created" value={new Date(asset.created_at).toLocaleDateString()} />
                <InfoRow label="Document Hash" value={asset.document_hash.slice(0, 12) + '...'} />
                {asset.metadata_uri && (
                  <a
                    href={asset.metadata_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-terra-600 hover:underline text-sm"
                  >
                    View on IPFS →
                  </a>
                )}
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-4">Owner Actions</h2>
                <div className="space-y-3">
                  <Link
                    href={`/dashboard/issuer/assets/${asset.id}/edit`}
                    className="btn-secondary w-full text-center"
                  >
                    Edit Asset
                  </Link>
                  {asset.status === AssetStatus.ACTIVE && (
                    <button className="btn-secondary w-full text-orange-600 border-orange-300">
                      Pause Asset
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-sm font-medium">{value}</span>
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
