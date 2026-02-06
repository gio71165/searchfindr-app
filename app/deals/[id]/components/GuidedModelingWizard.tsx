'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, DollarSign, TrendingUp, Percent, FileSpreadsheet } from 'lucide-react';
import type { Deal } from '@/lib/types/deal';

type StepId = 'revenue' | 'costs' | 'financing' | 'summary';

const STEPS: { id: StepId; label: string; icon: React.ReactNode }[] = [
  { id: 'revenue', label: 'Revenue & metrics', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'costs', label: 'Cost structure', icon: <Percent className="h-4 w-4" /> },
  { id: 'financing', label: 'Financing', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'summary', label: 'Summary', icon: <FileSpreadsheet className="h-4 w-4" /> },
];

interface WizardState {
  revenue: number;
  revenueGrowthPct: number;
  ebitdaMarginPct: number;
  cogsPct: number;
  opexPct: number;
  purchasePrice: number;
  downPaymentPct: number;
  interestRate: number;
  loanTermYears: number;
}

const defaultState: WizardState = {
  revenue: 0,
  revenueGrowthPct: 5,
  ebitdaMarginPct: 15,
  cogsPct: 60,
  opexPct: 25,
  purchasePrice: 0,
  downPaymentPct: 10,
  interestRate: 8,
  loanTermYears: 10,
};

function parseDealNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export function GuidedModelingWizard({ deal }: { deal: Deal | null }) {
  const [currentStep, setCurrentStep] = useState<StepId>('revenue');
  const [state, setState] = useState<WizardState>(defaultState);
  const [started, setStarted] = useState(false);

  // Pre-populate from deal / AI-extracted data
  useEffect(() => {
    if (!deal) return;

    const fin = (deal.ai_financials_json || {}) as Record<string, unknown>;
    const criteria = (deal.criteria_match_json || {}) as Record<string, unknown>;
    const price =
      parseDealNumber(fin.estimated_purchase_price ?? fin.purchase_price) ||
      parseDealNumber(deal.asking_price_extracted) ||
      parseDealNumber(criteria.asking_price);
    const ebitda =
      parseDealNumber(deal.ebitda_ttm_extracted) ||
      parseDealNumber(criteria.ebitda_ttm) ||
      parseDealNumber(fin.ebitda ?? fin.ttm_ebitda ?? fin.ebitda_ttm);

    setState(prev => ({
      ...prev,
      ...(price > 0 && { purchasePrice: price }),
      ...(ebitda > 0 && prev.revenue <= 0 && {
        ebitdaMarginPct: prev.revenue > 0 ? Math.min(99, (ebitda / prev.revenue) * 100) : 15,
      }),
    }));
  }, [deal]);

  const stepIndex = STEPS.findIndex(s => s.id === currentStep);
  const canNext = stepIndex >= 0 && stepIndex < STEPS.length - 1;
  const canPrev = stepIndex > 0;

  const ebitdaEst = (state.revenue * state.ebitdaMarginPct) / 100;
  const loanAmount = state.purchasePrice * (1 - state.downPaymentPct / 100);
  const monthlyRate = state.interestRate / 100 / 12;
  const numPayments = state.loanTermYears * 12;
  const monthlyPayment =
    monthlyRate > 0 && numPayments > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : 0;
  const annualDebtService = monthlyPayment * 12;
  const dscr = annualDebtService > 0 ? ebitdaEst / annualDebtService : 0;

  if (!started) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-50">Guided financial model</h3>
            <p className="mt-1 text-sm text-slate-400">
              Walk through revenue assumptions, cost structure, and financing to build a simple model and see key outputs (DSCR, payback).
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Start guided model
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      {/* Step tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {STEPS.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setCurrentStep(step.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              currentStep === step.id
                ? 'border-emerald-500 text-emerald-400 bg-slate-800'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {step.icon}
            {step.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {currentStep === 'revenue' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Revenue & key metrics</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Annual revenue ($)</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={state.revenue || ''}
                  onChange={e => setState(s => ({ ...s, revenue: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Revenue growth (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={state.revenueGrowthPct}
                  onChange={e => setState(s => ({ ...s, revenueGrowthPct: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">EBITDA margin (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={state.ebitdaMarginPct}
                  onChange={e => setState(s => ({ ...s, ebitdaMarginPct: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
            </div>
            {state.revenue > 0 && (
              <p className="text-sm text-slate-400">
                Estimated EBITDA: <span className="font-semibold text-slate-200">${(state.revenue * state.ebitdaMarginPct / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </p>
            )}
          </div>
        )}

        {currentStep === 'costs' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Cost structure</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">COGS % of revenue</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.cogsPct}
                  onChange={e => setState(s => ({ ...s, cogsPct: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">OpEx % of revenue</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.opexPct}
                  onChange={e => setState(s => ({ ...s, opexPct: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              EBITDA margin is already set in Revenue. Adjust COGS/OpEx for internal consistency if needed.
            </p>
          </div>
        )}

        {currentStep === 'financing' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Financing assumptions</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Purchase price ($)</label>
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={state.purchasePrice || ''}
                  onChange={e => setState(s => ({ ...s, purchasePrice: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Down payment (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.downPaymentPct}
                  onChange={e => setState(s => ({ ...s, downPaymentPct: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Interest rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={0.25}
                  value={state.interestRate}
                  onChange={e => setState(s => ({ ...s, interestRate: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Loan term (years)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={state.loanTermYears}
                  onChange={e => setState(s => ({ ...s, loanTermYears: parseDealNumber(e.target.value) }))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-slate-50"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 'summary' && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">Model summary</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs text-slate-500">Estimated EBITDA</p>
                <p className="text-lg font-semibold text-slate-50">${ebitdaEst.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs text-slate-500">Loan amount</p>
                <p className="text-lg font-semibold text-slate-50">${loanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs text-slate-500">Monthly debt service</p>
                <p className="text-lg font-semibold text-slate-50">${monthlyPayment.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs text-slate-500">DSCR</p>
                <p className={`text-lg font-semibold ${dscr >= 1.25 ? 'text-emerald-400' : dscr >= 1 ? 'text-amber-400' : 'text-red-400'}`}>
                  {dscr > 0 ? dscr.toFixed(2) : '—'}
                </p>
              </div>
            </div>
            {dscr > 0 && dscr < 1.25 && (
              <p className="text-sm text-slate-400">
                Many lenders require DSCR ≥ 1.25. Consider a higher down payment or lower purchase price.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-700 pt-4">
          <button
            type="button"
            onClick={() => setCurrentStep(STEPS[stepIndex - 1]?.id ?? 'revenue')}
            disabled={!canPrev}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          {canNext ? (
            <button
              type="button"
              onClick={() => setCurrentStep(STEPS[stepIndex + 1].id)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Next: {STEPS[stepIndex + 1].label}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStarted(false)}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700"
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
