'use client';

/**
 * Investment Table Component
 */

import { Investment, AssetStatus } from '@/types';
import Link from 'next/link';

interface InvestmentTableProps {
  investments: Investment[];
}

export function InvestmentTable({ investments }: InvestmentTableProps) {
  if (!investments || investments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No investments yet</p>
        <Link href="/assets" className="text-terra-600 hover:underline mt-2 inline-block">
          Browse available assets
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Amount</th>
            <th>Shares</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {investments.map((investment) => (
            <tr key={investment.id}>
              <td className="font-medium">{investment.asset_id}</td>
              <td>${investment.amount.toLocaleString()}</td>
              <td>{investment.shares}</td>
              <td>
                <StatusBadge status={investment.status} />
              </td>
              <td>
                <Link
                  href={`/dashboard/investor/investments/${investment.id}`}
                  className="text-terra-600 hover:underline text-sm"
                >
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    active: 'badge-success',
    pending: 'badge-warning',
    defaulted: 'badge-danger',
    exited: 'badge-info',
  };

  return (
    <span className={`badge ${config[status] || 'badge-info'}`}>
      {status}
    </span>
  );
}
