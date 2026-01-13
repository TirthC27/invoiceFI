'use client';

/**
 * Issuer My Assets Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { assetsApi } from '@/lib/api';
import Link from 'next/link';

export default function MyAssetsPage() {
  const { address } = useAccount();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['issuer-assets', address],
    queryFn: () => assetsApi.list({ issuer: address }),
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Assets</h1>
        <Link href="/dashboard/issuer/assets/new" className="btn-primary">
          + Register New Asset
        </Link>
      </div>
      
      <div className="card p-6">
        {assets?.items && assets.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {assets.items.map((asset: any) => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4">{asset.name}</td>
                    <td className="px-6 py-4">{asset.asset_type}</td>
                    <td className="px-6 py-4">${asset.value?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${asset.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/assets/${asset.id}`} className="text-terra-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No assets registered yet</p>
            <Link href="/dashboard/issuer/assets/new" className="text-terra-600 hover:underline mt-2 inline-block">
              Register your first asset
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
