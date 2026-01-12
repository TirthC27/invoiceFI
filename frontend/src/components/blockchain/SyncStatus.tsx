/**
 * State Sync Status Component
 * Shows blockchain sync status to ensure users see accurate data
 */

'use client';

import { useSyncStatus } from '@/hooks/useBlockchain';

export function SyncStatusBanner() {
  const { data: status, isLoading } = useSyncStatus();

  if (isLoading || !status) return null;

  if (status.is_synced) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-700 px-4 py-2">
      <div className="container mx-auto flex items-center justify-center text-sm text-yellow-800 dark:text-yellow-200">
        <svg
          className="animate-spin w-4 h-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Syncing blockchain data... ({status.blocks_behind} blocks behind)
      </div>
    </div>
  );
}

export function SyncStatusIndicator() {
  const { data: status, isLoading } = useSyncStatus();

  if (isLoading) {
    return (
      <div className="flex items-center text-gray-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
        Checking sync...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center text-red-500 text-xs">
        <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
        Sync error
      </div>
    );
  }

  if (status.is_synced) {
    return (
      <div className="flex items-center text-green-600 text-xs">
        <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
        Synced (Block #{status.current_block.toLocaleString()})
      </div>
    );
  }

  return (
    <div className="flex items-center text-yellow-600 text-xs">
      <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse mr-2" />
      Syncing ({status.blocks_behind} blocks behind)
    </div>
  );
}
