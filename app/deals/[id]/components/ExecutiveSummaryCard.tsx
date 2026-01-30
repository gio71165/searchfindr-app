'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, MapPin, Building2, DollarSign, Circle, ExternalLink, Sparkles } from 'lucide-react';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { formatMoney, formatPct } from '../lib/formatters';
import { normalizeRedFlags } from '../lib/normalizers';
import { getDealConfidence } from '../lib/confidence';
import type { Deal, FinancialAnalysis, ConfidenceJson } from '@/lib/types/deal';

type Verdict = 'strong' | 'caution' | 'pass' | 'not_analyzed';

function getDealVerdict(deal: Deal, redFlags: string[], confidence: { level?: 'A' | 'B' | 'C'; analyzed?: boolean }): Verdict {
  // Not analyzed: separate state from tier confidence
  if (confidence?.analyzed === false) {
    return 'not_analyzed';
  }
  
  const redFlagCount = redFlags.length;
  const confidenceTier = confidence?.level || 'B';
  
  // Pass: C tier (low confidence) OR critical red flags (5+)
  if (confidenceTier === 'C' || redFlagCount >= 5) {
    return 'pass';
  }
  
  // Strong: A tier (high confidence) AND few red flags (0-2)
  if (confidenceTier === 'A' && redFlagCount <= 2) {
    return 'strong';
  }
  
  // Caution: everything else (B tier OR 3-4 red flags)
  return 'caution';
}

