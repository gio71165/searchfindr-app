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
  const revenue = (typeof fin.revenue === 'string' ? fin.revenue : null) || 'Not stated';
  const ebitda = (typeof fin.ebitda === 'string' ? fin.ebitda : null) || 'Not stated';
  const margin = (typeof fin.margin === 'string' ? fin.margin : null) || 'Not stated';
  
  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || 'Location not specified';
  const industry = deal.industry || 'Industry not specified';
  
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
  
  // Extract user-set verdict (proceed/park/pass)
  const userVerdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  
  // User verdict badge config
  const userVerdictConfig = {
    proceed: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Proceed' },
    park: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', label: 'Parked' },
    pass: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300', label: 'Passed' }
  };
  
  const userVerdictNormalized = userVerdict ? userVerdict.toLowerCase() : null;
  const userVerdictStyle = userVerdictNormalized ? userVerdictConfig[userVerdictNormalized as keyof typeof userVerdictConfig] : null;
  
  return (
    <div className="bg-white rounded-xl border border-purple-200 shadow-sm overflow-hidden mb-6">
      {/* AI Gradient Header */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Analysis</h3>
            <p className="text-purple-100 text-xs">Deal evaluation complete</p>
          </div>
        </div>
      </div>
      
      {/* Card content */}
      <div className={`p-8 ${config.bgColor} rounded-b-xl`}>
        {/* User Verdict Badge - Prominently displayed at top */}
        {userVerdictStyle && (
          <div className="mb-4 flex justify-end">
            <span className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 ${userVerdictStyle.bg} ${userVerdictStyle.text} ${userVerdictStyle.border}`}>
              Status: {userVerdictStyle.label}
            </span>
          </div>
        )}
        
        {/* AI Recommendation Badge */}
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
        {askingPrice && (
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span>Asking Price</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {askingPrice}
            </p>
          </div>
        )}
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
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
          <AsyncButton
            onClick={onProceed}
            isLoading={settingVerdict}
            loadingText="Setting…"
            className="px-6 py-3 font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg hover:shadow-xl"
          >
            Proceed
          </AsyncButton>
          <AsyncButton
            onClick={onPark}
            isLoading={settingVerdict}
            loadingText="Setting…"
            className="px-6 py-3 font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition-all shadow-lg hover:shadow-xl"
          >
            Park
          </AsyncButton>
          <AsyncButton
            onClick={onPass}
            isLoading={settingVerdict}
            className="px-6 py-3 font-semibold rounded-lg border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all shadow-sm hover:shadow-md"
          >
            Pass
          </AsyncButton>
        </div>
      )}
      </div>
    </div>
  );
}
