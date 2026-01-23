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
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
        <div className="text-sm text-emerald-700">
          No specific strengths identified yet. Run analysis to generate strengths.
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-900 text-lg mb-3">Key Strengths</h3>
          <div className="space-y-2">
            {uniqueStrengths.map((strength, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/60 rounded-lg p-3 border border-emerald-200 hover:bg-white/80 transition-colors">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-emerald-900 text-sm leading-relaxed">{strength}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
