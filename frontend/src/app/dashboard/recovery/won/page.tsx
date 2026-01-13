'use client';

/**
 * Recovery Partner Won Assets Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import apiClient from '@/lib/api';

export default function WonPage() {
  const { address } = useAccount();

  const { data: wonAssets, isLoading } = useQuery({
    queryKey: ['won-assets', address],
    queryFn: async () => {
      const res = await apiClient.get('/recovery/won');
      return res.data;
    },
    enabled: !!address,
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
      <h1 className="text-2xl font-bold">Won Assets</h1>
      
      <div className="card p-6">
        {wonAssets?.items && wonAssets.items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wonAssets.items.map((asset: any) => (
              <div key={asset.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold">{asset.name}</h3>
                <p className="text-sm text-gray-500">{asset.asset_type}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Won Price:</span>
                    <span className="font-medium">${asset.winning_bid?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date Won:</span>
                    <span>{new Date(asset.won_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Settlement:</span>
                    <span className={`badge ${asset.settled ? 'badge-success' : 'badge-warning'}`}>
                      {asset.settled ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No won assets yet</p>
            <p className="text-sm mt-2">Win auctions to see assets here</p>
          </div>
        )}
      </div>
    </div>
  );
}
