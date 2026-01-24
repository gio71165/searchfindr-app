'use client';

import { useMemo } from 'react';
import { ExecutiveSummaryCard } from '@/app/deals/[id]/components/ExecutiveSummaryCard';
import { RedFlagsPanel } from '@/app/deals/[id]/components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '@/app/deals/[id]/components/QoeRedFlagsPanel';
import { StrengthsPanel } from '@/app/deals/[id]/components/StrengthsPanel';
import { AIInvestmentMemo } from '@/app/deals/[id]/components/AIInvestmentMemo';
import { FinancialSnapshot } from '@/app/deals/[id]/components/FinancialSnapshot';
import { OwnerInterviewQuestions } from '@/app/deals/[id]/components/OwnerInterviewQuestions';
import { RiskSignalsCard } from '@/app/deals/[id]/components/RiskSignalsCard';
import { SearcherSnapshot } from '@/app/deals/[id]/components/SearcherSnapshot';
import { ConfidencePill } from '@/app/deals/[id]/components/ConfidencePill';
import { SignalsGrid } from '@/app/deals/[id]/components/SignalsGrid';
import { getDealConfidence } from '@/app/deals/[id]/lib/confidence';
import { normalizeRedFlags, normalizeConfidenceSignals, normalizeStringArray, normalizeMetricRows, normalizeMarginRows } from '@/app/deals/[id]/lib/normalizers';
import { safeDateLabel, formatMoney, formatPct, sortYearsLikeHuman } from '@/app/deals/[id]/lib/formatters';
import type { Deal, FinancialMetrics, FinancialAnalysis } from '@/lib/types/deal';
import { CheckCircle2, FileCheck, BarChart3, TrendingUp, User, AlertTriangle } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { JargonTooltip } from '@/components/ui/JargonTooltip';
import { GutCheck } from '@/components/deal/GutCheck';
import type { MarginRow } from '@/app/deals/[id]/lib/types';

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
    : (fin.qoe_red_flags || []);
  
  const ownerQuestions = sourceType === 'financials' && financialAnalysis
    ? (financialAnalysis.extracted_metrics?.owner_interview_questions || [])
    : (fin.owner_interview_questions || []);
  
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};

  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });

  const signals = useMemo(() => {
    if (sourceType === 'financials' && financialAnalysis?.confidence_json?.signals) {
      return normalizeConfidenceSignals(financialAnalysis.confidence_json.signals);
    }
    return normalizeConfidenceSignals(deal?.ai_confidence_json?.signals ?? null);
  }, [deal?.ai_confidence_json?.signals, financialAnalysis?.confidence_json?.signals, sourceType]);

  // Financials-specific data extraction
  const extracted = financialAnalysis?.extracted_metrics ?? null;
  const yoy = normalizeStringArray(extracted?.yoy_trends);
  const greenFlags = sourceType === 'financials' && financialAnalysis
    ? normalizeStringArray(financialAnalysis.green_flags)
    : [];
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
            ? 'border-slate-200 bg-slate-50' 
            : 'border-blue-300 bg-blue-50'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {hasCimAnalysis ? 'CIM Processing' : 'Run AI Analysis'}
              </h2>
              <p className="text-sm text-slate-600 mb-3">
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
                  ? 'border border-slate-300 bg-white hover:bg-slate-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {hasCimAnalysis ? 'Re-run Analysis' : 'Run AI Analysis'}
            </AsyncButton>
          </div>
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

      {/* Gut Check */}
      <GutCheck deal={deal} dealId={dealId} />

      {/* QoE Red Flags */}
      <QoeRedFlagsPanel qoeRedFlags={qoeRedFlags} />

      {/* Red Flags */}
      <RedFlagsPanel redFlags={redFlags} />

      {/* Strengths */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 border-l-4 border-l-emerald-500 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="text-xl font-semibold text-slate-900">
            {sourceType === 'financials' ? 'Strengths (Green Flags)' : 'Strengths'}
          </h3>
          {sourceType === 'financials' && greenFlags.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
              {greenFlags.length}
            </span>
          )}
        </div>
        {sourceType === 'financials' && greenFlags.length > 0 ? (
          hasAnyAnalysis ? (
            <ul className="space-y-2">
              {greenFlags.map((x, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{x}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-600">Green flags will populate here after you run Financial Analysis.</p>
          )
        ) : (
          <StrengthsPanel deal={deal} />
        )}
      </div>

      {/* Data Confidence */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-900 text-lg mb-3">Data Confidence & Read Quality</h3>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <ConfidencePill
                icon={confidence.icon}
                label={confidence.label}
                title={confidence.reason}
                analyzed={confidence.analyzed}
                level={confidence.level}
              />
              {deal?.ai_confidence_json?.updated_at && (
                <span className="text-xs text-emerald-700">
                  Updated {safeDateLabel(deal.ai_confidence_json.updated_at) || ''}
                </span>
              )}
            </div>
            {confidence.analyzed ? (
              signals.length === 0 ? (
                <p className="text-sm text-emerald-700">No confidence signals returned.</p>
              ) : (
                <SignalsGrid signals={signals} />
              )
            ) : (
              <p className="text-sm text-emerald-700">Run AI analysis to generate read-quality signals.</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Investment Memo */}
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

      {/* Financial Details */}
      <FinancialSnapshot fin={fin} deal={deal} />

      {/* YoY Trends - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-900">YoY Trends</h3>
          </div>
          {hasAnyAnalysis ? (
            yoy.length === 0 ? (
              <p className="text-sm text-slate-600">No YoY trends returned.</p>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                {yoy.slice(0, 20).map((t: string, idx: number) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-slate-600">YoY trends will appear here after you run Financial Analysis.</p>
          )}
        </div>
      )}

      {/* Missing Items - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-slate-600" />
            <h3 className="text-xl font-semibold text-slate-900">Missing / Unclear Items</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {missingItems.length}
            </span>
          </div>
          {hasAnyAnalysis ? (
            missingItems.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing flagged as missing or unclear.</p>
            ) : (
              <ul className="space-y-2">
                {missingItems.map((x, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{x}</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <p className="text-sm text-slate-600">Missing or unclear items will populate here after you run Financial Analysis.</p>
          )}
        </div>
      )}

      {/* Owner Interview Questions */}
      <OwnerInterviewQuestions questions={ownerQuestions} />

      {/* Scoring Breakdown - Not for financials */}
      {sourceType !== 'financials' && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-lg mb-3">
                {sourceType === 'cim_pdf' ? (
                  <>
                    <JargonTooltip term="CIM">CIM</JargonTooltip> Quality & Risk Signals
                  </>
                ) : (
                  'Scoring Breakdown'
                )}
              </h3>
              <RiskSignalsCard
                scoring={scoring}
                title=""
                subtitle={
                  sourceType === 'cim_pdf'
                    ? 'Interpretation aids from CIM content (not a grade). Risk signals: High = more risk. Quality signals: High = stronger quality. No Tier is produced for CIM uploads.'
                    : 'Prioritization signals (not a recommendation). Risk signals: High = more risk. Fit/quality signals: High = stronger alignment/quality.'
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Table - Financials only */}
      {sourceType === 'financials' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-slate-600 flex-shrink-0" />
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900">Key Metrics</h3>
          </div>
          {!hasAnyAnalysis ? (
            <p className="text-sm text-slate-600">Key metrics will populate here after you run Financial Analysis.</p>
          ) : allYears.length === 0 ? (
            <p className="text-sm text-slate-600">No structured metrics extracted.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">Metric</th>
                      {allYears.map((y) => (
                        <th key={y} className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-900">Revenue</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-700">
                          {formatMoney(yearToRevenue.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-900">EBITDA</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-700">
                          {formatMoney(yearToEbitda.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    <tr>
                      <td className="px-3 py-2 font-medium text-slate-900">Net Income</td>
                      {allYears.map((y) => (
                        <td key={y} className="px-3 py-2 text-slate-700">
                          {formatMoney(yearToNet.get(y)?.value ?? null)}
                        </td>
                      ))}
                    </tr>

                    {marginTypes.map((mt) => {
                      const map = marginsByTypeYear.get(mt);
                      return (
                        <tr key={mt}>
                          <td className="px-3 py-2 font-medium text-slate-900">{mt}</td>
                          {allYears.map((y) => (
                            <td key={y} className="px-3 py-2 text-slate-700">
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

      {/* Searcher Fit Analysis - TODO: Evaluate if still useful, may remove if no value */}
      {sourceType !== 'financials' && (
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-emerald-900 text-lg mb-3">Searcher Fit Analysis</h3>
              <SearcherSnapshot criteria={criteria} />
            </div>
          </div>
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
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-slate-600" />
              <h3 className="text-xl font-semibold text-slate-900">Owner Signals (Probabilistic)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Likely owner-operated</p>
                <p className="font-medium text-slate-900">
                  {ownerSignals.likely_owner_operated ? 'Yes' : 'No'}
                  {confidenceTier && (
                    <span className="ml-2">
                      <ConfidenceBadge level={confidenceTier} analyzed={true} size="small" />
                    </span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Owner named on site</p>
                <p className="font-medium text-slate-900">
                  {ownerSignals.owner_named_on_site ? 'Yes' : 'No'}
                  {ownerSignals.owner_named_on_site && ownerSignals.owner_name && (
                    <span className="text-xs text-slate-600"> — {ownerSignals.owner_name}</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Generation hint</p>
                <p className="font-medium text-slate-900">{ownerSignals.generation_hint || 'unknown'}</p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-600 mb-1">Key-person dependency risk</p>
                <p className="font-medium text-slate-900">{ownerSignals.owner_dependency_risk || 'Unknown'}</p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-slate-600 mb-1">Years in business</p>
                <p className="font-medium text-slate-900">{ownerSignals.years_in_business || 'Unknown'}</p>
              </div>
            </div>

            {Array.isArray(ownerSignals.evidence) && ownerSignals.evidence.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-slate-600 mb-2">Evidence</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {ownerSignals.evidence.slice(0, 6).map((e: string, idx: number) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(ownerSignals.missing_info) && ownerSignals.missing_info.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-slate-600 mb-2">Missing info</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
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
