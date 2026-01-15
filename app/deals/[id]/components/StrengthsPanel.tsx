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
  
  // High confidence score
  const confidence = deal.ai_confidence_json;
  if (confidence?.level === 'high') {
    strengths.push('High data confidence - complete and reliable information');
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
      <div className="text-sm text-slate-600 dark:text-slate-400">
        No specific strengths identified yet. Run analysis to generate strengths.
      </div>
    );
  }
  
  return (
    <ul className="space-y-2">
      {uniqueStrengths.map((strength, idx) => (
        <li key={idx} className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <span className="text-slate-700 dark:text-slate-300">{strength}</span>
        </li>
      ))}
    </ul>
  );
}
