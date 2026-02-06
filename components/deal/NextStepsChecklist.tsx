'use client';

import { useState, useCallback } from 'react';
import { ListChecks, ChevronDown, ChevronUp, Play, Check } from 'lucide-react';
import type { Deal, NextStepItem, NextStepsPayload } from '@/lib/types/deal';
import { AsyncButton } from '@/components/ui/AsyncButton';

export type SourceTypeForNextSteps = 'cim_pdf' | 'on_market' | 'off_market' | 'financials';

/** Has any AI analysis run (summary or financials)? */
function hasAnalysis(
  deal: Deal | null,
  sourceType: SourceTypeForNextSteps,
  hasAnalysisOverride?: boolean
): boolean {
  if (hasAnalysisOverride !== undefined) return hasAnalysisOverride;
  if (!deal) return false;
  if (sourceType === 'financials') {
    return Boolean((deal as { financial_analysis?: unknown })?.financial_analysis ?? deal.ai_summary);
  }
  return Boolean(deal.ai_summary);
}

interface NextStepsChecklistProps {
  deal: Deal | null;
  dealId: string;
  sourceType: SourceTypeForNextSteps;
  /** When no analysis yet, show "Run AI Analysis" and call this on click (CIM: onRunCim, on-market: onRunInitialDiligence, etc.) */
  onRunAnalysis?: () => void | Promise<void>;
  /** Whether run is in progress (disable button) */
  running?: boolean;
  /** Callback after steps are updated (e.g. refresh deal) */
  onStepsUpdated?: () => void;
  /** Override derived "has analysis" (e.g. financials: pass true when financialAnalysis exists) */
  hasAnalysisOverride?: boolean;
}

const PRIORITY_ORDER: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
function sortSteps(steps: NextStepItem[]): NextStepItem[] {
  return [...steps].sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );
}

export function NextStepsChecklist({
  deal,
  dealId,
  sourceType,
  onRunAnalysis,
  running = false,
  onStepsUpdated,
  hasAnalysisOverride,
}: NextStepsChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [patching, setPatching] = useState(false);

  const analysisDone = hasAnalysis(deal, sourceType, hasAnalysisOverride);
  const payload = deal?.next_steps ?? null;
  const steps = payload?.steps ?? [];
  const sortedSteps = sortSteps(steps);
  const completedCount = steps.filter((s) => s.completed).length;
  const totalCount = steps.length;
  const nextIncomplete = sortedSteps.find((s) => !s.completed);

  const toggleStep = useCallback(
    async (stepId: string) => {
      if (!payload || !dealId) return;
      const updatedSteps = payload.steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              completed: !s.completed,
              completed_at: s.completed ? null : new Date().toISOString(),
            }
          : s
      );
      const newPayload: NextStepsPayload = {
        ...payload,
        steps: updatedSteps,
      };
      setPatching(true);
      try {
        const { supabase } = await import('@/app/supabaseClient');
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/deals/${dealId}/next-steps`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ next_steps: newPayload }),
        });
        if (res.ok) {
          onStepsUpdated?.();
        }
      } finally {
        setPatching(false);
      }
    },
    [payload, dealId, onStepsUpdated]
  );

  // ——— PHASE 1: No analysis yet ———
  if (!analysisDone) {
    return (
      <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <ListChecks className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Next Steps</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Next steps will be generated after AI analysis.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {onRunAnalysis ? (
            <AsyncButton
              onClick={onRunAnalysis}
              isLoading={running}
              loadingText="Running…"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              <Play className="h-4 w-4" />
              Run AI Analysis
            </AsyncButton>
          ) : (
            <p className="text-sm text-slate-400">
              Run analysis above (or process CIM / run initial diligence) to generate deal-specific next steps.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ——— PHASE 2 & 3: Analysis done; show dynamic steps or empty state ———
  if (totalCount === 0) {
    return (
      <div className="rounded-lg border-2 border-slate-700 bg-slate-800 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 rounded-lg">
            <ListChecks className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Next Steps</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              No next steps were generated for this deal. Re-run AI analysis to generate steps from red flags, add-backs, and missing data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <ListChecks className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Next Steps</h3>
            <p className="text-sm text-slate-400">
              {completedCount}/{totalCount} completed
            </p>
            {nextIncomplete && completedCount > 0 && (
              <p className="text-xs text-emerald-400/90 mt-0.5">
                Next: {nextIncomplete.title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              completedCount === totalCount
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                : 'bg-slate-700 text-slate-300 border border-slate-600'
            }`}
          >
            {completedCount === totalCount ? 'Done' : 'In progress'}
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <ul className="mt-4 space-y-2">
          {sortedSteps.map((step) => (
            <li
              key={step.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
            >
              <input
                type="checkbox"
                id={`next-step-${step.id}`}
                checked={!!step.completed}
                onChange={() => toggleStep(step.id)}
                disabled={patching}
                className="h-4 w-4 mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900 cursor-pointer disabled:opacity-50"
                aria-label={`Mark "${step.title}" as complete`}
              />
              <label
                htmlFor={`next-step-${step.id}`}
                className="flex-1 cursor-pointer select-none min-w-0"
              >
                <span
                  className={`block text-sm font-medium ${
                    step.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                  }`}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="block text-xs text-slate-400 mt-0.5">{step.description}</span>
                )}
                <span className="inline-block mt-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      step.priority === 'high'
                        ? 'bg-red-500/20 text-red-300'
                        : step.priority === 'medium'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-slate-600 text-slate-400'
                    }`}
                  >
                    {step.priority}
                  </span>
                </span>
              </label>
              {step.completed && (
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" aria-hidden />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
