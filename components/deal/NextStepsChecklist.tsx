'use client';

import { useState, useEffect } from 'react';
import { ListChecks, ChevronDown, ChevronUp } from 'lucide-react';

export type SourceTypeForNextSteps = 'cim_pdf' | 'on_market' | 'off_market' | 'financials';

const CIM_ITEMS = [
  'Red Flag Review',
  'Verify Add-backs',
  'Draft IOI',
  'Check Investor Alignment',
];

const FINANCIALS_ITEMS = [
  'QoE Audit',
  'EBITDA Normalization',
  'Working Capital True-up',
  'Lender Outreach',
];

const ON_MARKET_ITEMS = [
  'Broker Outreach',
  'NDA Request',
  'Teaser Review',
  'Website Verification',
];

// Off-market uses same workflow as on-market for sourcing
const OFF_MARKET_ITEMS = [
  'Broker Outreach',
  'NDA Request',
  'Teaser Review',
  'Website Verification',
];

function getItemsForSource(sourceType: SourceTypeForNextSteps): string[] {
  switch (sourceType) {
    case 'cim_pdf':
      return CIM_ITEMS;
    case 'financials':
      return FINANCIALS_ITEMS;
    case 'on_market':
      return ON_MARKET_ITEMS;
    case 'off_market':
      return OFF_MARKET_ITEMS;
    default:
      return [];
  }
}

const STORAGE_KEY_PREFIX = 'next-steps-';

function loadState(dealId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${dealId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveState(dealId: string, state: Record<string, boolean>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${dealId}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

interface NextStepsChecklistProps {
  dealId: string;
  sourceType: SourceTypeForNextSteps;
}

export function NextStepsChecklist({ dealId, sourceType }: NextStepsChecklistProps) {
  const items = getItemsForSource(sourceType);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setChecked(loadState(dealId));
  }, [dealId]);

  const toggleItem = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    saveState(dealId, next);
  };

  const completedCount = items.filter((item) => checked[item]).length;
  const totalCount = items.length;

  if (items.length === 0) return null;

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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                completedCount === totalCount
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              {completedCount === totalCount ? 'Done' : 'In progress'}
            </span>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {!isCollapsed && (
        <ul className="mt-4 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800/80 transition-colors"
            >
              <input
                type="checkbox"
                id={`next-step-${item}`}
                checked={!!checked[item]}
                onChange={() => toggleItem(item)}
                className="h-4 w-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/20 bg-slate-900 cursor-pointer"
                aria-label={`Mark "${item}" as complete`}
              />
              <label
                htmlFor={`next-step-${item}`}
                className={`flex-1 text-sm cursor-pointer select-none ${
                  checked[item] ? 'text-slate-500 line-through' : 'text-slate-200'
                }`}
              >
                {item}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
