'use client';

import { useMemo } from 'react';
import { DealHeader } from '../components/DealHeader';
import { DealChatPanel } from '../components/DealChatPanel';
import { ConfidencePill } from '../components/ConfidencePill';
import { SignalsGrid } from '../components/SignalsGrid';
import { AIInvestmentMemo } from '../components/AIInvestmentMemo';
import { FinancialSnapshot } from '../components/FinancialSnapshot';
import { RiskSignalsCard } from '../components/RiskSignalsCard';
import { SearcherSnapshot } from '../components/SearcherSnapshot';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { DiligenceChecklist } from '../components/DiligenceChecklist';
import { getDealConfidence } from '../lib/confidence';
import { normalizeRedFlags, normalizeConfidenceSignals } from '../lib/normalizers';
import { safeDateLabel } from '../lib/formatters';

export function CimDealView({
  deal,
  dealId,
  onBack,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  dealId: string;
  onBack: () => void;
  processingCim: boolean;
  cimError: string | null;
  cimSuccess: boolean;
  onRunCim: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const finRaw = deal.ai_financials_json || {};

  const fin = {
    revenue:
      finRaw.revenue ??
      finRaw.ttm_revenue ??
      finRaw.revenue_ttm ??
      finRaw.ttmRevenue ??
      finRaw.latest_revenue ??
      null,
    ebitda:
      finRaw.ebitda ??
      finRaw.ttm_ebitda ??
      finRaw.ebitda_ttm ??
      finRaw.ttmEbitda ??
      finRaw.latest_ebitda ??
      null,
    margin: finRaw.ebitda_margin ?? finRaw.ebitda_margin_ttm ?? finRaw.margin ?? finRaw.ebitdaMargin ?? null,
    customer_concentration:
      finRaw.customer_concentration ?? finRaw.customer_conc ?? finRaw.customer_concentration_summary ?? null,
    revenue_1y_ago: finRaw.revenue_1y_ago ?? finRaw.revenue_last_year ?? finRaw.revenue_fy1 ?? null,
    revenue_2y_ago: finRaw.revenue_2y_ago ?? finRaw.revenue_two_years_ago ?? finRaw.revenue_fy2 ?? null,
    revenue_cagr_3y:
      finRaw.revenue_cagr_3y ?? finRaw.revenue_3yr_cagr ?? finRaw.revenue_cagr_3yr ?? finRaw.rev_cagr_3y ?? null,
    capex_intensity: finRaw.capex_intensity ?? finRaw.capex_pct_revenue ?? null,
    working_capital_needs: finRaw.working_capital_needs ?? finRaw.working_capital_profile ?? null,
  };

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const ddChecklist: string[] = Array.isArray(criteria.dd_checklist) ? criteria.dd_checklist.map(String) : [];

  const confidence = getDealConfidence(deal);

  const signals = useMemo(() => {
    return normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
  }, [deal?.ai_confidence_json?.signals]);

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto py-10 px-4">
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            <section className="flex flex-col gap-2">
              <DealHeader
                deal={deal}
                onBack={onBack}
                canToggleSave={canToggleSave}
                savingToggle={savingToggle}
                onToggleSave={onToggleSave}
              />

              {/* Small top run strip */}
              <div className="card-section mt-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold">CIM Processing</h2>
                    <p className="text-xs text-muted-foreground">Re-run AI analysis on the original CIM PDF.</p>
                  </div>
                  <button onClick={onRunCim} disabled={processingCim} className="text-xs px-3 py-1 border rounded">
                    {processingCim ? 'Processing…' : 'Re-run'}
                  </button>
                </div>

                {cimError && <p className="text-xs text-red-500 mt-2">{cimError}</p>}
                {cimSuccess && <p className="text-xs text-green-600 mt-2">CIM processed successfully. Analysis is up to date.</p>}
              </div>
            </section>

            <section className="card-section">
              <h2 className="text-lg font-semibold mb-2">Data Confidence & Read Quality</h2>

              <div className="flex flex-wrap items-center gap-2">
                <ConfidencePill
                  icon={confidence.icon}
                  label={confidence.label}
                  title={confidence.reason}
                  analyzed={confidence.analyzed}
                  level={confidence.level}
                />
                {deal?.ai_confidence_json?.updated_at ? (
                  <span className="text-xs opacity-70">Updated {safeDateLabel(deal.ai_confidence_json.updated_at) || ''}</span>
                ) : null}
              </div>

              {confidence.analyzed ? (
                signals.length === 0 ? (
                  <p className="mt-3 text-sm opacity-80">No confidence signals returned.</p>
                ) : (
                  <SignalsGrid signals={signals} />
                )
              ) : (
                <p className="mt-3 text-sm opacity-80">Run AI on CIM to generate read-quality signals.</p>
              )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 card-section">
                <h2 className="text-lg font-semibold mb-2">AI Investment Memo (CIM)</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {deal.ai_summary || 'No AI summary available yet. Re-run CIM processing to generate an investment memo.'}
                </p>
              </div>

              <FinancialSnapshot fin={fin} />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RiskSignalsCard
                scoring={scoring}
                title="CIM Quality & Risk Signals"
                subtitle="Interpretation aids from CIM content (not a grade). Risk signals: High = more risk. Quality signals: High = stronger quality. No Tier is produced for CIM uploads."
              />

              <SearcherSnapshot criteria={criteria} />
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RedFlagsPanel redFlags={redFlags} />

              <DiligenceChecklist items={ddChecklist} emptyText="No checklist generated yet. Re-run CIM processing to populate this." />
            </section>
          </div>

          {/* RIGHT */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
    </main>
  );
}
