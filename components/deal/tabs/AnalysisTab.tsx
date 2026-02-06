'use client';

import { useMemo } from 'react';
import { ExecutiveSummaryCard } from '@/app/deals/[id]/components/ExecutiveSummaryCard';
import { RedFlagsPanel } from '@/app/deals/[id]/components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '@/app/deals/[id]/components/QoeRedFlagsPanel';
import { AIInvestmentMemo } from '@/app/deals/[id]/components/AIInvestmentMemo';
import { FinancialSnapshot } from '@/app/deals/[id]/components/FinancialSnapshot';
import { OwnerInterviewQuestions } from '@/app/deals/[id]/components/OwnerInterviewQuestions';
import { normalizeRedFlags, normalizeStringArray, normalizeMetricRows, normalizeMarginRows } from '@/app/deals/[id]/lib/normalizers';
import { formatMoney, formatPct, sortYearsLikeHuman } from '@/app/deals/[id]/lib/formatters';
import type { Deal, FinancialMetrics, FinancialAnalysis } from '@/lib/types/deal';
import { BarChart3, TrendingUp, AlertTriangle, User } from 'lucide-react';
import { NextStepsChecklist } from '@/components/deal/NextStepsChecklist';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { GutCheck } from '@/components/deal/GutCheck';
import type { MarginRow } from '@/app/deals/[id]/lib/types';

/** Derive QoE red flags from CIM criteria_match.qoe (addbacks, addback_quality_summary) when ai_financials_json.qoe_red_flags is missing. */
function deriveQoeRedFlagsFromCimQoe(qoe: unknown): Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }> {
  if (!qoe || typeof qoe !== 'object') return [];
  const q = qoe as {
    addbacks?: Array<{ label?: string; amount?: string | null; category?: string; reason?: string | null }>;
    addback_quality_summary?: string | null;
  };
  const addbacks = Array.isArray(q.addbacks) ? q.addbacks : [];
  const out: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string }> = [];
  for (const a of addbacks) {
    const cat = (a.category || '').toLowerCase();
    if (cat !== 'maybe' && cat !== 'aggressive') continue;
    const severity = cat === 'aggressive' ? 'high' : 'medium';
    const label = a.label || 'Addback';
    const amount = a.amount ? ` (${a.amount})` : '';
    const reason = a.reason || 'No justification provided.';
    out.push({ type: 'addbacks', severity, description: `${label}${amount}: ${reason}` });
  }
  const summary = (q.addback_quality_summary || '').trim();
  if (summary && out.length === 0) {
    const lower = summary.toLowerCase();
    const severity = lower.includes('aggressive') || lower.includes('unreliable') ? 'high' : 'medium';
    out.push({ type: 'addbacks', severity, description: summary });
  }
  return out;
}

interface AnalysisTabProps {
  deal: Deal;
  dealId: string;
  onProceed: () => void;
  onPark: () => void;
  onPass: () => void;
  onRequestInfo?: () => void;
  settingVerdict: boolean;
  sourceType: 'cim_pdf' | 'on_market' | 'off_market' | 'financials';
  financialAnalysis?: FinancialAnalysis | null;
  hideVerdictButtons?: boolean;
  // CIM processing props
  processingCim?: boolean;
  cimError?: string | null;
  cimSuccess?: boolean;
  onRunCim?: () => void;
  /** When provided, Next Steps "Run AI Analysis" button will call this (e.g. onRunCim, onRunInitialDiligence) */
  onRunAnalysis?: () => void | Promise<void>;
  /** While analysis is running (disables Run AI Analysis button) */
  runningAnalysis?: boolean;
  /** After next steps are updated (e.g. refetch deal) */
  onRefresh?: () => void;
}

