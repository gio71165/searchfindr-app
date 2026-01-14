'use client';

import { DealHeader } from '../components/DealHeader';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { normalizeRedFlags } from '../lib/normalizers';
import { firstSentence } from '../lib/formatters';

export function OffMarketDealView({
  deal,
  onBack,
  running,
  error,
  onRunInitialDiligence,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  running: boolean;
  error: string | null;
  onRunInitialDiligence: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const fin = deal.ai_financials_json || {};
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const ownerSignals = criteria?.owner_signals || null;
  const redFlags = normalizeRedFlags(deal.ai_red_flags);

  const whyItMatters =
    (criteria?.why_it_matters && String(criteria.why_it_matters).trim()) || firstSentence(deal.ai_summary) || '';

  const ratingLine =
    deal.rating || deal.ratings_total ? `${deal.rating ?? '—'} (${deal.ratings_total ?? '—'} reviews)` : null;

  const confidencePct =
    ownerSignals && typeof ownerSignals.confidence === 'number' ? Math.round(ownerSignals.confidence * 100) : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        <DealHeader
          deal={deal}
          onBack={onBack}
          canToggleSave={canToggleSave}
          savingToggle={savingToggle}
          onToggleSave={onToggleSave}
        />

        {ratingLine ? (
          <div className="mt-2">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              Google {ratingLine}
            </span>
          </div>
        ) : null}

        {/* Small top run strip */}
        <section className="card-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Initial Diligence</h2>
              <p className="text-xs text-muted-foreground">Runs AI based on the company's website + available inputs.</p>
            </div>
            <button onClick={onRunInitialDiligence} disabled={running} className="text-xs px-3 py-1 border rounded">
              {running ? 'Running…' : deal.ai_summary ? 'Re-run' : 'Run'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </section>

        {whyItMatters ? (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-1">Why it matters</h2>
            <p className="text-sm opacity-90">{whyItMatters}</p>
            <p className="mt-1 text-[11px] opacity-70">Surface signal from available inputs — verify with outreach + diligence.</p>
          </section>
        ) : null}

        <AIInvestmentMemo
          summary={deal.ai_summary}
          emptyText="No diligence memo yet. Run Initial Diligence to generate one from the company website."
        />

        {ownerSignals && (
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Owner Signals (Probabilistic)</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase">Likely owner-operated</p>
                <p className="font-medium">
                  {ownerSignals.likely_owner_operated ? 'Yes' : 'No'}
                  {confidencePct !== null && <span className="text-xs text-muted-foreground"> ({confidencePct}%)</span>}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase">Owner named on site</p>
                <p className="font-medium">
                  {ownerSignals.owner_named_on_site ? 'Yes' : 'No'}
                  {ownerSignals.owner_named_on_site && ownerSignals.owner_name ? (
                    <span className="text-xs text-muted-foreground"> — {ownerSignals.owner_name}</span>
                  ) : null}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase">Generation hint</p>
                <p className="font-medium">{ownerSignals.generation_hint || 'unknown'}</p>
              </div>

              <div>
                <p className="text-xs uppercase">Key-person dependency risk</p>
                <p className="font-medium">{ownerSignals.owner_dependency_risk || 'Unknown'}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase">Years in business</p>
                <p className="font-medium">{ownerSignals.years_in_business || 'Unknown'}</p>
              </div>
            </div>

            {Array.isArray(ownerSignals.evidence) && ownerSignals.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase mb-1">Evidence</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {ownerSignals.evidence.slice(0, 6).map((e: string, idx: number) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(ownerSignals.missing_info) && ownerSignals.missing_info.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase mb-1">Missing info</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {ownerSignals.missing_info.slice(0, 6).map((m: string, idx: number) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Financials (if available)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase">Revenue</p>
              <p className="font-medium">{fin.revenue || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase">EBITDA</p>
              <p className="font-medium">{fin.ebitda || 'Unknown'}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RiskSignalsCard
            scoring={scoring}
            title="Scoring Breakdown"
            subtitle="Prioritization view (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality."
          />

          <SearcherSnapshot criteria={criteria} />
        </section>

        <RedFlagsPanel redFlags={redFlags} />
      </div>
    </main>
  );
}
