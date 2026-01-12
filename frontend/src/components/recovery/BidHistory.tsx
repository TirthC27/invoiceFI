'use client';

/**
 * Bid History Component
 */

interface Bid {
  id: string;
  auction_id: number;
  amount: number;
  timestamp: string;
  status: string;
}

interface BidHistoryProps {
  bids: Bid[];
}

export function BidHistory({ bids }: BidHistoryProps) {
  if (!bids || bids.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No bid history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bids.map((bid) => (
        <div
          key={bid.id}
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <div>
            <p className="font-medium">Auction #{bid.auction_id}</p>
            <p className="text-sm text-gray-500">
              {new Date(bid.timestamp).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium">${bid.amount.toLocaleString()}</p>
            <BidStatusBadge status={bid.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function BidStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    winning: { label: 'Winning', class: 'badge-success' },
    outbid: { label: 'Outbid', class: 'badge-warning' },
    won: { label: 'Won', class: 'badge-success' },
    lost: { label: 'Lost', class: 'badge-danger' },
  };

  const { label, class: className } = config[status] || { label: status, class: 'badge-info' };

  return <span className={`badge ${className} text-xs`}>{label}</span>;
}
