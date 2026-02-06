'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../lib/formatters';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';

export function StrengthsPanel({ deal, financialAnalysis }: { deal: Deal; financialAnalysis?: FinancialAnalysis | null }) {
  const strengths: string[] = [];
  
  const fin = deal.ai_financials_json || {};
  const scoring = deal.ai_scoring_json || {};
  const criteria = deal.criteria_match_json || {};
  const greenFlags = financialAnalysis?.green_flags || [];
  
  // Add green flags from financial analysis
  if (Array.isArray(greenFlags)) {
    greenFlags.forEach((flag: string) => {
      if (typeof flag === 'string' && flag.trim()) {
        strengths.push(flag.trim());
      }
    });
  }
  
  // High revenue growth - check revenue array entries
  const revenueRaw = fin.revenue;
  if (Array.isArray(revenueRaw) && revenueRaw.length > 0) {
    const revenueText = String(revenueRaw[0]?.value || '').toLowerCase();
    if (revenueText.includes('growth')) {
      strengths.push('High revenue growth indicated');
    }
  }
  
  // Strong margins
  if (fin.margin && typeof fin.margin === 'string') {
    const marginText = fin.margin.toLowerCase();
    if (marginText.includes('high') || marginText.includes('strong') || marginText.includes('good')) {
      strengths.push(`Strong margins: ${fin.margin}`);
    }
  }
  
  // A tier confidence (level is 'A' | 'B' | 'C', not 'high')
  const confidence = deal.ai_confidence_json;
  if (confidence?.level === 'A') {
    strengths.push('A tier data confidence - complete and reliable information');
  }
  
  // Good industry fit
  if (scoring.industry_fit === 'High') {
    strengths.push('Strong industry fit for search fund criteria');
  }
  
  // Good geography fit
  if (scoring.geography_fit === 'High') {
    strengths.push('Strong geographic fit');
  }
  
  // Low succession risk
  if (scoring.succession_risk === 'Low') {
    strengths.push('Low succession risk - owner ready to transition');
  }
  
  // Recurring revenue signals
  if (criteria?.business_model && typeof criteria.business_model === 'string') {
    const model = criteria.business_model.toLowerCase();
    if (model.includes('recurring') || model.includes('sticky') || model.includes('subscription')) {
      strengths.push('Recurring or sticky revenue model');
    }
  }
  
  // Good operational quality
  if (scoring.operational_quality_signal === 'High') {
    strengths.push('High operational quality - consistent and reliable');
  }
  
  // Remove duplicates
  const uniqueStrengths = Array.from(new Set(strengths));
  
  if (uniqueStrengths.length === 0) {
    return (
      <div className="bg-slate-800 border-2 border-emerald-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
        <div className="text-sm text-slate-400">
          No specific strengths identified yet. Run analysis to generate strengths.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border-2 border-emerald-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-50">Key Strengths</h3>
      </div>
      <div className="space-y-2">
        {uniqueStrengths.map((strength, idx) => (
          <div key={idx} className="flex items-start gap-2 bg-slate-800/50 rounded-lg p-3 border border-slate-700 hover:bg-slate-700/50 transition-colors">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
            <p className="text-slate-50 text-sm leading-relaxed">{strength}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
