'use client';

/**
 * Admin Oracle Configuration Page
 * Configure price feeds and external data sources
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

interface OracleConfig {
  id: string;
  name: string;
  type: 'price_feed' | 'risk_oracle' | 'payment_oracle';
  address: string;
  active: boolean;
  last_update: string;
  update_frequency: number;
}

export default function OracleConfigPage() {
  const { user } = useAuthStore();
  const [oracles, setOracles] = useState<OracleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOracles = async () => {
      try {
        const response = await api.get('/admin/oracles');
        setOracles(response.data.items || []);
      } catch (error) {
        console.error('Failed to fetch oracles:', error);
        // Mock data for demo
        setOracles([
          {
            id: '1',
            name: 'MNT/USD Price Feed',
            type: 'price_feed',
            address: '0x1234...5678',
            active: true,
            last_update: new Date().toISOString(),
            update_frequency: 3600,
          },
          {
            id: '2',
            name: 'Risk Score Oracle',
            type: 'risk_oracle',
            address: '0xabcd...efgh',
            active: true,
            last_update: new Date().toISOString(),
            update_frequency: 86400,
          },
          {
            id: '3',
            name: 'Payment Verification Oracle',
            type: 'payment_oracle',
            address: '0x9876...5432',
            active: true,
            last_update: new Date().toISOString(),
            update_frequency: 300,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchOracles();
  }, []);

  // Guard: Admin only
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500">Only administrators can configure oracles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Oracle Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage external data feeds and oracle contracts
        </p>
      </div>

      {/* Oracle List */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Active Oracles</h2>
        
        {loading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {oracles.map((oracle) => (
              <OracleCard key={oracle.id} oracle={oracle} />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card p-6 bg-gray-50 dark:bg-gray-800">
        <h3 className="font-semibold mb-2">About Oracles</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Oracles provide external data to smart contracts. They are crucial for:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
          <li>Price feeds for asset valuation</li>
          <li>Risk score calculations based on off-chain data</li>
          <li>Payment verification from traditional banking systems</li>
        </ul>
      </div>
    </div>
  );
}

function OracleCard({ oracle }: { oracle: OracleConfig }) {
  const typeConfig = {
    price_feed: { label: 'Price Feed', color: 'bg-blue-100 text-blue-800' },
    risk_oracle: { label: 'Risk Oracle', color: 'bg-purple-100 text-purple-800' },
    payment_oracle: { label: 'Payment Oracle', color: 'bg-green-100 text-green-800' },
  };

  const { label, color } = typeConfig[oracle.type];

  return (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700/50 border rounded-lg">
      <div className="flex items-center space-x-4">
        <div
          className={`w-3 h-3 rounded-full ${
            oracle.active ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <div>
          <p className="font-medium">{oracle.name}</p>
          <p className="text-sm text-gray-500 font-mono">{oracle.address}</p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <span className={`badge ${color}`}>{label}</span>
        <div className="text-right">
          <p className="text-sm">
            Updates every {oracle.update_frequency / 60} min
          </p>
          <p className="text-xs text-gray-500">
            Last: {new Date(oracle.last_update).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
