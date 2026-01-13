'use client';

/**
 * Investor Investments Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { investmentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function InvestmentsPage() {
  const { address } = useAccount();
  const { user } = useAuthStore();

  const { data: investments, isLoading } = useQuery({
    queryKey: ['my-investments', address],
    queryFn: investmentsApi.list,
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
      <h1 className="text-2xl font-bold">My Investments</h1>
      
      <div className="card p-6">
        {investments && investments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {investments.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4">{inv.asset_name}</td>
                    <td className="px-6 py-4">${inv.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="badge badge-success">{inv.status}</span>
                    </td>
                    <td className="px-6 py-4">${inv.returns?.toLocaleString() || '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No investments yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
