'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, MapPin, Building2, DollarSign, Circle } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { formatMoney, formatPct } from '../lib/formatters';
import { normalizeRedFlags } from '../lib/normalizers';
import { getDealConfidence } from '../lib/confidence';
import type { Deal, FinancialAnalysis, ConfidenceJson } from '@/lib/types/deal';

type Verdict = 'strong' | 'caution' | 'pass' | 'not_analyzed';

function getDealVerdict(deal: Deal, redFlags: string[], confidence: { level?: string; analyzed?: boolean }): Verdict {
  // Not analyzed: separate state from low/medium/high confidence
  if (confidence?.analyzed === false) {
    return 'not_analyzed';
  }
  
  const redFlagCount = redFlags.length;
  const confidenceLevel = confidence?.level || 'medium';
  
  // Pass: low confidence OR critical red flags (5+)
  if (confidenceLevel === 'low' || redFlagCount >= 5) {
    return 'pass';
  }
  
  // Strong: high confidence AND few red flags (0-2)
  if (confidenceLevel === 'high' && redFlagCount <= 2) {
    return 'strong';
  }
  
  // Caution: everything else (medium confidence OR 3-4 red flags)
  return 'caution';
}

export function ExecutiveSummaryCard({
  deal,
  onSave,
  onPass,
  onRequestInfo,
  savingToggle,
  canToggleSave,
  financialAnalysis,
  passing,
}: {
  deal: Deal;
  onSave: () => void;
  onPass: () => void;
  onRequestInfo?: () => void; // Optional - button removed but kept for backward compatibility
  savingToggle: boolean;
  canToggleSave: boolean;
  financialAnalysis?: FinancialAnalysis | null;
  passing?: boolean;
}) {
  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });
  const verdict = getDealVerdict(deal, redFlags, confidence);
  
  const fin = deal.ai_financials_json || {};
  const revenue = (typeof fin.revenue === 'string' ? fin.revenue : null) || 'Not stated';
  const ebitda = (typeof fin.ebitda === 'string' ? fin.ebitda : null) || 'Not stated';
  const margin = (typeof fin.margin === 'string' ? fin.margin : null) || 'Not stated';
  
  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || 'Location not specified';
  const industry = deal.industry || 'Industry not specified';
  
  // Calculate confidence score (0-100) from level - null if not analyzed
  const confidenceScore = confidence.analyzed === false 
    ? null 
    : confidence.level === 'high' 
      ? 85 
      : confidence.level === 'medium' 
        ? 60 
        : 30;
  
  const verdictConfig = {
    strong: {
      icon: CheckCircle2,
      label: 'Strong Opportunity',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
    },
    caution: {
      icon: AlertTriangle,
      label: 'Proceed with Caution',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
    },
    pass: {
      icon: XCircle,
      label: 'Pass',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
    },
    not_analyzed: {
      icon: Circle,
      label: 'Not Analyzed',
      color: 'gray',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-700',
    },
  };
  
  const config = verdictConfig[verdict];
  const VerdictIcon = config.icon;
  
  return (
    <div className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-8`}>
      {/* Verdict Badge */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${config.bgColor} ${config.borderColor} border`}>
            <VerdictIcon className={`h-6 w-6 ${config.textColor}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${config.textColor}`}>{config.label}</h2>
            <p className="text-sm text-slate-600 mt-1">
              Based on confidence level and risk assessment
            </p>
          </div>
        </div>
        
        <ConfidenceBadge level={confidence.level || null} analyzed={confidence.analyzed} />
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <DollarSign className="h-4 w-4" />
            <span>Revenue</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {typeof revenue === 'string' ? revenue : formatMoney(revenue)}
          </p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>EBITDA</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {typeof ebitda === 'string' ? ebitda : formatMoney(ebitda)}
          </p>
          {margin && margin !== 'Not stated' && (
            <p className="text-sm text-slate-600 mt-1">Margin: {margin}</p>
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <MapPin className="h-4 w-4" />
            <span>Location</span>
          </div>
          <p className="text-lg font-semibold text-slate-900">{location}</p>
        </div>
        
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
            <Building2 className="h-4 w-4" />
            <span>Industry</span>
          </div>
          <p className="text-lg font-semibold text-slate-900">{industry}</p>
        </div>
      </div>
      
      {/* Confidence Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Confidence Score</span>
          <span className="text-sm font-bold text-slate-900">
            {confidenceScore !== null ? `${confidenceScore}/100` : '—'}
          </span>
        </div>
        {confidenceScore !== null ? (
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                confidenceScore >= 70
                  ? 'bg-green-500'
                  : confidenceScore >= 40
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
        ) : (
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div className="h-3 rounded-full bg-slate-400" style={{ width: '0%' }} />
          </div>
        )}
      </div>
      
      {/* Primary Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
        {canToggleSave && (
          <button
            onClick={onSave}
            disabled={savingToggle}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors ${
              deal.is_saved
                ? 'bg-slate-100 text-slate-700
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {savingToggle ? 'Saving…' : deal.is_saved ? '✓ Saved' : 'Save Deal'}
          </button>
        )}
        <button
          onClick={onPass}
          disabled={passing}
          className="px-6 py-2.5 font-medium rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {passing ? 'Passing...' : 'Pass on Deal'}
        </button>
      </div>
    </div>
  );
}
