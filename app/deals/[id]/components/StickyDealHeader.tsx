'use client';

import { useState } from 'react';
import type { Deal } from '@/lib/types/deal';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { FileText } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';

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
  const [loadingCimPreview, setLoadingCimPreview] = useState(false);
  const showViewCimPdf = deal?.source_type === 'cim_pdf' && !!(deal as any).cim_storage_path;

  const handleViewCimPdf = async () => {
    if (!showViewCimPdf || loadingCimPreview) return;
    setLoadingCimPreview(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to view the CIM.');
        return;
      }
      const res = await fetch(`/api/deals/${deal.id}/cim-preview`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to open CIM');
      }
      const { preview_url } = await res.json();
      if (preview_url) window.open(preview_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('View CIM PDF error:', e);
      alert(e instanceof Error ? e.message : 'Failed to open CIM PDF.');
    } finally {
      setLoadingCimPreview(false);
    }
  };

  const companyName = deal.company_name || 'Untitled Company';
  const location = [
    deal.location_city,
    deal.location_state
  ].filter(Boolean).join(', ') || '—';
  const industry = deal.industry || '—';

  // Extract user-set verdict
  const userVerdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  
  const verdictConfig = {
    proceed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/50', label: 'Proceed' },
    park: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/50', label: 'Parked' },
    pass: { bg: 'bg-slate-600/50', text: 'text-slate-300', border: 'border-slate-500', label: 'Passed' }
  };
  
  const userVerdictNormalized = userVerdict ? userVerdict.toLowerCase() : null;
  const userVerdictStyle = userVerdictNormalized ? verdictConfig[userVerdictNormalized as keyof typeof verdictConfig] : null;

  return (
    <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-6 min-w-0">
          {/* Title: takes remaining space, truncates so it never overlaps buttons */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-50 truncate">
              {companyName}
            </h1>
            <p className="text-sm text-slate-400 truncate">
              {industry} · {location}
            </p>
          </div>
          {/* Verdict + buttons: never shrink, fixed space */}
          <div className="flex items-center gap-4 flex-shrink-0">
          {userVerdictStyle && (
            <div className="hidden sm:flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-md text-sm font-semibold border ${userVerdictStyle.bg} ${userVerdictStyle.text} ${userVerdictStyle.border}`}>
                {userVerdictStyle.label}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {showViewCimPdf && (
              <AsyncButton
                onClick={handleViewCimPdf}
                isLoading={loadingCimPreview}
                loadingText="Opening…"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-200 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                title="Open CIM PDF to verify citations (e.g. page numbers)"
              >
                <FileText className="h-4 w-4" />
                View CIM PDF
              </AsyncButton>
            )}
            <AsyncButton
              onClick={onProceed}
              isLoading={settingVerdict}
              loadingText="Setting…"
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all whitespace-nowrap ${
                userVerdict === 'proceed'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
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
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              ⏸ Park
            </AsyncButton>
            <AsyncButton
              onClick={onPass}
              isLoading={settingVerdict}
              className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all whitespace-nowrap ${
                userVerdict === 'pass'
                  ? 'border-slate-500 bg-slate-600/50 text-slate-300'
                  : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              ✕ Pass
            </AsyncButton>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
