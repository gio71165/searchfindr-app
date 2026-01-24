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
    proceed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Proceed' },
    park: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Parked' },
    pass: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Passed' }
  };
  
  const userVerdictNormalized = userVerdict ? userVerdict.toLowerCase() : null;
  const userVerdictStyle = userVerdictNormalized ? verdictConfig[userVerdictNormalized as keyof typeof verdictConfig] : null;

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Gradient accent bar */}
      <div className={`h-1.5 transition-all ${
        userVerdict === 'proceed' 
          ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600' 
          : userVerdict === 'park'
          ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600'
          : userVerdict === 'pass'
          ? 'bg-gradient-to-r from-red-400 via-red-500 to-red-600'
          : 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500'
      }`} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
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
              <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${userVerdictStyle.bg} ${userVerdictStyle.text}`}>
                {userVerdictStyle.label}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <AsyncButton
              onClick={onProceed}
              isLoading={settingVerdict}
              loadingText="Setting…"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Proceed
            </AsyncButton>
            <AsyncButton
              onClick={onPark}
              isLoading={settingVerdict}
              loadingText="Setting…"
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white transition-all shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Park
            </AsyncButton>
            <AsyncButton
              onClick={onPass}
              isLoading={settingVerdict}
              className="px-6 py-3 text-sm font-semibold rounded-lg border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-all shadow-sm hover:shadow-md whitespace-nowrap"
            >
              Pass
            </AsyncButton>
          </div>
        </div>
      </div>
    </div>
  );
}
