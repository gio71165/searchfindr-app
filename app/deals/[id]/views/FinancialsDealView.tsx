'use client';

import { useMemo } from 'react';
import { DealHeader } from '../components/DealHeader';
import { ConfidencePill } from '../components/ConfidencePill';
import { SignalsGrid } from '../components/SignalsGrid';
import { EmptyCard } from '../components/EmptyCard';
import { PlaceholderList } from '../components/PlaceholderList';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { DiligenceChecklist } from '../components/DiligenceChecklist';
import { getDealConfidence } from '../lib/confidence';
import { normalizeStringArray, normalizeMetricRows, normalizeMarginRows, normalizeConfidenceSignals } from '../lib/normalizers';
import { sortYearsLikeHuman, formatMoney, formatPct } from '../lib/formatters';
import type { MarginRow } from '../lib/types';

export function FinancialsDealView({
  deal,
  onBack,
  loadingAnalysis,
  running,
  analysis,
  error,
  onRun,
  canToggleSave,
  savingToggle,
  onToggleSave,
}: {
  deal: any;
  onBack: () => void;
  loadingAnalysis: boolean;
  running: boolean;
  analysis: any | null;
  error: string | null;
  onRun: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
}) {
  const confidence = getDealConfidence(deal, { financialAnalysis: analysis });

  const redFlags = normalizeStringArray(analysis?.red_flags);
  const greenFlags = normalizeStringArray(analysis?.green_flags);
  const missingItems = normalizeStringArray(analysis?.missing_items);
  const diligenceNotes = normalizeStringArray(analysis?.diligence_notes);

  const extracted = analysis?.extracted_metrics ?? null;
  const yoy = normalizeStringArray(extracted?.yoy_trends);

  const revenueRows = normalizeMetricRows(extracted?.revenue);
  const ebitdaRows = normalizeMetricRows(extracted?.ebitda);
  const netIncomeRows = normalizeMetricRows(extracted?.net_income);
  const marginRows = normalizeMarginRows(extracted?.margins);

  const allYears = Array.from(
    new Set([
      ...revenueRows.map((r) => r.year),
      ...ebitdaRows.map((r) => r.year),
      ...netIncomeRows.map((r) => r.year),
      ...marginRows.map((m) => m.year),
    ])
  ).sort(sortYearsLikeHuman);

  const yearToRevenue = new Map(revenueRows.map((r) => [r.year, r]));
  const yearToEbitda = new Map(ebitdaRows.map((r) => [r.year, r]));
  const yearToNet = new Map(netIncomeRows.map((r) => [r.year, r]));

  const marginTypes = Array.from(new Set(marginRows.map((m) => (m.type || 'unknown').trim())))
    .filter(Boolean)
    .slice(0, 2);

  const marginsByTypeYear = new Map<string, Map<string, MarginRow>>();
  for (const mt of marginTypes) {
    marginsByTypeYear.set(
      mt,
      new Map(
        marginRows
          .filter((m) => (m.type || 'unknown').trim() === mt)
          .map((m) => [m.year, m])
      )
    );
  }

  const hasAnyAnalysis = Boolean(analysis);
  const showLoadingLine = loadingAnalysis && !hasAnyAnalysis;

  const signals = useMemo(() => {
    const fromDeal = normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
    if (fromDeal.length > 0) return fromDeal;

    const fromSignals = normalizeConfidenceSignals(analysis?.confidence_json?.signals ?? null);
    if (fromSignals.length > 0) return fromSignals;

    const fromBullets = normalizeConfidenceSignals(analysis?.confidence_json?.bullets ?? null);
    return fromBullets;
  }, [deal?.ai_confidence_json?.signals, analysis?.confidence_json?.signals, analysis?.confidence_json?.bullets]);

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
        <DealHeader
          deal={deal}
          onBack={onBack}
          canToggleSave={canToggleSave}
          savingToggle={savingToggle}
          onToggleSave={onToggleSave}
          financialAnalysis={analysis}
        />
        <p className="text-sm text-muted-foreground -mt-6">
          Skeptical read on earnings quality, missing items, and risk signals. Saved to the deal and can be re-run anytime.
        </p>

        <section className="card-section">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Financial Analysis</h2>
              <p className="text-xs text-muted-foreground">Runs AI on the uploaded financials attached to this deal.</p>
            </div>

            <button onClick={onRun} disabled={running} className="text-xs px-3 py-1 border rounded">
              {running ? 'Running…' : analysis ? 'Re-run Financial Analysis' : 'Run Financial Analysis'}
            </button>
          </div>

          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          {showLoadingLine ? <p className="text-sm mt-3">Loading analysis…</p> : null}

          {!hasAnyAnalysis ? (
            <p className="text-sm mt-3 opacity-80">
              No analysis yet. Click "Run Financial Analysis" to generate outputs and populate sections below.
            </p>
          ) : null}
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
          </div>

          {hasAnyAnalysis ? (
            signals.length === 0 ? (
              <p className="mt-3 text-sm opacity-80">No confidence signals returned.</p>
            ) : (
              <SignalsGrid signals={signals} />
            )
          ) : (
            <p className="mt-3 text-sm opacity-80">Run Financial Analysis to generate read-quality signals.</p>
          )}
        </section>

        <EmptyCard title="YoY Trends">
          {hasAnyAnalysis ? (
            yoy.length === 0 ? (
              <PlaceholderList emptyText="No YoY trends returned." />
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm">
                {yoy.slice(0, 20).map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            )
          ) : (
            <PlaceholderList emptyText="YoY trends will appear here after you run Financial Analysis." />
          )}
        </EmptyCard>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RedFlagsPanel redFlags={redFlags} />
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Green Flags</h2>
            {hasAnyAnalysis ? (
              greenFlags.length === 0 ? (
                <p className="text-sm">No green flags returned.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {greenFlags.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Green flags will populate here after you run Financial Analysis.</p>
            )}
          </section>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card-section">
            <h2 className="text-lg font-semibold mb-2">Missing / Unclear Items</h2>
            {hasAnyAnalysis ? (
              missingItems.length === 0 ? (
                <p className="text-sm">Nothing flagged as missing or unclear.</p>
              ) : (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {missingItems.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )
            ) : (
              <p className="text-sm opacity-80">Missing or unclear items will populate here after you run Financial Analysis.</p>
            )}
          </section>

          <DiligenceChecklist items={diligenceNotes} emptyText="No diligence checklist items returned." />
        </section>

        <section className="card-section">
          <h2 className="text-lg font-semibold mb-2">Key Metrics</h2>

          {!hasAnyAnalysis ? (
            <p className="text-sm opacity-80">Key metrics will populate here after you run Financial Analysis.</p>
          ) : allYears.length === 0 ? (
            <p className="text-sm">No structured metrics extracted.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="table-header">
                  <tr>
                    <th className="px-2 py-2 font-medium">Metric</th>
                    {allYears.map((y) => (
                      <th key={y} className="px-2 py-2 font-medium">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-row">
                    <td className="px-2 py-2 font-medium">Revenue</td>
                    {allYears.map((y) => (
                      <td key={y} className="px-2 py-2">
                        {formatMoney(yearToRevenue.get(y)?.value ?? null)}
                      </td>
                    ))}
                  </tr>

                  <tr className="table-row">
                    <td className="px-2 py-2 font-medium">EBITDA</td>
                    {allYears.map((y) => (
                      <td key={y} className="px-2 py-2">
                        {formatMoney(yearToEbitda.get(y)?.value ?? null)}
                      </td>
                    ))}
                  </tr>

                  <tr className="table-row">
                    <td className="px-2 py-2 font-medium">Net Income</td>
                    {allYears.map((y) => (
                      <td key={y} className="px-2 py-2">
                        {formatMoney(yearToNet.get(y)?.value ?? null)}
                      </td>
                    ))}
                  </tr>

                  {marginTypes.map((mt) => {
                    const map = marginsByTypeYear.get(mt);
                    return (
                      <tr key={mt} className="table-row">
                        <td className="px-2 py-2 font-medium">{mt}</td>
                        {allYears.map((y) => (
                          <td key={y} className="px-2 py-2">
                            {formatPct(map?.get(y)?.value_pct ?? null)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="pt-2 text-[11px] opacity-70">
          SearchFindr surfaces prioritization signals. Final judgment remains with the buyer.
        </div>
      </div>
    </main>
  );
}
