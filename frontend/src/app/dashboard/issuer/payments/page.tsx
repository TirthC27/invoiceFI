'use client';

/**
 * Issuer Payments Page
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { paymentsApi } from '@/lib/api';

export default function PaymentsPage() {
  const { address } = useAccount();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['issuer-payments', address],
    queryFn: paymentsApi.list,
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
      <h1 className="text-2xl font-bold">Payment Schedule</h1>
      
      <div className="card p-6">
        {payments?.items && payments.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.items.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4">{payment.asset_name}</td>
                    <td className="px-6 py-4">${payment.amount?.toLocaleString()}</td>
                    <td className="px-6 py-4">{new Date(payment.due_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${payment.status === 'paid' ? 'badge-success' : payment.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'pending' && (
                        <button className="btn-primary text-sm">Pay Now</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No payments scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}
