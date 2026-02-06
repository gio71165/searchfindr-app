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
      <span className="text-sm font-medium text-slate-400">Verdict:</span>

      <button
        onClick={() => setSelectedVerdict('proceed')}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-all
          flex items-center gap-1.5
          ${selectedVerdict === 'proceed'
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
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
            ? 'bg-blue-600 text-white shadow-md'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
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
            ? 'bg-red-600 text-white shadow-md'
            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
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
            ? 'bg-slate-950 text-slate-50 border border-slate-700'
            : 'bg-slate-800 text-slate-400 border border-slate-800 hover:bg-slate-700 hover:text-slate-300'
          }
        `}
      >
        All
      </button>
    </div>
  );
}
