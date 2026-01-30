'use client';

import type { Deal } from '@/lib/types/deal';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface StickyDealHeaderProps {
  deal: Deal;
  onProceed: () => void;
  onPark: () => void;
  onPass: () => void;
  settingVerdict: boolean;
}

export function StickyDealHeader({
  deal,
  onProceed,
  onPark,
  onPass,
  settingVerdict,
}: StickyDealHeaderProps) {
  const companyName = deal.company_name || 'Untitled Company';
  const location = [
    deal.location_city,
    deal.location_state
  ].filter(Boolean).join(', ') || 'Location not specified';
  const industry = deal.industry || 'Industry not specified';

  // Extract user-set verdict
  const userVerdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  
  const verdictConfig = {
    proceed: { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Proceed' },
    park: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', label: 'Parked' },
    pass: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', label: 'Passed' }
  };
  
  const userVerdictNormalized = userVerdict ? userVerdict.toLowerCase() : null;
  const userVerdictStyle = userVerdictNormalized ? verdictConfig[userVerdictNormalized as keyof typeof verdictConfig] : null;

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
              {companyName}
            </h1>
            <p className="text-sm text-slate-500 truncate">
              {industry} · {location}
            </p>
          </div>
          
          {userVerdictStyle && (
            <div className="hidden sm:flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${userVerdictStyle.bg} ${userVerdictStyle.text} ${userVerdictStyle.border}`}>
                {userVerdictStyle.label}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <AsyncButton
              onClick={onProceed}
              isLoading={settingVerdict}
              loadingText="Setting…"
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all whitespace-nowrap ${
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
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all whitespace-nowrap ${
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
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all whitespace-nowrap ${
                userVerdict === 'pass'
                  ? 'border-slate-400 bg-slate-50 text-slate-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              ✕ Pass
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}
