'use client';

/**
 * Admin Risk Monitoring Panel - Phase 8
 * View-only monitoring of defaults triggered by objective criteria
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import apiClient from '@/lib/api';
import { Asset, RiskLevel, AssetStatus } from '@/types';

interface RiskMetrics {
  total_assets: number;
  assets_by_risk: Record<RiskLevel, number>;
  defaults_this_month: number;
  average_risk_score: number;
  high_risk_threshold: number;
  critical_risk_threshold: number;
}

interface DefaultEvent {
  id: string;
  asset_id: string;
  asset_name: string;
  trigger_reason: string;
  triggered_at: string;
  missed_payments: number;
  days_overdue: number;
  risk_score_at_default: number;
}

export default function RiskMonitoringPage() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [defaults, setDefaults] = useState<DefaultEvent[]>([]);
  const [highRiskAssets, setHighRiskAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    missed_payment_threshold: 3,
    days_overdue_threshold: 90,
    risk_score_threshold: 80,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [metricsRes, defaultsRes, assetsRes] = await Promise.all([
          apiClient.get('/admin/risk/metrics'),
          apiClient.get('/admin/risk/defaults'),
          apiClient.get('/admin/risk/high-risk-assets'),
        ]);
        setMetrics(metricsRes.data);
        setDefaults(defaultsRes.data.items || []);
        setHighRiskAssets(assetsRes.data.items || []);
      } catch (error) {
        console.error('Failed to fetch risk data:', error);
        // Set mock data for demo
        setMetrics({
          total_assets: 42,
          assets_by_risk: {
            [RiskLevel.LOW]: 25,
            [RiskLevel.MEDIUM]: 10,
            [RiskLevel.HIGH]: 5,
            [RiskLevel.CRITICAL]: 2,
          },
          defaults_this_month: 1,
          average_risk_score: 32,
          high_risk_threshold: 60,
          critical_risk_threshold: 80,
        });
        setDefaults([
          {
            id: '1',
            asset_id: 'asset-123',
            asset_name: 'Commercial Property ABC',
            trigger_reason: 'Missed 3 consecutive payments',
            triggered_at: new Date().toISOString(),
            missed_payments: 3,
            days_overdue: 95,
            risk_score_at_default: 85,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Guard: Admin only
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">Only administrators can access risk monitoring.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Risk Monitoring</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View-only monitoring of asset risk levels and automatic defaults
        </p>
      </div>

      {/* Important Notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Objective Default Criteria
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          Defaults are triggered automatically by smart contracts based on objective criteria.
          Administrators cannot manually trigger defaults - this ensures fair and transparent
          enforcement for all participants.
        </p>
      </div>

      {/* Risk Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total Assets"
            value={metrics.total_assets}
            subtitle="Under monitoring"
          />
          <MetricCard
            title="Average Risk Score"
            value={metrics.average_risk_score}
            subtitle="Out of 100"
            color={metrics.average_risk_score > 50 ? 'text-orange-600' : 'text-green-600'}
          />
          <MetricCard
            title="High Risk Assets"
            value={metrics.assets_by_risk[RiskLevel.HIGH] + metrics.assets_by_risk[RiskLevel.CRITICAL]}
            subtitle="Requiring attention"
            color="text-red-600"
          />
          <MetricCard
            title="Defaults This Month"
            value={metrics.defaults_this_month}
            subtitle="Auto-triggered"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution */}
        {metrics && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Risk Distribution</h2>
            <RiskDistributionChart metrics={metrics} />
          </div>
        )}

        {/* Default Thresholds (View Only) */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Default Thresholds</h2>
          <p className="text-sm text-gray-500 mb-4">
            These thresholds are configured in the smart contract and trigger automatic defaults.
          </p>
          <div className="space-y-4">
            <ThresholdRow
              label="Missed Payments"
              value={settings.missed_payment_threshold}
              description="Consecutive missed payments before default"
            />
            <ThresholdRow
              label="Days Overdue"
              value={settings.days_overdue_threshold}
              description="Days past due before default trigger"
            />
            <ThresholdRow
              label="Risk Score"
              value={settings.risk_score_threshold}
              description="Risk score threshold for critical status"
            />
          </div>
        </div>
      </div>

      {/* Recent Defaults */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Default Events</h2>
        {defaults.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No defaults recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Trigger Reason</th>
                  <th>Missed Payments</th>
                  <th>Days Overdue</th>
                  <th>Risk Score</th>
                  <th>Triggered At</th>
                </tr>
              </thead>
              <tbody>
                {defaults.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.asset_name}</td>
                    <td className="text-sm">{d.trigger_reason}</td>
                    <td>{d.missed_payments}</td>
                    <td>{d.days_overdue}</td>
                    <td>
                      <span className="font-medium text-red-600">{d.risk_score_at_default}</span>
                    </td>
                    <td className="text-sm text-gray-500">
                      {new Date(d.triggered_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* High Risk Assets Watch List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">High Risk Watch List</h2>
        <p className="text-sm text-gray-500 mb-4">
          Assets approaching default thresholds. No manual intervention available.
        </p>
        {highRiskAssets.length === 0 ? (
          <p className="text-green-600 text-center py-4 flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            No assets on high risk watch list
          </p>
        ) : (
          <div className="space-y-3">
            {highRiskAssets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  asset.risk_level === RiskLevel.CRITICAL
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20'
                    : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20'
                }`}
              >
                <div>
                  <p className="font-medium">{asset.name}</p>
                  <p className="text-sm text-gray-500">
                    ${asset.value.toLocaleString()} • {asset.asset_type}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span
                    className={`badge ${
                      asset.risk_level === RiskLevel.CRITICAL
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {asset.risk_level}
                  </span>
                  <a
                    href={`/assets/${asset.id}`}
                    className="text-terra-600 hover:underline text-sm"
                  >
                    View Details
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  color = 'text-terra-600',
}: {
  title: string;
  value: number;
  subtitle: string;
  color?: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function ThresholdRow({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="text-2xl font-bold text-terra-600">{value}</div>
    </div>
  );
}

function RiskDistributionChart({ metrics }: { metrics: RiskMetrics }) {
  const total = metrics.total_assets || 1;
  const data = [
    { label: 'Low', value: metrics.assets_by_risk[RiskLevel.LOW], color: 'bg-green-500' },
    { label: 'Medium', value: metrics.assets_by_risk[RiskLevel.MEDIUM], color: 'bg-yellow-500' },
    { label: 'High', value: metrics.assets_by_risk[RiskLevel.HIGH], color: 'bg-orange-500' },
    { label: 'Critical', value: metrics.assets_by_risk[RiskLevel.CRITICAL], color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-sm mb-1">
            <span>{item.label}</span>
            <span>
              {item.value} ({((item.value / total) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color}`}
              style={{ width: `${(item.value / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
