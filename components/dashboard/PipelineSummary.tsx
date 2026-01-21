'use client';

import { useState, useEffect } from 'react';

interface PipelineSummaryProps {
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  stageCounts: Record<string, number>;
  variant?: 'full' | 'compact';
}

export function PipelineSummary({ selectedStage, setSelectedStage, stageCounts, variant = 'full' }: PipelineSummaryProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stages = [
    { key: 'all', label: 'All', color: 'slate' },
    { key: 'new', label: 'New', color: 'blue' },
    { key: 'reviewing', label: 'Reviewing', color: 'amber' },
    { key: 'follow_up', label: 'Follow-up', color: 'purple' },
    { key: 'ioi_sent', label: 'IOI Sent', color: 'indigo' },
    { key: 'loi', label: 'LOI', color: 'emerald' },
    { key: 'dd', label: 'DD', color: 'teal' },
    { key: 'passed', label: 'Passed', color: 'gray' }
  ];

  const getColorClasses = (stage: typeof stages[0], isSelected: boolean) => {
    if (isSelected) {
      const selectedColors = {
        all: 'bg-slate-700 text-white border-slate-700 shadow-lg shadow-slate-200',
        new: 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200',
        reviewing: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-200',
        follow_up: 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200',
        ioi_sent: 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200',
        loi: 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200',
        dd: 'bg-teal-600 text-white border-teal-600 shadow-lg shadow-teal-200',
        passed: 'bg-gray-600 text-white border-gray-600 shadow-lg shadow-gray-200',
      };
      return selectedColors[stage.key as keyof typeof selectedColors] || selectedColors.all;
    }

    const unselectedColors = {
      all: 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50',
      new: 'bg-white border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50',
      reviewing: 'bg-white border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50',
      follow_up: 'bg-white border-purple-200 text-purple-700 hover:border-purple-300 hover:bg-purple-50',
      ioi_sent: 'bg-white border-indigo-200 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50',
      loi: 'bg-white border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50',
      dd: 'bg-white border-teal-200 text-teal-700 hover:border-teal-300 hover:bg-teal-50',
      passed: 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
    };
    return unselectedColors[stage.key as keyof typeof unselectedColors] || unselectedColors.all;
  };

  if (variant === 'compact') {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stage: <span className="text-gray-500 font-normal">({stageCounts[selectedStage] || 0} deals)</span>
        </label>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          {stages.map(stage => (
            <option key={stage.key} value={stage.key}>
              {stage.label} ({stageCounts[stage.key] || 0})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Full variant (tile grid)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto">
      {stages.map((stage, index) => {
        const isSelected = selectedStage === stage.key;
        return (
          <button
            key={stage.key}
            onClick={() => {
              if (typeof setSelectedStage === 'function') {
                setSelectedStage(stage.key);
              }
            }}
            className={`
              p-3 sm:p-4 rounded-xl border-2 font-semibold transition-all duration-200 text-left
              transform hover:scale-[1.02] active:scale-[0.98] touch-manipulation min-h-[80px] sm:min-h-[auto]
              ${getColorClasses(stage, isSelected)}
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
            style={{
              transitionDelay: `${index * 50}ms`,
            }}
          >
            <div className="text-xl sm:text-2xl font-bold mb-1">{stageCounts[stage.key] || 0}</div>
            <div className={`text-xs font-medium ${isSelected ? 'opacity-90' : 'opacity-80'}`}>
              {stage.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
