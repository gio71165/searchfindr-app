'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { LayoutGrid, GripVertical } from 'lucide-react';

const KANBAN_STAGES = [
  { key: 'new', label: 'New' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'ioi_sent', label: 'IOI Sent' },
  { key: 'loi', label: 'LOI' },
  { key: 'dd', label: 'DD' },
  { key: 'passed', label: 'Passed' },
] as const;

type StageKey = (typeof KANBAN_STAGES)[number]['key'];

type DealForKanban = {
  id: string;
  company_name: string | null;
  location_state: string | null;
  industry: string | null;
  source_type: string | null;
  verdict?: string | null;
  stage?: string | null;
  passed_at?: string | null;
  final_tier?: string | null;
  created_at?: string | null;
};

interface PipelineKanbanProps {
  deals: DealForKanban[];
  onRefresh: () => void;
  onToggleSelect?: (id: string) => void;
  selectedDealIds?: Set<string>;
  canSelect?: boolean;
  fromView?: string | null;
}

function getDealStage(deal: DealForKanban): StageKey {
  if (deal.passed_at != null || deal.stage === 'passed') return 'passed';
  const s = deal.stage || 'new';
  return KANBAN_STAGES.some((x) => x.key === s) ? (s as StageKey) : 'new';
}

export function PipelineKanban({
  deals,
  onRefresh,
  onToggleSelect,
  selectedDealIds = new Set(),
  canSelect,
  fromView,
}: PipelineKanbanProps) {
  const router = useRouter();
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dropTargetStage, setDropTargetStage] = useState<StageKey | null>(null);
  const [updating, setUpdating] = useState(false);

  const dealsByStage = useCallback(() => {
    const map: Record<StageKey, DealForKanban[]> = {
      new: [],
      reviewing: [],
      follow_up: [],
      ioi_sent: [],
      loi: [],
      dd: [],
      passed: [],
    };
    for (const deal of deals) {
      const stage = getDealStage(deal);
      map[stage].push(deal);
    }
    return map;
  }, [deals])();

  const moveDealToStage = async (dealId: string, stage: StageKey) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      showToast('Please sign in to move deals', 'error');
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch('/api/deals/bulk-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dealIds: [dealId], stage }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update stage');
      }
      showToast('Deal moved', 'success');
      onRefresh();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to move deal', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.setData('application/json', JSON.stringify({ dealId }));
  };

  const handleDragEnd = () => {
    setDraggedDealId(null);
    setDropTargetStage(null);
  };

  const handleDragOver = (e: React.DragEvent, stage: StageKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetStage(stage);
  };

  const handleDragLeave = () => {
    setDropTargetStage(null);
  };

  const handleDrop = (e: React.DragEvent, stage: StageKey) => {
    e.preventDefault();
    setDropTargetStage(null);
    const dealId = e.dataTransfer.getData('text/plain') || (() => {
      try {
        const j = JSON.parse(e.dataTransfer.getData('application/json'));
        return j?.dealId ?? null;
      } catch {
        return null;
      }
    })();
    if (dealId && !updating) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal && getDealStage(deal) !== stage) {
        moveDealToStage(dealId, stage);
      }
    }
    setDraggedDealId(null);
  };

  const openDeal = (deal: DealForKanban) => {
    const viewParam = fromView ? `?from_view=${fromView}` : '';
    router.push(`/deals/${deal.id}${viewParam}`);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
      {updating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60">
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600">
            <LoadingDots className="text-slate-300" />
            <span className="text-sm font-medium text-slate-200">Updating…</span>
          </div>
        </div>
      )}
      {KANBAN_STAGES.map(({ key, label }) => (
        <div
          key={key}
          onDragOver={(e) => handleDragOver(e, key)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, key)}
          className={`flex-shrink-0 w-72 rounded-xl border-2 transition-colors ${
            dropTargetStage === key
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-slate-700 bg-slate-800/80'
          }`}
        >
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <span className="font-semibold text-slate-200">{label}</span>
            <span className="text-sm text-slate-500">{dealsByStage[key].length}</span>
          </div>
          <div className="p-2 space-y-2 min-h-[320px]">
            {dealsByStage[key].map((deal) => (
              <div
                key={deal.id}
                draggable
                onDragStart={(e) => handleDragStart(e, deal.id)}
                onDragEnd={handleDragEnd}
                className={`group rounded-lg border bg-slate-800 border-slate-600 p-3 cursor-grab active:cursor-grabbing transition-shadow ${
                  draggedDealId === deal.id ? 'opacity-50 shadow-lg' : 'hover:border-slate-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => openDeal(deal)}
                      className="text-left w-full font-medium text-slate-100 truncate block hover:text-emerald-400"
                    >
                      {deal.company_name || 'Unnamed deal'}
                    </button>
                    <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-slate-400">
                      {deal.industry && <span>{deal.industry}</span>}
                      {deal.location_state && <span>• {deal.location_state}</span>}
                    </div>
                    {deal.verdict && (
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                          deal.verdict === 'proceed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : deal.verdict === 'park'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-600 text-slate-400'
                        }`}
                      >
                        {deal.verdict}
                      </span>
                    )}
                  </div>
                  {canSelect && onToggleSelect && (
                    <input
                      type="checkbox"
                      checked={selectedDealIds.has(deal.id)}
                      onChange={() => onToggleSelect(deal.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-600"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanViewToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: 'cards' | 'kanban';
  onViewModeChange: (mode: 'cards' | 'kanban') => void;
}) {
  return (
    <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-1">
      <button
        type="button"
        onClick={() => onViewModeChange('cards')}
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'cards' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Cards
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('kanban')}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'kanban' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </button>
    </div>
  );
}
