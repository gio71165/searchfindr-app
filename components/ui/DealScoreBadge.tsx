'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface DealScoreBadgeProps {
  tier: 'A' | 'B' | 'C' | null;
  score?: number | null; // Optional internal score for tooltip
  breakdown?: Record<string, number>;
  confidence?: number;
}

export function DealScoreBadge({ tier, score, breakdown, confidence }: DealScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (tier === null || tier === undefined) {
    return null;
  }

  // Determine color based on tier (matching system-wide A/B/C convention)
  let colorClasses = '';
  let label = '';
  
  if (tier === 'A') {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    label = 'Tier A';
  } else if (tier === 'B') {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    label = 'Tier B';
  } else {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200';
    label = 'Tier C';
  }

  const formatComponentName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${colorClasses} cursor-help`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className="font-bold">{tier}</span>
        {confidence !== undefined && confidence < 0.7 && (
          <Info className="h-3 w-3 opacity-60" />
        )}
      </div>

      {showTooltip && (breakdown || score !== undefined) && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-xs rounded-lg shadow-xl p-3">
          <div className="font-semibold mb-2 pb-2 border-b border-slate-700">
            Deal Tier: {tier}
            {score !== undefined && score !== null && (
              <span className="block text-slate-400 text-[10px] font-normal mt-1">
                Internal Score: {score}/100
              </span>
            )}
            {confidence !== undefined && (
              <span className="block text-slate-400 text-[10px] font-normal mt-1">
                Confidence: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {breakdown && Object.entries(breakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-slate-300">{formatComponentName(key)}:</span>
                  <span className="font-semibold">{value.toFixed(1)}</span>
                </div>
              ))}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="border-4 border-transparent border-t-slate-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
