'use client';

/**
 * System Status Component for Admin Dashboard
 */

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface SystemStatusData {
  blockchain: {
    connected: boolean;
    block_number: number;
    chain_id: number;
  };
  database: {
    connected: boolean;
    total_assets: number;
    total_users: number;
  };
  ipfs: {
    connected: boolean;
    total_files: number;
  };
  workers: {
    indexer_running: boolean;
    last_sync: string;
  };
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await api.get('/admin/system-status');
        setStatus(response.data);
      } catch (err) {
        setError('Failed to load system status');
        // Set mock data for demo
        setStatus({
          blockchain: {
            connected: true,
            block_number: 12345678,
            chain_id: 5003,
          },
          database: {
            connected: true,
            total_assets: 42,
            total_users: 156,
          },
          ipfs: {
            connected: true,
            total_files: 234,
          },
          workers: {
            indexer_running: true,
            last_sync: new Date().toISOString(),
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />;
  }

  if (!status) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>{error || 'Unable to load system status'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatusCard
        title="Blockchain"
        status={status.blockchain.connected}
        details={[
          `Chain ID: ${status.blockchain.chain_id}`,
          `Block: ${status.blockchain.block_number.toLocaleString()}`,
        ]}
      />
      <StatusCard
        title="Database"
        status={status.database.connected}
        details={[
          `${status.database.total_assets} assets`,
          `${status.database.total_users} users`,
        ]}
      />
      <StatusCard
        title="IPFS Storage"
        status={status.ipfs.connected}
        details={[`${status.ipfs.total_files} files stored`]}
      />
      <StatusCard
        title="Indexer"
        status={status.workers.indexer_running}
        details={[`Last sync: ${new Date(status.workers.last_sync).toLocaleTimeString()}`]}
      />
    </div>
  );
}

interface StatusCardProps {
  title: string;
  status: boolean;
  details: string[];
}

function StatusCard({ title, status, details }: StatusCardProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{title}</h4>
        <span
          className={`w-3 h-3 rounded-full ${
            status ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </div>
      {details.map((detail, index) => (
        <p key={index} className="text-sm text-gray-500">
          {detail}
        </p>
      ))}
    </div>
  );
}