export function ExecutiveSummaryCard({
  deal,
  onProceed,
  onPark,
  onPass,
  onRequestInfo,
  settingVerdict,
  financialAnalysis,
  hideVerdictButtons,
}: {
  deal: Deal;
  onProceed: () => void;
  onPark: () => void;
  onPass: () => void;
  onRequestInfo?: () => void; // Optional - button removed but kept for backward compatibility
  settingVerdict: boolean;
  financialAnalysis?: FinancialAnalysis | null;
  hideVerdictButtons?: boolean; // Hide buttons when used in tabs (StickyDealHeader has them)
}) {
  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });
  const verdict = getDealVerdict(deal, redFlags, confidence);
  
  const fin = deal.ai_financials_json || {};
  const finAny = fin as Record<string, unknown>;
  // Try multiple sources for revenue: extracted field, financials JSON, or legacy field
  const revenue = (deal as any).revenue_ttm_extracted ||
                  (typeof finAny.revenue_ttm === 'string' ? finAny.revenue_ttm : null) ||
                  (typeof fin.revenue === 'string' ? fin.revenue : null) ||
                  'Unknown';
  // Try multiple sources for EBITDA: extracted field, financials JSON, or legacy field
  const ebitda = (deal as any).ebitda_ttm_extracted ||
                 (typeof finAny.ebitda_ttm === 'string' ? finAny.ebitda_ttm : null) ||
                 (typeof fin.ebitda === 'string' ? fin.ebitda : null) ||
                 'Unknown';
  const margin = (typeof finAny.ebitda_margin_ttm === 'string' ? finAny.ebitda_margin_ttm : null) ||
                 (typeof fin.margin === 'string' ? fin.margin : null) ||
                 null;
  
  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || 'Unknown';
  const industry = deal.industry || 'Unknown';
  
  // Extract asking price
  const askingPrice = (deal as any).asking_price_extracted || deal.criteria_match_json?.asking_price || null;
  
  // Confidence tier (A/B/C) - no numeric score
  const confidenceTier = confidence.analyzed === false ? null : confidence.level || null;
  
  const verdictConfig = {
    strong: {
      icon: CheckCircle2,
      label: 'Strong Opportunity',
      color: 'green',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
    },
    caution: {
      icon: AlertTriangle,
      label: 'Proceed with Caution',
      color: 'yellow',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
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
  
  // Extract user-set verdict (proceed/park/pass)
  const userVerdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  
  // User verdict badge config
  const userVerdictConfig = {
    proceed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Proceed' },
    park: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Parked' },
    pass: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Passed' }
  };
  
  const userVerdictNormalized = userVerdict ? userVerdict.toLowerCase() : null;
  const userVerdictStyle = userVerdictNormalized ? userVerdictConfig[userVerdictNormalized as keyof typeof userVerdictConfig] : null;
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Sparkles className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">AI Analysis</h3>
          <p className="text-sm text-slate-600">Deal evaluation complete</p>
        </div>
      </div>
      
      {/* Card content */}
      <div className="space-y-6">
        {/* User Verdict Badge - Subtle */}
        {userVerdictStyle && (
          <div className="mb-6 flex justify-end">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${userVerdictStyle.bg} ${userVerdictStyle.text} ${userVerdictStyle.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                userVerdict === 'proceed' ? 'bg-emerald-500' :
                userVerdict === 'park' ? 'bg-blue-500' :
                'bg-slate-400'
              }`} />
              {userVerdictStyle.label}
            </span>
          </div>
        )}
        
        {/* AI Recommendation Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
              <VerdictIcon className={`h-5 w-5 ${config.textColor}`} />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${config.textColor}`}>{config.label}</h2>
              <p className="text-sm text-slate-600 mt-1">
                Based on confidence level and risk assessment
              </p>
            </div>
          </div>
          
          <ConfidenceBadge level={confidence.level || null} analyzed={confidence.analyzed} />
        </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-3 gap-6 pb-6 border-b border-slate-100">
        {askingPrice && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Asking Price</p>
            <p className="text-2xl font-bold font-mono text-slate-900">
              {askingPrice}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500 mb-1">Revenue (TTM)</p>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {typeof revenue === 'string' ? revenue : formatMoney(revenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">EBITDA (TTM)</p>
          <p className="text-2xl font-bold font-mono text-slate-900">
            {typeof ebitda === 'string' ? ebitda : formatMoney(ebitda)}
          </p>
        </div>
      </div>
      
      {margin && margin !== 'Not stated' && (
        <div className="flex items-center justify-between text-sm pb-6 border-b border-slate-100">
          <span className="text-slate-600">EBITDA Margin</span>
          <span className="font-semibold font-mono text-slate-900">{margin}</span>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-slate-500 mb-1">Location</p>
          <p className="text-base font-semibold text-slate-900">{location}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Industry</p>
          <p className="text-base font-semibold text-slate-900">{industry}</p>
        </div>
      </div>
      
      {/* Source Link - View Original Listing/Website */}
      {((deal.source_type === 'on_market' && deal.listing_url) || (deal.source_type === 'off_market' && deal.website)) && (
        <div className="mb-6 pt-4 border-t border-slate-200">
          <a
            href={deal.source_type === 'on_market' ? deal.listing_url! : deal.website!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>{deal.source_type === 'on_market' ? 'View Listing' : 'View Website'}</span>
          </a>
        </div>
      )}
      
      {/* Confidence Tier */}
      {confidenceTier && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Data Confidence</span>
            <ConfidenceBadge level={confidenceTier} analyzed={true} />
          </div>
        </div>
      )}
      
      {/* Primary Actions - Verdict Buttons */}
      {!hideVerdictButtons && (
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200">
          <AsyncButton
            onClick={onProceed}
            isLoading={settingVerdict}
            loadingText="Setting…"
            className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all ${
              userVerdict === 'proceed'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            ✓ Proceed
          </AsyncButton>
          <AsyncButton
            onClick={onPark}
            isLoading={settingVerdict}
            loadingText="Setting…"
            className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all ${
              userVerdict === 'park'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            ⏸ Park
          </AsyncButton>
          <AsyncButton
            onClick={onPass}
            isLoading={settingVerdict}
            className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all ${
              userVerdict === 'pass'
                ? 'border-slate-400 bg-slate-50 text-slate-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            ✕ Pass
          </AsyncButton>
        </div>
      )}
      </div>
    </div>
  );
}
