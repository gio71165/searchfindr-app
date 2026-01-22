'use client';

import { memo } from 'react';

interface PipelineSummaryProps {
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  stageCounts: Record<string, number>;
  variant?: 'full' | 'compact';
}

const STAGES = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'ioi_sent', label: 'IOI Sent' },
  { key: 'loi', label: 'LOI' },
  { key: 'dd', label: 'DD' },
  { key: 'passed', label: 'Passed' },
] as const;

function PipelineSummaryComponent({ selectedStage, setSelectedStage, stageCounts, variant = 'full' }: PipelineSummaryProps) {
  if (variant === 'compact') {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stage: <span className="text-gray-500 font-normal">({stageCounts[selectedStage] ?? 0} deals)</span>
        </label>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label} ({stageCounts[s.key] ?? 0})</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto">
      {STAGES.map((stage) => {
        const sel = selectedStage === stage.key;
        const base = 'p-3 sm:p-4 rounded-xl border-2 font-semibold transition-colors text-left touch-manipulation min-h-[80px] sm:min-h-[auto]';
        const styles = sel
          ? 'bg-slate-700 text-white border-slate-700'
          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50';
        return (
          <button
            key={stage.key}
            onClick={() => setSelectedStage(stage.key)}
            className={`${base} ${styles}`}
          >
            <div className="text-xl sm:text-2xl font-bold mb-1">{stageCounts[stage.key] ?? 0}</div>
            <div className="text-xs font-medium opacity-80">{stage.label}</div>
          </button>
        );
      })}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const PipelineSummary = memo(PipelineSummaryComponent, (prevProps, nextProps) => {
  // Only re-render if stage counts or selection changed
  if (prevProps.selectedStage !== nextProps.selectedStage) return false;
  if (prevProps.variant !== nextProps.variant) return false;
  
  // Deep compare stageCounts
  const prevKeys = Object.keys(prevProps.stageCounts);
  const nextKeys = Object.keys(nextProps.stageCounts);
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (const key of prevKeys) {
    if (prevProps.stageCounts[key] !== nextProps.stageCounts[key]) return false;
  }
  
  // setSelectedStage should be stable (memoized in parent)
  return true;
});
