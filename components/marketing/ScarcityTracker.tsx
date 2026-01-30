'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

// Note: This component now uses honest tracking. 
// Set filledSpots to actual customer count from your database.

interface ScarcityTrackerProps {
  totalSpots?: number;
  filledSpots?: number;
  deadline?: string;
  variant?: 'badge' | 'banner' | 'inline';
  className?: string;
}

export function ScarcityTracker({
  totalSpots = 50,
  filledSpots = 0, // Start at 0 - honest tracking
  deadline = 'March 1, 2026',
  variant = 'badge',
  className = '',
}: ScarcityTrackerProps) {
  const [spotsLeft, setSpotsLeft] = useState(totalSpots - filledSpots);

  // In a real app, you'd fetch this from an API
  // For now, we'll use the props
  useEffect(() => {
    setSpotsLeft(totalSpots - filledSpots);
  }, [totalSpots, filledSpots]);

  const spotsFilled = filledSpots;
  const percentageFilled = Math.round((spotsFilled / totalSpots) * 100);

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-red-600/20 to-orange-600/20 border-b border-red-500/30 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <AlertCircle className="w-5 h-5" />
                <span className="text-lg">
                  First {totalSpots} customers lock in early bird pricing forever
                </span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-emerald-500/30" />
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <Clock className="w-5 h-5" />
                <span className="text-lg">Early bird pricing ends {deadline}</span>
              </div>
            </div>
            {/* Progress Bar - Only show if spots are actually filled */}
            {spotsFilled > 0 && (
              <div className="w-full max-w-md h-2.5 bg-emerald-900/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${percentageFilled}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-emerald-300 font-semibold">
          First {totalSpots} customers lock in pricing
        </span>
        <span className="text-slate-400">•</span>
        <span className="text-emerald-300">Ends {deadline}</span>
      </span>
    );
  }

  // Default: badge variant
  return (
    <div className={`inline-flex flex-col items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 backdrop-blur-sm ${className}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>
          <strong>First {totalSpots} customers</strong> lock in early bird pricing forever · Ends {deadline}
        </span>
      </div>
      {/* Progress Bar - Only show if spots are actually filled */}
      {spotsFilled > 0 && (
        <div className="w-full max-w-[200px] h-2 bg-emerald-900/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentageFilled}%` }}
          />
        </div>
      )}
    </div>
  );
}
