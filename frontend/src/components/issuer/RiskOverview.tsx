'use client';

/**
 * Risk Overview Component
 */

import { Asset, RiskLevel } from '@/types';

interface RiskOverviewProps {
  assets: Asset[];
}

export function RiskOverview({ assets }: RiskOverviewProps) {
  const riskCounts = {
    [RiskLevel.LOW]: 0,
    [RiskLevel.MEDIUM]: 0,
    [RiskLevel.HIGH]: 0,
    [RiskLevel.CRITICAL]: 0,
  };

  assets.forEach((asset) => {
    riskCounts[asset.risk_level]++;
  });

  const total = assets.length || 1;

  return (
    <div className="space-y-4">
      <RiskBar
        label="Low Risk"
        count={riskCounts[RiskLevel.LOW]}
        total={total}
        color="bg-green-500"
      />
      <RiskBar
        label="Medium Risk"
        count={riskCounts[RiskLevel.MEDIUM]}
        total={total}
        color="bg-yellow-500"
      />
      <RiskBar
        label="High Risk"
        count={riskCounts[RiskLevel.HIGH]}
        total={total}
        color="bg-orange-500"
      />
      <RiskBar
        label="Critical Risk"
        count={riskCounts[RiskLevel.CRITICAL]}
        total={total}
        color="bg-red-500"
      />
    </div>
  );
}

interface RiskBarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function RiskBar({ label, count, total, color }: RiskBarProps) {
  const percentage = (count / total) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-500">{count} assets</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
