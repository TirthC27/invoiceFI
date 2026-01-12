'use client';

/**
 * Recent Events Component for Admin Dashboard
 */

import { BlockchainEvent } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface RecentEventsProps {
  events: BlockchainEvent[];
}

export function RecentEvents({ events }: RecentEventsProps) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No recent events</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.slice(0, 10).map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventItem({ event }: { event: BlockchainEvent }) {
  const config = getEventConfig(event.event_name);

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{config.label}</p>
        <p className="text-xs text-gray-500 truncate">
          TX: {event.tx_hash.slice(0, 10)}...{event.tx_hash.slice(-8)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(event.block_timestamp), { addSuffix: true })}
        </p>
        <a
          href={`https://explorer.testnet.mantle.xyz/tx/${event.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-terra-600 hover:underline"
        >
          View
        </a>
      </div>
    </div>
  );
}

function getEventConfig(eventName: string): {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
} {
  const configs: Record<string, { label: string; icon: React.ReactNode; bgColor: string }> = {
    AssetRegistered: {
      label: 'Asset Registered',
      icon: <span className="text-green-600 text-sm">+</span>,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    InvestmentMade: {
      label: 'Investment Made',
      icon: <span className="text-blue-600 text-sm">$</span>,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    PaymentMade: {
      label: 'Payment Made',
      icon: <span className="text-green-600 text-sm">✓</span>,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    RiskUpdated: {
      label: 'Risk Updated',
      icon: <span className="text-yellow-600 text-sm">⚠</span>,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    DefaultTriggered: {
      label: 'Default Triggered',
      icon: <span className="text-red-600 text-sm">!</span>,
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    AuctionCreated: {
      label: 'Auction Created',
      icon: <span className="text-purple-600 text-sm">🔨</span>,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    BidPlaced: {
      label: 'Bid Placed',
      icon: <span className="text-purple-600 text-sm">↑</span>,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    AuctionSettled: {
      label: 'Auction Settled',
      icon: <span className="text-green-600 text-sm">✓</span>,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  };

  return (
    configs[eventName] || {
      label: eventName,
      icon: <span className="text-gray-600 text-sm">•</span>,
      bgColor: 'bg-gray-100 dark:bg-gray-700',
    }
  );
}
