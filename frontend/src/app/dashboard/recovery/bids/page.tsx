'use client';

/**
 * Recovery Partner Bids Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import apiClient from '@/lib/api';

export default function BidsPage() {
  const { address } = useAccount();

  const { data: bids, isLoading } = useQuery({
    queryKey: ['my-bids', address],
    queryFn: async () => {
      const res = await apiClient.get('/recovery/bids');
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
      <h1 className="text-2xl font-bold">My Bids</h1>
      
      <div className="card p-6">
        {bids?.items && bids.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bid Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bids.items.map((bid: any) => (
                  <tr key={bid.id}>
                    <td className="px-6 py-4">{bid.auction_name}</td>
                    <td className="px-6 py-4">${bid.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${bid.status === 'winning' ? 'badge-success' : bid.status === 'outbid' ? 'badge-danger' : 'badge-info'}`}>
                        {bid.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(bid.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No bids placed yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
