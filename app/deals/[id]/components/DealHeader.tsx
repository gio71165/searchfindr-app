import { SourceBadge } from './SourceBadge';
import { TierBadge } from './TierBadge';
import { ConfidencePill } from './ConfidencePill';
import { getDealConfidence } from '../lib/confidence';
import { safeDateLabel } from '../lib/formatters';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

export function DealHeader({
  deal,
  onBack,
  canToggleSave,
  savingToggle,
  onToggleSave,
  financialAnalysis,
}: {
  deal: Deal;
  onBack: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
  financialAnalysis?: FinancialAnalysis | null;
}) {
  const isTierSource = deal?.source_type === 'on_market' || deal?.source_type === 'off_market';
  const tier = isTierSource ? ((deal?.final_tier as string | null) || null) : null;

  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });
  const addedLabel = safeDateLabel(deal.created_at);

  return (
    <section>
      <button onClick={onBack} className="text-xs underline mb-4">
        ← Back to dashboard
      </button>
      <h1 className="text-3xl font-semibold mb-1">{deal.company_name || 'Untitled Company'}</h1>
      <p className="text-sm text-muted-foreground">
        {deal.location_city && `${deal.location_city}, `}
        {deal.location_state || deal.address || ''}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={deal.source_type} />
          {isTierSource ? <TierBadge tier={tier} /> : null}

          <ConfidencePill
            icon={confidence.icon}
            label={confidence.label}
            title={confidence.reason}
            analyzed={confidence.analyzed}
            level={confidence.level}
          />

          {addedLabel ? (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              Added {addedLabel}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {canToggleSave ? (
            <button
              onClick={onToggleSave}
              disabled={savingToggle}
              className="text-xs px-3 py-1 border rounded"
              title="Save/Unsave deal"
            >
              {savingToggle ? 'Saving…' : deal.is_saved ? 'Saved ✓' : 'Save'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
