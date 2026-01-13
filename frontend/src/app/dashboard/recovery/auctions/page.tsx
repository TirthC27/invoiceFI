'use client';

/**
 * Recovery Partner Auctions Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { blockchainApi } from '@/lib/api';

export default function AuctionsPage() {
  const { address } = useAccount();

  const { data: auctions, isLoading } = useQuery({
    queryKey: ['active-auctions'],
    queryFn: blockchainApi.getAuctions,
    enabled: !!address,
    refetchInterval: 30000,
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
      <h1 className="text-2xl font-bold">Active Auctions</h1>
      
      <div className="card p-6">
        {auctions && auctions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction: any) => (
              <div key={auction.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-semibold">{auction.asset_name}</h3>
                <p className="text-sm text-gray-500">Asset ID: {auction.asset_id}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Current Bid:</span>
                    <span className="font-medium">${auction.current_bid?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Bid:</span>
                    <span>${auction.min_bid?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ends:</span>
                    <span>{new Date(auction.end_time).toLocaleString()}</span>
                  </div>
                </div>
                <button className="btn-primary w-full mt-4">Place Bid</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No active auctions</p>
            <p className="text-sm mt-2">Auctions are created when assets enter default</p>
          </div>
        )}
      </div>
    </div>
  );
}
