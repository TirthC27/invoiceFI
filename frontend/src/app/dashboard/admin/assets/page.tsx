'use client';

/**
 * Admin Assets Page
 */

import { useQuery } from '@tanstack/react-query';
import { assetsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import Link from 'next/link';

export default function AdminAssetsPage() {
  const { user } = useAuthStore();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['admin-assets'],
    queryFn: () => assetsApi.list({}),
    enabled: user?.role === 'admin',
  });

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
          <p className="text-gray-600 mt-2">Admin access required</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terra-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Assets</h1>
      
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issuer</th>
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
                      <span className={`badge ${asset.status === 'active' ? 'badge-success' : asset.status === 'defaulted' ? 'badge-danger' : 'badge-warning'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">
                      {asset.issuer_address?.slice(0, 6)}...{asset.issuer_address?.slice(-4)}
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
            <p>No assets found</p>
          </div>
        )}
      </div>
    </div>
  );
}
