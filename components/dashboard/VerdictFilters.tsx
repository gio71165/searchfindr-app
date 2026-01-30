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
  const { selectedVerdict, setSelectedVerdict } = props;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-slate-600">Verdict:</span>

      <button
        onClick={() => setSelectedVerdict('proceed')}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          flex items-center gap-1.5
          ${selectedVerdict === 'proceed'
            ? 'bg-emerald-500 text-white shadow-md'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }
        `}
      >
        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Proceed
      </button>

      <button
        onClick={() => setSelectedVerdict('park')}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          flex items-center gap-1.5
          ${selectedVerdict === 'park'
            ? 'bg-blue-500 text-white shadow-md'
            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
          }
        `}
      >
        <Pause className="w-3.5 h-3.5 flex-shrink-0" />
        Park
      </button>

      <button
        onClick={() => setSelectedVerdict('pass')}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          flex items-center gap-1.5
          ${selectedVerdict === 'pass'
            ? 'bg-red-500 text-white shadow-md'
            : 'bg-red-50 text-red-700 hover:bg-red-100'
          }
        `}
      >
        <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
        Pass
      </button>

      <button
        onClick={() => setSelectedVerdict('all')}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          ${selectedVerdict === 'all'
            ? 'bg-slate-700 text-white shadow-md'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }
        `}
      >
        All
      </button>
    </div>
  );
}