export function AnalysisTab({
  deal,
  dealId,
  onProceed,
  onPark,
  onPass,
  onRequestInfo,
  settingVerdict,
  sourceType,
  financialAnalysis,
  hideVerdictButtons = false,
  processingCim,
  cimError,
  cimSuccess,
  onRunCim,
  onRunAnalysis,
  runningAnalysis = false,
  onRefresh,
}: AnalysisTabProps) {
  const finRaw = deal.ai_financials_json || {};
  const finRawAny = finRaw as Record<string, unknown>;

  // Build fin object compatible with FinancialMetrics type
  const revenueValue = finRaw.revenue ?? finRawAny.ttm_revenue ?? finRawAny.revenue_ttm ?? finRawAny.ttmRevenue ?? finRawAny.latest_revenue;
  const ebitdaValue = finRaw.ebitda ?? finRawAny.ttm_ebitda ?? finRawAny.ebitda_ttm ?? finRawAny.ttmEbitda ?? finRawAny.latest_ebitda;
  
  const fin: FinancialMetrics = {
    ...finRaw,
    revenue: Array.isArray(revenueValue) ? revenueValue : undefined,
    ebitda: Array.isArray(ebitdaValue) ? ebitdaValue : undefined,
    margin: finRaw.margin ?? (typeof finRawAny.ebitda_margin === 'string' ? finRawAny.ebitda_margin : undefined) ?? (typeof finRawAny.ebitda_margin_ttm === 'string' ? finRawAny.ebitda_margin_ttm : undefined) ?? (typeof finRawAny.ebitdaMargin === 'string' ? finRawAny.ebitdaMargin : undefined),
    customer_concentration: finRaw.customer_concentration ?? (typeof finRawAny.customer_conc === 'string' ? finRawAny.customer_conc : undefined) ?? (typeof finRawAny.customer_concentration_summary === 'string' ? finRawAny.customer_concentration_summary : undefined),
    qoe_red_flags: Array.isArray(finRaw.qoe_red_flags) ? finRaw.qoe_red_flags : undefined,
    industry_benchmark: finRaw.industry_benchmark ?? undefined,
    owner_interview_questions: Array.isArray(finRaw.owner_interview_questions) ? finRaw.owner_interview_questions : undefined,
  };

  // For financials sourceType, use financialAnalysis data if available
  const redFlags = sourceType === 'financials' && financialAnalysis
    ? normalizeStringArray(financialAnalysis.red_flags)
    : normalizeRedFlags(deal.ai_red_flags);
  
  const qoeRedFlags = sourceType === 'financials' && financialAnalysis
    ? (financialAnalysis.qoe_red_flags || [])
    : (fin.qoe_red_flags?.length ? fin.qoe_red_flags : (sourceType === 'cim_pdf' ? deriveQoeRedFlagsFromCimQoe((deal.criteria_match_json as { qoe?: unknown })?.qoe) : [])) || [];
  
  const ownerQuestions = sourceType === 'financials' && financialAnalysis
    ? (financialAnalysis.extracted_metrics?.owner_interview_questions || [])
    : (fin.owner_interview_questions || []);
  
  const criteria = deal.criteria_match_json || {};

  // Financials-specific data extraction
  const extracted = financialAnalysis?.extracted_metrics ?? null;
  const yoy = normalizeStringArray(extracted?.yoy_trends);
  const missingItems = sourceType === 'financials' && financialAnalysis
    ? normalizeStringArray(financialAnalysis.missing_items)
    : [];

  // Key Metrics table data (for financials)
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

  const hasAnyAnalysis = sourceType === 'financials' ? Boolean(financialAnalysis) : Boolean(deal.ai_summary);
  const hasCimAnalysis = sourceType === 'cim_pdf' && Boolean(deal.ai_summary);

  return (
    <div className="space-y-6">
      {/* CIM Processing - Prominent at top for CIM deals without analysis */}
      {sourceType === 'cim_pdf' && onRunCim && (
        <div className={`rounded-lg border-2 p-6 ${
          hasCimAnalysis 
            ? 'border-slate-700 bg-slate-800' 
            : 'border-emerald-500/50 bg-emerald-500/10'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-50 mb-2">
                {hasCimAnalysis ? 'CIM Processing' : 'Run AI Analysis'}
              </h2>
              <p className="text-sm text-slate-400 mb-3">
                {hasCimAnalysis 
                  ? 'Re-run AI analysis on the original CIM PDF to update the analysis.'
                  : 'Process this CIM with AI to extract key information, financials, and generate an investment recommendation.'}
              </p>
              {cimError && (
                <p className="text-sm text-red-600 mt-2">{cimError}</p>
              )}
              {cimSuccess && (
                <p className="text-sm text-emerald-600 mt-2">CIM processed successfully. Analysis is up to date.</p>
              )}
            </div>
            <AsyncButton
              onClick={onRunCim}
              isLoading={processingCim}
              loadingText="Processing…"
              className={`px-6 py-3 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                hasCimAnalysis
                  ? 'border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {hasCimAnalysis ? 'Re-run Analysis' : 'Run AI Analysis'}
            </AsyncButton>
          </div>
        </div>
      )}

      {/* Next Steps: before analysis = single Run AI button; after = dynamic steps from deal.next_steps */}
      <NextStepsChecklist
        deal={deal}
        dealId={dealId}
        sourceType={sourceType}
        onRunAnalysis={onRunAnalysis ?? onRunCim}
        running={runningAnalysis || !!processingCim}
        onStepsUpdated={onRefresh}
        hasAnalysisOverride={sourceType === 'financials' ? !!financialAnalysis : undefined}
      />

      {/* Last Updated Timestamp */}
      {deal?.updated_at && (
        <div className="mb-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400">
            Analysis generated on{' '}
            <span className="font-medium text-slate-50">
              {new Date(deal.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at{' '}
              {new Date(deal.updated_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </p>
        </div>
      )}

      {/* Executive Summary Card */}
      <ExecutiveSummaryCard
        deal={deal}
        onProceed={onProceed}
        onPark={onPark}
        onPass={onPass}
        onRequestInfo={onRequestInfo}
        settingVerdict={settingVerdict}
        financialAnalysis={sourceType === 'financials' ? financialAnalysis : undefined}
        hideVerdictButtons={hideVerdictButtons}
      />

      {/* AI Investment Memo — moved up; high importance */}
      <AIInvestmentMemo
        summary={deal.ai_summary}
        emptyText={
          sourceType === 'cim_pdf'
            ? 'No AI summary available yet. Re-run CIM processing to generate an investment memo.'
            : sourceType === 'off_market'
            ? 'No diligence memo yet. Run Initial Diligence to generate one from the company website.'
            : 'No diligence memo available yet. Run Initial Diligence to generate one.'
        }
      />

      {/* Gut Check */}
      <GutCheck deal={deal} dealId={dealId} />

      {/* On-Market: Platform source badge (listing-specific context) */}
      {sourceType === 'on_market' && (deal.external_source || deal.listing_url) && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h4 className="text-sm font-semibold text-slate-400 mb-2">Listing Source</h4>
          <p className="text-sm text-slate-300">
            {deal.external_source ||
              (typeof deal.listing_url === 'string'
                ? (() => { try { return new URL(deal.listing_url).hostname; } catch { return '—'; } })()
                : '—')}
          </p>
        </div>
      )}

      {/* Red Flags & QoE — single merged section */}
      <div className="bg-slate-800 border-2 border-red-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-50">
            {sourceType === 'financials' ? 'Quantitative Risk & QoE' : 'Red Flags & QoE'}
          </h3>
        </div>
        <div className="space-y-8">
          <RedFlagsPanel
            redFlags={redFlags}
            embedded
            showCimCitationHint={sourceType === 'cim_pdf'}
          />
          {/* QoE: Hide for on-market (listing text rarely has structured QoE/addback data) */}
          {sourceType !== 'on_market' && (
            <QoeRedFlagsPanel qoeRedFlags={qoeRedFlags} embedded />
          )}
        </div>
      </div>

      {/* Financial Details */}
      <FinancialSnapshot fin={fin} deal={deal} />

      {/* YoY Trends - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-50">YoY Trends</h3>
          </div>
          {hasAnyAnalysis ? (
            yoy.length === 0 ? (
              <p className="text-sm text-slate-400">No YoY trends returned.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                {yoy.slice(0, 20).map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-slate-400">YoY trends will appear here after you run Financial Analysis.</p>
          )}
        </div>
      )}

      {/* Missing Items - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-slate-400" />
            <h3 className="text-xl font-semibold text-slate-50">Missing / Unclear Items</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
              {missingItems.length}
            </span>
          </div>
          {hasAnyAnalysis ? (
            missingItems.length === 0 ? (
              <p className="text-sm text-slate-400">Nothing flagged as missing or unclear.</p>
            ) : (
              <ul className="space-y-2">
                {missingItems.map((x, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{x}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-slate-400">Missing or unclear items will populate here after you run Financial Analysis.</p>
          )}
        </div>
      )}

      {/* Owner Interview Questions */}
      <OwnerInterviewQuestions questions={ownerQuestions} />

      {/* Key Metrics Table - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-slate-400 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-50">Key Metrics</h3>
          </div>
          {!hasAnyAnalysis ? (
            <p className="text-sm text-slate-400">Key metrics will populate here after you run Financial Analysis.</p>
          ) : allYears.length === 0 ? (
            <p className="text-sm text-slate-400">No structured metrics extracted.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-300 sticky left-0 bg-slate-900/50 z-10">Metric</th>
                      {allYears.map((y) => (
                        <th key={y} className="px-3 py-2 font-semibold text-slate-300 whitespace-nowrap">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-50">Revenue</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-300">
                          {formatMoney(yearToRevenue.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-50">EBITDA</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-300">
                          {formatMoney(yearToEbitda.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-50">Net Income</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-300">
                          {formatMoney(yearToNet.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    {marginTypes.map((mt) => {
                      const map = marginsByTypeYear.get(mt);
                      return (
                        <tr key={mt}>
                          <td className="px-3 py-2 font-medium text-slate-50">{mt}</td>
                          {allYears.map((y) => (
                            <td key={y} className="px-3 py-2 text-slate-300">
                              {formatPct(map?.get(y)?.value_pct ?? null)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Owner Signals - Only for off-market deals */}
      {sourceType === 'off_market' && (() => {
        const criteriaAny = criteria as Record<string, unknown> | null;
        const ownerSignals = criteriaAny?.owner_signals as {
          likely_owner_operated?: boolean;
          owner_named_on_site?: boolean;
          owner_name?: string;
          generation_hint?: string;
          owner_dependency_risk?: string;
          years_in_business?: string;
          evidence?: string[];
          missing_info?: string[];
          confidence?: number;
        } | null | undefined;

        const confidenceTier = ownerSignals && typeof ownerSignals.confidence === 'number'
          ? (ownerSignals.confidence >= 0.7 ? 'A' : ownerSignals.confidence >= 0.4 ? 'B' : 'C')
          : null;

        if (!ownerSignals) return null;

        return (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-slate-400" />
              <h3 className="text-xl font-semibold text-slate-50">Owner Signals (Probabilistic)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Likely owner-operated</p>
                <p className="font-medium text-slate-50">
                  {ownerSignals.likely_owner_operated ? 'Yes' : 'No'}
                  {confidenceTier && (
                    <span className="ml-2">
                      <ConfidenceBadge level={confidenceTier} analyzed={true} size="small" />
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Owner named on site</p>
                <p className="font-medium text-slate-50">
                  {ownerSignals.owner_named_on_site ? 'Yes' : 'No'}
                  {ownerSignals.owner_named_on_site && ownerSignals.owner_name && (
                    <span className="text-xs text-slate-400"> — {ownerSignals.owner_name}</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Generation hint</p>
                <p className="font-medium text-slate-50">{ownerSignals.generation_hint || 'unknown'}</p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400 mb-1">Key-person dependency risk</p>
                <p className="font-medium text-slate-50">{ownerSignals.owner_dependency_risk || 'Unknown'}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-slate-400 mb-1">Years in business</p>
                <p className="font-medium text-slate-50">{ownerSignals.years_in_business || 'Unknown'}</p>
              </div>
            </div>

            {Array.isArray(ownerSignals.evidence) && ownerSignals.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-slate-400 mb-2">Evidence</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {ownerSignals.evidence.slice(0, 6).map((e: string, idx: number) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(ownerSignals.missing_info) && ownerSignals.missing_info.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-slate-400 mb-2">Missing info</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-300">
                  {ownerSignals.missing_info.slice(0, 6).map((m: string, idx: number) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
