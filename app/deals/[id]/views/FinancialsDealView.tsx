'use client';

import { useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { ExecutiveSummaryCard } from '../components/ExecutiveSummaryCard';
import { DealChatPanel } from '../components/DealChatPanel';
import { ConfidencePill } from '../components/ConfidencePill';
import { SignalsGrid } from '../components/SignalsGrid';
import { RedFlagsPanel } from '../components/RedFlagsPanel';
import { QoeRedFlagsPanel } from '../components/QoeRedFlagsPanel';
import { StrengthsPanel } from '../components/StrengthsPanel';
import { OwnerInterviewQuestions } from '../components/OwnerInterviewQuestions';
import { DiligenceChecklist } from '../components/DiligenceChecklist';
import { BackButton } from '../components/BackButton';
import { getDealConfidence } from '../lib/confidence';
import { normalizeStringArray, normalizeMetricRows, normalizeMarginRows, normalizeConfidenceSignals } from '../lib/normalizers';
import { sortYearsLikeHuman, formatMoney, formatPct } from '../lib/formatters';
import type { MarginRow } from '../lib/types';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';
import { CheckCircle2, AlertTriangle, FileCheck, BarChart3, TrendingUp } from 'lucide-react';
import { PassDealModal } from '@/components/modals/PassDealModal';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { showToast } from '@/components/ui/Toast';

export function FinancialsDealView({
  deal,
  dealId,
  onBack,
  loadingAnalysis,
  running,
  analysis,
  error,
  onRun,
  onRefresh,
}: {
  deal: Deal;
  dealId: string;
  onBack: () => void;
  loadingAnalysis: boolean;
  running: boolean;
  analysis: FinancialAnalysis | null;
  error: string | null;
  onRun: () => void;
  onRefresh?: () => void;
}) {
  const confidence = getDealConfidence(deal, { financialAnalysis: analysis });

  const redFlags = normalizeStringArray(analysis?.red_flags);
  const greenFlags = normalizeStringArray(analysis?.green_flags);
  const missingItems = normalizeStringArray(analysis?.missing_items);
  const diligenceNotes = normalizeStringArray(analysis?.diligence_notes);
  const qoeRedFlags = analysis?.qoe_red_flags || [];
  const ownerQuestions = analysis?.extracted_metrics?.owner_interview_questions || [];

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

  const [showPassModal, setShowPassModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [settingVerdict, setSettingVerdict] = useState(false);

  const handlePassSuccess = () => {
    setShowPassModal(false);
    window.location.href = '/dashboard';
  };

  const handleRequestInfo = () => {
    alert('Coming soon');
  };

  const handleProceed = async () => {
    setSettingVerdict(true);
    try {
      // Use getSession() for better performance - faster than getUser()
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not signed in');
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
      if (!profile?.workspace_id) throw new Error('No workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'proceed',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;
      showToast('Marked as Proceed', 'success', 2000);
      onRefresh?.();
    } catch (error) {
      console.error('Error setting proceed:', error);
      showToast('Failed to set verdict. Please try again.', 'error');
    } finally {
      setSettingVerdict(false);
    }
  };

  const handlePark = async () => {
    setSettingVerdict(true);
    try {
      // Use getSession() for better performance - faster than getUser()
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not signed in');
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('id', user.id).single();
      if (!profile?.workspace_id) throw new Error('No workspace');

      const { error } = await supabase
        .from('companies')
        .update({ 
          verdict: 'park',
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;
      showToast('Marked as Park', 'info', 2000);
      onRefresh?.();
    } catch (error) {
      console.error('Error setting park:', error);
      showToast('Failed to set verdict. Please try again.', 'error');
    } finally {
      setSettingVerdict(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      createShortcut('P', () => {
        if (!settingVerdict) {
          handleProceed();
        }
      }, 'Mark as Proceed', ['deal-detail']),
      createShortcut('K', () => {
        if (!settingVerdict) {
          handlePark();
        }
      }, 'Mark as Park', ['deal-detail']),
      createShortcut('X', () => {
        if (!settingVerdict) {
          setShowPassModal(true);
          showToast('Opening pass modal', 'info', 1500);
        }
      }, 'Open Pass modal', ['deal-detail']),
      createShortcut('?', () => {
        setShowShortcutsModal(true);
      }, 'Show keyboard shortcuts', ['global', 'deal-detail']),
    ],
    true
  );

  return (
    <main className="min-h-screen bg-[#F9FAFB] overflow-x-hidden">
      <div className="max-w-7xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6">
        <BackButton dealSourceType={deal.source_type} />
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content */}
          <div className="flex-1 lg:pr-6 space-y-6 sm:space-y-8 min-w-0">
            {/* Executive Summary Card */}
            <ExecutiveSummaryCard
              deal={deal}
              onProceed={handleProceed}
              onPark={handlePark}
              onPass={() => setShowPassModal(true)}
              onRequestInfo={handleRequestInfo}
              settingVerdict={settingVerdict}
              financialAnalysis={analysis}
            />

            {/* Financial Analysis Run Strip */}
            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">Financial Analysis</h2>
                  <p className="text-xs text-slate-600">
                    Runs AI on the uploaded financials attached to this deal. Skeptical read on earnings quality, missing items, and risk signals.
                  </p>
                </div>
                <button
                  onClick={onRun}
                  disabled={running}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
                >
                  {running ? 'Running…' : analysis ? 'Re-run Financial Analysis' : 'Run Financial Analysis'}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              {showLoadingLine && <p className="text-sm mt-3 text-slate-600">Loading analysis…</p>}
              {!hasAnyAnalysis && (
                <p className="text-sm mt-3 text-slate-600">
                  No analysis yet. Click "Run Financial Analysis" to generate outputs and populate sections below.
                </p>
              )}
            </section>

            {/* QoE Red Flags - Before regular red flags */}
            <QoeRedFlagsPanel qoeRedFlags={qoeRedFlags} />

            {/* Red Flags */}
            <RedFlagsPanel redFlags={redFlags} />

            {/* Strengths (Green Flags) */}
            <div className="rounded-lg border border-green-200 bg-green-50 border-l-4 border-l-green-500 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="text-xl font-semibold text-slate-900">Strengths (Green Flags)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  {greenFlags.length}
                </span>
              </div>
              {hasAnyAnalysis ? (
                greenFlags.length === 0 ? (
                  <p className="text-sm text-slate-600">No green flags returned.</p>
                ) : (
                  <ul className="space-y-2">
                    {greenFlags.map((x, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{x}</span>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="text-sm text-slate-600">Green flags will populate here after you run Financial Analysis.</p>
              )}
            </div>

            {/* Data Confidence */}
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileCheck className="h-5 w-5 text-slate-600" />
                <h3 className="text-xl font-semibold text-slate-900">Data Confidence & Read Quality</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
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
                  <p className="text-sm text-slate-600">No confidence signals returned.</p>
                ) : (
                  <SignalsGrid signals={signals} />
                )
              ) : (
                <p className="text-sm text-slate-600">Run Financial Analysis to generate read-quality signals.</p>
              )}
            </div>

            {/* YoY Trends */}
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

            {/* Missing Items */}
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

            {/* Owner Interview Questions */}
            <OwnerInterviewQuestions questions={ownerQuestions} />

            {/* Due Diligence Checklist */}
            <DiligenceChecklist items={diligenceNotes} dealId={dealId} emptyText="No diligence checklist items returned." />

            {/* Key Metrics */}
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

            <div className="pt-2 text-xs text-slate-500">
              SearchFindr surfaces prioritization signals. Final judgment remains with the buyer.
            </div>
          </div>

          {/* Chat Sidebar */}
          <DealChatPanel dealId={dealId} deal={deal} />
        </div>
      </div>
      
      {showPassModal && (
        <PassDealModal
          dealId={dealId}
          companyName={deal.company_name || 'this deal'}
          workspaceId={deal.workspace_id}
          onClose={() => setShowPassModal(false)}
          onSuccess={handlePassSuccess}
        />
      )}

      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        currentContext="deal-detail"
      />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setShowShortcutsModal(true)}
          className="text-xs text-slate-500 hover:text-slate-700 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors"
          aria-label="Show keyboard shortcuts"
        >
          Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs">?</kbd> for shortcuts
        </button>
      </div>
    </main>
  );
}
