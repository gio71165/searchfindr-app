'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, MapPin, Building2, DollarSign, TrendingUp } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import type { Deal } from '@/lib/types/deal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SourceBadge } from '@/app/deals/[id]/components/SourceBadge';

type QuickViewDeal = Pick<
  Deal,
  | 'id'
  | 'company_name'
  | 'location_city'
  | 'location_state'
  | 'industry'
  | 'source_type'
  | 'verdict'
  | 'asking_price_extracted'
  | 'ebitda_ttm_extracted'
  | 'sba_eligible'
  | 'ai_summary'
  | 'criteria_match_json'
  | 'final_tier'
> & {
  verdict?: string | null;
  verdict_reason?: string | null;
  next_action?: string | null;
};

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const c: Record<string, { bg: string; text: string; label: string }> = {
    proceed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Proceed' },
    park: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Parked' },
    pass: { bg: 'bg-slate-600/50', text: 'text-slate-300', label: 'Passed' },
  };
  const n = verdict.toLowerCase();
  const style = c[n];
  if (!style) return null;
  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

interface QuickViewModalProps {
  dealId: string;
  /** When provided, show immediately without fetching (e.g. from deal card) */
  initialDeal?: QuickViewDeal | Deal | null;
  onClose: () => void;
  fromView?: string | null;
}

export function QuickViewModal({ dealId, initialDeal, onClose, fromView }: QuickViewModalProps) {
  const { workspaceId } = useAuth();
  const [deal, setDeal] = useState<QuickViewDeal | null>(initialDeal ?? null);
  const [loading, setLoading] = useState(!initialDeal);

  useEffect(() => {
    if (initialDeal) {
      setDeal(initialDeal);
      setLoading(false);
      return;
    }
    if (!workspaceId || !dealId) return;

    const fetchDeal = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select(
          'id, company_name, location_city, location_state, industry, source_type, verdict, verdict_reason, asking_price_extracted, ebitda_ttm_extracted, sba_eligible, ai_summary, criteria_match_json, final_tier, next_action'
        )
        .eq('id', dealId)
        .eq('workspace_id', workspaceId)
        .single();

      if (error) {
        setDeal(null);
      } else {
        setDeal(data);
      }
      setLoading(false);
    };

    fetchDeal();
  }, [dealId, workspaceId, initialDeal]);

  const fullHref = `/deals/${dealId}${fromView ? `?from_view=${fromView}` : ''}`;
  const verdict =
    deal?.verdict || (deal?.criteria_match_json as { verdict?: string } | undefined)?.verdict || null;
  const askingPrice =
    deal?.asking_price_extracted ||
    (deal?.criteria_match_json as { asking_price?: string } | undefined)?.asking_price ||
    null;
  const ebitda =
    deal?.ebitda_ttm_extracted ||
    (deal?.criteria_match_json as { ebitda_ttm?: string } | undefined)?.ebitda_ttm ||
    null;
  const nextAction =
    (deal as QuickViewDeal & { next_action?: string })?.next_action ||
    (deal?.criteria_match_json as { recommended_next_action?: string } | undefined)?.recommended_next_action ||
    null;
  const summary = deal?.ai_summary || null;
  const location = [deal?.location_city, deal?.location_state].filter(Boolean).join(', ') || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="quick-view-title" className="text-lg font-semibold text-slate-50">
            Quick View
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : !deal ? (
            <p className="text-slate-400 text-center py-8">Deal not found or you don’t have access.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-50 truncate">
                    {deal.company_name || 'Untitled Deal'}
                  </h3>
                  {location && (
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {location}
                    </p>
                  )}
                  {deal.industry && (
                    <p className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {deal.industry}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <SourceBadge source={deal.source_type} />
                  <VerdictBadge verdict={verdict} />
                </div>
              </div>

              {(askingPrice || ebitda) && (
                <div className="grid grid-cols-2 gap-3">
                  {askingPrice && (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <p className="text-xs text-slate-500 mb-0.5">Asking Price</p>
                      <p className="text-base font-semibold text-slate-200">{askingPrice}</p>
                    </div>
                  )}
                  {ebitda && (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <p className="text-xs text-slate-500 mb-0.5">EBITDA (TTM)</p>
                      <p className="text-base font-semibold text-slate-200">{ebitda}</p>
                    </div>
                  )}
                </div>
              )}

              {summary && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Summary</p>
                  <p className="text-sm text-slate-300 line-clamp-4">{summary}</p>
                </div>
              )}

              {nextAction && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <TrendingUp className="h-4 w-4 flex-shrink-0" />
                  <span>{nextAction}</span>
                </div>
              )}

              <a
                href={fullHref}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open full analysis
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
