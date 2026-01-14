'use client';

import { DealHeader } from '../components/DealHeader';
import { DealChatPanel } from '../components/DealChatPanel';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { FinancialSnapshot } from '../components/FinancialSnapshot';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { normalizeRedFlags } from '../lib/normalizers';
import { firstSentence } from '../lib/formatters';

export function OnMarketDealView({
  deal,
  dealId,
  onBack,
  analyzing,
  aiError,
  onRunInitialDiligence,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  dealId: string;
  onBack: () => void;
  analyzing: boolean;
  aiError: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  const whyItMatters =
    (criteria?.why_it_matters && String(criteria.why_it_matters).trim()) || firstSentence(deal.ai_summary) || '';

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <DealHeader
              deal={deal}
              onBack={onBack}
              canToggleSave={canToggleSave}
              savingToggle={savingToggle}
              onToggleSave={onToggleSave}
            />

            {/* Small top run strip */}
            <section className="card-section">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Initial Diligence</h2>
                  <p className="text-xs text-muted-foreground">Runs AI based on listing text captured from the browser extension.</p>
                </div>
                <button onClick={onRunInitialDiligence} disabled={analyzing} className="text-xs px-3 py-1 border rounded">
                  {analyzing ? 'Running…' : deal.ai_summary ? 'Re-run' : 'Run'}
                </button>
              </div>
              {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
            </section>

            {whyItMatters ? (
              <section className="card-section">
                <h2 className="text-lg font-semibold mb-1">Why it matters</h2>
                <p className="text-sm opacity-90">{whyItMatters}</p>
                <p className="mt-1 text-[11px] opacity-70">Surface signal from listing inputs — verify with outreach + diligence.</p>
              </section>
            ) : null}

            <AIInvestmentMemo
              summary={deal.ai_summary}
              emptyText="No diligence memo available yet. Run Initial Diligence to generate one."
            />

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-3">Financials</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="text-xs uppercase">Revenue</p>
                  <p className="font-medium">{deal.revenue || fin.revenue || '—'}</p>
                </div>

                <div>
                  <p className="text-xs uppercase">EBITDA</p>
                  <p className="font-medium">{deal.ebitda || fin.ebitda || '—'}</p>
                </div>

                {fin.margin && (
                  <div>
                    <p className="text-xs uppercase">Margin</p>
                    <p className="font-medium">{fin.margin}</p>
                  </div>
                )}

                {fin.customer_concentration && (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase">Customer Concentration</p>
                    <p className="font-medium">{fin.customer_concentration}</p>
                  </div>
                )}
              </div>
            </section>

            <RiskSignalsCard
              scoring={scoring}
              title="Scoring Breakdown"
              subtitle="Prioritization signals (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality."
            />

            <RedFlagsPanel redFlags={redFlags} />

            <SearcherSnapshot criteria={criteria} />
          </div>

          {/* RIGHT */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
    </main>
  );
}
