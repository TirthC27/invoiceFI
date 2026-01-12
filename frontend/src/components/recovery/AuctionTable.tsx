'use client';

/**
 * Auction Table Component
 */

import { Auction, AuctionStatus } from '@/types';
import { formatEther } from 'viem';
import { useState } from 'react';

interface AuctionTableProps {
  auctions: Auction[];
  userAddress: string;
}

export function AuctionTable({ auctions, userAddress }: AuctionTableProps) {
  const [selectedAuction, setSelectedAuction] = useState<number | null>(null);

  if (!auctions || auctions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No active auctions</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Asset ID</th>
            <th>Start Price</th>
            <th>Current Bid</th>
            <th>Time Left</th>
            <th>Your Position</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {auctions.map((auction) => {
            const isHighestBidder = 
              auction.highest_bidder.toLowerCase() === userAddress.toLowerCase();
            const timeLeft = getTimeLeft(auction.end_time);

            return (
              <tr key={auction.id}>
                <td className="font-medium">#{auction.asset_id}</td>
                <td>{formatEther(auction.start_price)} MNT</td>
                <td className="font-medium text-terra-600">
                  {formatEther(auction.current_bid)} MNT
                </td>
                <td>
                  <span className={timeLeft.urgent ? 'text-red-600 font-medium' : ''}>
                    {timeLeft.text}
                  </span>
                </td>
                <td>
                  {isHighestBidder ? (
                    <span className="badge badge-success">Highest Bidder</span>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => setSelectedAuction(auction.id)}
                    className="btn-primary text-sm py-1 px-3"
                  >
                    Place Bid
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bid Modal */}
      {selectedAuction && (
        <BidModal
          auctionId={selectedAuction}
          onClose={() => setSelectedAuction(null)}
        />
      )}
    </div>
  );
}

function getTimeLeft(endTime: number): { text: string; urgent: boolean } {
  const now = Math.floor(Date.now() / 1000);
  const diff = endTime - now;

  if (diff <= 0) {
    return { text: 'Ended', urgent: false };
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { text: `${days}d ${hours % 24}h`, urgent: false };
  }

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, urgent: hours < 2 };
  }

  return { text: `${minutes}m`, urgent: true };
}

function BidModal({
  auctionId,
  onClose,
}: {
  auctionId: number;
  onClose: () => void;
}) {
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: Implement bid submission
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Place Bid on Auction #{auctionId}</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Bid Amount (MNT)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter bid amount"
              required
            />
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Place Bid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
