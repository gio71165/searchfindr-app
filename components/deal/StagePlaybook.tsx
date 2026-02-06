'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { getPlaybookForStage, type DealStage } from '@/lib/stage-playbooks';

interface StagePlaybookProps {
  stage: DealStage | string | null | undefined;
  dealId: string;
}

export function StagePlaybook({ stage, dealId }: StagePlaybookProps) {
  const playbook = getPlaybookForStage(stage);
  
  if (!playbook) return null;

  // Get collapsed state from localStorage, default to expanded (false = not collapsed)
  const storageKey = `stage-playbook-collapsed-${dealId}`;
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(storageKey);
    return stored === 'true';
  });

  // Update localStorage when collapsed state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(isCollapsed));
    }
  }, [isCollapsed, dealId]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-red-300 bg-red-500/20 border-red-500/30';
      case 'medium':
        return 'text-amber-300 bg-amber-500/20 border-amber-500/30';
      case 'low':
        return 'text-blue-300 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4" />;
      case 'medium':
        return <Info className="w-4 h-4" />;
      case 'low':
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-800 shadow-sm">
      {/* Header */}
      <button
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-700/50 transition-colors rounded-t-lg"
        aria-expanded={!isCollapsed}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-slate-50 mb-1">
            {playbook.title}
          </h3>
          <p className="text-sm text-slate-400">
            {playbook.description}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          {isCollapsed ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
          {/* Tasks */}
          {playbook.tasks.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-50 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Next Steps
              </h4>
              <div className="space-y-2.5">
                {playbook.tasks.map((task, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getPriorityColor(task.priority)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getPriorityIcon(task.priority)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-50">{task.action}</span>
                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                          {task.timeframe}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {playbook.tips.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-50 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Pro Tips
              </h4>
              <ul className="space-y-2">
                {playbook.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty state for stages with no tasks */}
          {playbook.tasks.length === 0 && playbook.tips.length === 0 && (
            <p className="text-sm text-slate-400 italic">
              No specific actions needed at this stage.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
