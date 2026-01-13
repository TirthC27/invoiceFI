'use client';

/**
 * Admin KYC Queue Page
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useState } from 'react';

export default function KYCQueuePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: queue, isLoading } = useQuery({
    queryKey: ['kyc-queue'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/kyc/queue');
      return res.data;
    },
    enabled: user?.role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.post(`/admin/kyc/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setSelectedUser(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await apiClient.post(`/admin/kyc/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-queue'] });
      setSelectedUser(null);
    },
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
      <h1 className="text-2xl font-bold">KYC Review Queue</h1>
      
      <div className="card p-6">
        {queue?.items && queue.items.length > 0 ? (
          <div className="space-y-4">
            {queue.items.map((item: any) => (
              <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-sm">
                      {item.wallet_address?.slice(0, 6)}...{item.wallet_address?.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted: {new Date(item.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => approveMutation.mutate(item.user_id)}
                      className="btn-primary text-sm"
                      disabled={approveMutation.isPending}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedUser(item)}
                      className="btn-secondary text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span> {item.full_name}
                  </div>
                  <div>
                    <span className="text-gray-500">DOB:</span> {item.date_of_birth}
                  </div>
                  <div>
                    <span className="text-gray-500">Nationality:</span> {item.nationality}
                  </div>
                  <div>
                    <span className="text-gray-500">Document:</span> {item.document_type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No pending KYC applications</p>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject KYC Application</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                rejectMutation.mutate({
                  userId: selectedUser.user_id,
                  reason: formData.get('reason') as string,
                });
              }}
            >
              <textarea
                name="reason"
                className="input w-full h-24"
                placeholder="Reason for rejection..."
                required
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button type="button" onClick={() => setSelectedUser(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700">
                  Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
