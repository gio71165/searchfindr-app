'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface ScarcityTrackerProps {
  totalSpots?: number;
  filledSpots?: number;
  deadline?: string;
  variant?: 'badge' | 'banner' | 'inline';
  className?: string;
}

export function ScarcityTracker({
  totalSpots = 50,
  filledSpots = 21,
  deadline = 'Feb 28, 2026',
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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex items-center gap-2 text-red-300 font-semibold">
              <AlertCircle className="w-5 h-5 animate-pulse" />
              <span className="text-lg">
                {spotsFilled}/{totalSpots} Early Bird Spots Filled
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-red-500/30" />
            <div className="flex items-center gap-2 text-orange-300 font-semibold">
              <Clock className="w-5 h-5" />
              <span className="text-lg">Early Bird Ends {deadline}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-red-300 font-semibold">
          {spotsFilled}/{totalSpots} spots filled
        </span>
        <span className="text-gray-400">•</span>
        <span className="text-orange-300">Ends {deadline}</span>
      </span>
    );
  }

  // Default: badge variant
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 backdrop-blur-sm ${className}`}>
      <AlertCircle className="h-4 w-4 animate-pulse" />
      <span>
        <strong>{spotsFilled}/{totalSpots} spots filled</strong> · Early bird ends {deadline}
      </span>
    </div>
  );
}
