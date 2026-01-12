'use client';

/**
 * Loss Claims List Component
 */

import { LossClaim } from '@/types';
import { formatEther } from 'viem';

interface LossClaimsListProps {
  claims: LossClaim[];
}

export function LossClaimsList({ claims }: LossClaimsListProps) {
  if (!claims || claims.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No loss claims</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <div
          key={claim.token_id}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Loss Claim #{claim.token_id}</p>
              <p className="text-sm text-gray-500">Asset #{claim.asset_id}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-red-600">
              -{formatEther(claim.loss_amount)} MNT
            </p>
            <p className="text-sm text-green-600">
              Recovered: {formatEther(claim.recovery_amount)} MNT
            </p>
          </div>
          <div>
            {claim.claimed ? (
              <span className="badge badge-success">Claimed</span>
            ) : (
              <button className="btn-primary text-sm py-1 px-3">
                Claim
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
