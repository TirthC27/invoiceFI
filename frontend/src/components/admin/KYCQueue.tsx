'use client';

/**
 * KYC Queue Component for Admin Dashboard
 */

import { useState } from 'react';

interface KYCApplication {
  id: string;
  user_address: string;
  full_name: string;
  submitted_at: string;
  document_type: string;
  status: string;
}

interface KYCQueueProps {
  applications: KYCApplication[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

export function KYCQueue({ applications, onApprove, onReject }: KYCQueueProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingApplications = applications.filter(
    (app) => app.status === 'pending'
  );

  if (pendingApplications.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="flex items-center justify-center">
          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          No pending KYC applications
        </p>
      </div>
    );
  }

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await onApprove(id);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    setProcessing(rejectId);
    try {
      await onReject(rejectId, rejectReason);
      setRejectId(null);
      setRejectReason('');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      {pendingApplications.map((app) => (
        <div
          key={app.id}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div className="flex items-center">
            <div className="w-10 h-10 bg-terra-100 dark:bg-terra-900/30 rounded-full flex items-center justify-center mr-3">
              <span className="text-terra-600 font-medium">
                {app.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-medium">{app.full_name}</p>
              <p className="text-sm text-gray-500">
                {app.user_address.slice(0, 6)}...{app.user_address.slice(-4)}
              </p>
            </div>
          </div>
          <div className="text-right mr-4">
            <p className="text-sm">{app.document_type}</p>
            <p className="text-xs text-gray-500">
              {new Date(app.submitted_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleApprove(app.id)}
              disabled={processing === app.id}
              className="btn-primary text-sm py-1 px-3"
            >
              {processing === app.id ? '...' : 'Approve'}
            </button>
            <button
              onClick={() => setRejectId(app.id)}
              disabled={processing === app.id}
              className="btn-secondary text-sm py-1 px-3 text-red-600 border-red-300 hover:bg-red-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject KYC Application</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Rejection Reason
              </label>
              <textarea
                className="input h-24 resize-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason('');
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason || processing === rejectId}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700"
              >
                {processing === rejectId ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
