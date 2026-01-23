'use client';

import { CheckCircle, Pause, XCircle } from 'lucide-react';

interface VerdictFiltersProps {
  selectedVerdict: string;
  setSelectedVerdict: (verdict: string) => void;
  proceedCount?: number;
  parkCount?: number;
  passCount?: number;
}

export function VerdictFilters(props: VerdictFiltersProps) {
  const { selectedVerdict, setSelectedVerdict, proceedCount = 0, parkCount = 0, passCount = 0 } = props;
  
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* Proceed */}
      <button
        onClick={() => setSelectedVerdict('proceed')}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
          flex items-center gap-2
          ${selectedVerdict === 'proceed'
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:shadow-md'
          }
        `}
      >
        <CheckCircle className="w-4 h-4" />
        Proceed {proceedCount > 0 && `(${proceedCount})`}
      </button>

      {/* Park */}
      <button
        onClick={() => setSelectedVerdict('park')}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
          flex items-center gap-2
          ${selectedVerdict === 'park'
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
            : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:shadow-md'
          }
        `}
      >
        <Pause className="w-4 h-4" />
        Park {parkCount > 0 && `(${parkCount})`}
      </button>

      {/* Pass */}
      <button
        onClick={() => setSelectedVerdict('pass')}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
          flex items-center gap-2
          ${selectedVerdict === 'pass'
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
            : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:shadow-md'
          }
        `}
      >
        <XCircle className="w-4 h-4" />
        Pass {passCount > 0 && `(${passCount})`}
      </button>

      {/* All */}
      <button
        onClick={() => setSelectedVerdict('all')}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
          ${selectedVerdict === 'all'
            ? 'bg-gray-700 text-white shadow-lg shadow-gray-500/30 scale-105'
            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 hover:shadow-md'
          }
        `}
      >
        All Deals
      </button>
    </div>
  );
}
