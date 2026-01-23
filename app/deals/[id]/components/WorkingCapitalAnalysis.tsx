'use client';

import { useState } from 'react';
import { DollarSign, Loader2, AlertTriangle, Copy, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import type { Deal } from '@/lib/types/deal';
import type { WorkingCapitalInputs, WorkingCapitalOutputs } from '@/lib/utils/working-capital';
import { showToast } from '@/components/ui/Toast';
import { JargonTooltip } from '@/components/ui/JargonTooltip';
import { supabase } from '@/app/supabaseClient';

export function WorkingCapitalAnalysis({ deal }: { deal: Deal | null }) {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WorkingCapitalOutputs | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Input state
  const [inputs, setInputs] = useState<Partial<WorkingCapitalInputs>>({
    accountsReceivable: 0,
    inventory: 0,
    prepaidExpenses: 0,
    accountsPayable: 0,
    accruedExpenses: 0,
    annualRevenue: 0,
    industry: deal?.industry || '',
  });

  // Try to extract revenue from deal data
  const fin = deal?.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  const revenueValue = fin.revenue || finAny.ttm_revenue || finAny.revenue_ttm || finAny.latest_revenue;
  const estimatedRevenue = Array.isArray(revenueValue) && revenueValue.length > 0
    ? parseFloat(String(revenueValue[revenueValue.length - 1]?.value || 0).replace(/[^0-9.]/g, ''))
    : typeof revenueValue === 'number' 
      ? revenueValue 
      : typeof revenueValue === 'string'
        ? parseFloat(revenueValue.replace(/[^0-9.]/g, '')) || 0
        : 0;

  const handleCalculate = async () => {
    if (!inputs.annualRevenue || inputs.annualRevenue <= 0) {
      setError('Annual revenue is required');
      return;
    }

    if (!inputs.industry || inputs.industry.trim() === '') {
      setError('Industry is required');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      // Get authentication token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        throw new Error('Not signed in. Please log in and try again.');
      }

      const res = await fetch('/api/calculate-working-capital', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inputs as WorkingCapitalInputs),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Calculation failed' }));
        throw new Error(errorData.error || 'Calculation failed');
      }

      const data = await res.json();
      setResult(data.outputs);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error.message || 'Failed to calculate');
    } finally {
      setCalculating(false);
    }
  };

  const handleCopyToLOI = () => {
    if (!result) return;

    const loiText = `Working Capital Adjustment:
- Normalized Working Capital: $${result.normalizedWorkingCapital.toLocaleString()}
- Current Working Capital: $${result.currentWorkingCapital.toLocaleString()}
- Estimated Adjustment: $${Math.abs(result.estimatedWCAdjustment).toLocaleString()} (${
      result.adjustmentDirection === 'buyer_debit' 
        ? 'buyer owes seller' 
        : result.adjustmentDirection === 'buyer_credit'
          ? 'seller owes buyer'
          : 'neutral'
    })
- Subject to true-up at close based on actual balance sheet`;

    navigator.clipboard.writeText(loiText).then(() => {
      setCopied(true);
      showToast('Copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate current WC breakdown for visualization
  const currentAssets = (inputs.accountsReceivable || 0) + (inputs.inventory || 0) + (inputs.prepaidExpenses || 0);
  const currentLiabilities = (inputs.accountsPayable || 0) + (inputs.accruedExpenses || 0);
  const currentWC = currentAssets - currentLiabilities;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-900">
          <JargonTooltip term="Working Capital">Working Capital</JargonTooltip> Analysis
        </h3>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Accounts Receivable ($)
          </label>
          <input
            type="number"
            value={inputs.accountsReceivable || ''}
            onChange={(e) => setInputs({ ...inputs, accountsReceivable: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Inventory ($)
          </label>
          <input
            type="number"
            value={inputs.inventory || ''}
            onChange={(e) => setInputs({ ...inputs, inventory: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Prepaid Expenses ($)
          </label>
          <input
            type="number"
            value={inputs.prepaidExpenses || ''}
            onChange={(e) => setInputs({ ...inputs, prepaidExpenses: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Accounts Payable ($)
          </label>
          <input
            type="number"
            value={inputs.accountsPayable || ''}
            onChange={(e) => setInputs({ ...inputs, accountsPayable: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Accrued Expenses ($)
          </label>
          <input
            type="number"
            value={inputs.accruedExpenses || ''}
            onChange={(e) => setInputs({ ...inputs, accruedExpenses: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Annual Revenue ($)
          </label>
          <input
            type="number"
            value={inputs.annualRevenue || ''}
            onChange={(e) => setInputs({ ...inputs, annualRevenue: parseFloat(e.target.value) || 0 })}
            placeholder={estimatedRevenue > 0 ? estimatedRevenue.toLocaleString() : 'Enter annual revenue'}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Industry
          </label>
          <input
            type="text"
            value={inputs.industry || ''}
            onChange={(e) => setInputs({ ...inputs, industry: e.target.value })}
            placeholder={deal?.industry || 'Enter industry'}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={calculating || !inputs.annualRevenue || !inputs.industry}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
      >
        {calculating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculating...</span>
          </>
        ) : (
          <>
            <DollarSign className="h-4 w-4" />
            <span>Calculate Working Capital</span>
          </>
        )}
      </button>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current WC Breakdown Visualization */}
      {!result && (currentAssets > 0 || currentLiabilities > 0) && (
        <div className="mb-4 p-4 rounded-lg bg-white border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Current Working Capital Breakdown</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">Current Assets</span>
                <span className="font-semibold text-slate-900">{formatCurrency(currentAssets)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 pl-2">
                <div>AR: {formatCurrency(inputs.accountsReceivable || 0)}</div>
                <div>Inventory: {formatCurrency(inputs.inventory || 0)}</div>
                <div>Prepaid: {formatCurrency(inputs.prepaidExpenses || 0)}</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600 font-medium">Current Liabilities</span>
                <span className="font-semibold text-slate-900">{formatCurrency(currentLiabilities)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pl-2">
                <div>AP: {formatCurrency(inputs.accountsPayable || 0)}</div>
                <div>Accrued: {formatCurrency(inputs.accruedExpenses || 0)}</div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-900">Current WC:</span>
              <span className={`text-lg font-bold ${currentWC >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(currentWC)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-1">Warnings</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-red-700">{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Current vs Target WC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Current Working Capital</p>
              <p className="text-2xl font-semibold text-slate-900 mb-1">
                {formatCurrency(result.currentWorkingCapital)}
              </p>
              <p className="text-xs text-slate-500">
                {result.currentWCAsPercentRevenue.toFixed(1)}% of revenue
              </p>
            </div>

            <div className="p-4 rounded-lg bg-white border border-slate-200">
              <p className="text-xs text-slate-600 mb-1">Target Working Capital</p>
              <p className="text-2xl font-semibold text-slate-900 mb-1">
                {formatCurrency(result.normalizedWorkingCapital)}
              </p>
              <p className="text-xs text-slate-500">
                {result.targetWCAsPercentRevenue.toFixed(1)}% of revenue
              </p>
            </div>
          </div>

          {/* Adjustment */}
          <div className={`p-4 rounded-lg border-2 ${
            result.adjustmentDirection === 'buyer_debit' 
              ? 'bg-blue-50 border-blue-300'
              : result.adjustmentDirection === 'buyer_credit'
                ? 'bg-orange-50 border-orange-300'
                : 'bg-slate-50 border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {result.adjustmentDirection === 'buyer_debit' ? (
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                ) : result.adjustmentDirection === 'buyer_credit' ? (
                  <TrendingDown className="h-5 w-5 text-orange-600" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-slate-600" />
                )}
                <h4 className="font-semibold text-slate-900">Estimated Adjustment at Close</h4>
              </div>
            </div>
            <p className="text-2xl font-bold mb-2">
              {formatCurrency(Math.abs(result.estimatedWCAdjustment))}
            </p>
            <p className="text-sm text-slate-700">
              {result.adjustmentDirection === 'buyer_debit' 
                ? 'Buyer owes seller (WC above target)'
                : result.adjustmentDirection === 'buyer_credit'
                  ? 'Seller owes buyer (WC below target)'
                  : 'No significant adjustment needed'}
            </p>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-100 border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2">Recommendations</h4>
              <ul className="list-disc list-inside space-y-1">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-slate-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Copy to LOI Button */}
          <button
            onClick={handleCopyToLOI}
            className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy to LOI Notes</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
