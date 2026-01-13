'use client';

/**
 * Investor Loss Claims Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { blockchainApi } from '@/lib/api';

export default function ClaimsPage() {
  const { address } = useAccount();

  const { data: claims, isLoading } = useQuery({
    queryKey: ['loss-claims', address],
    queryFn: blockchainApi.getLossClaims,
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
      <h1 className="text-2xl font-bold">Loss Claims</h1>
      
      <div className="card p-6">
        {claims && claims.length > 0 ? (
          <div className="grid gap-4">
            {claims.map((claim: any) => (
              <div key={claim.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{claim.asset_name}</h3>
                    <p className="text-sm text-gray-500">Token ID: {claim.token_id}</p>
                  </div>
                  <span className="badge badge-warning">{claim.status}</span>
                </div>
                <div className="mt-2 text-sm">
                  <p>Claim Amount: ${claim.amount?.toLocaleString()}</p>
                  <p>Recovery: {claim.recovery_percentage || 0}%</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No loss claims</p>
            <p className="text-sm mt-2">Claims are generated when assets enter default</p>
          </div>
        )}
      </div>
    </div>
  );
}
