'use client';

/**
 * Portfolio Chart Component
 */

import { Investment } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PortfolioChartProps {
  investments: Investment[];
}

export function PortfolioChart({ investments }: PortfolioChartProps) {
  // Generate mock chart data based on investments
  const chartData = generateChartData(investments);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No portfolio data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip 
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function generateChartData(investments: Investment[]) {
  // Generate 30 days of mock data
  const data = [];
  const baseValue = investments.reduce((sum, inv) => sum + inv.amount, 0);
  
  if (baseValue === 0) return [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate growth with some volatility
    const growth = 1 + (30 - i) * 0.003 + (Math.random() - 0.5) * 0.02;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(baseValue * growth),
    });
  }

  return data;
}
