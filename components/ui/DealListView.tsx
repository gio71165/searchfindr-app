import React from 'react';
import Link from 'next/link';
import { MapPin, Building2, Calendar, Star, Trash2 } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceBadge } from './SourceBadge';
import { TierBadge } from '@/app/deals/[id]/components/TierBadge';

type Deal = {
  id: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  source_type: string | null;
  created_at: string | null;
  ai_confidence_json?: {
    level?: 'A' | 'B' | 'C' | 'low' | 'medium' | 'high' | null;
  } | null;
  final_tier?: string | null;
  is_saved?: boolean | null;
};

export function DealListView({
  deals,
  selectedIds,
  onToggleSelect,
  onSaveToggle,
  onDelete,
  fromView,
}: {
  deals: Deal[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSaveToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  fromView?: string;
}) {
  if (deals.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={deals.length > 0 && deals.every((d) => selectedIds.has(d.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      deals.forEach((d) => {
                        if (!selectedIds.has(d.id)) {
                          onToggleSelect(d.id);
                        }
                      });
                    } else {
                      deals.forEach((d) => {
                        if (selectedIds.has(d.id)) {
                          onToggleSelect(d.id);
                        }
                      });
                    }
                  }}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {deals.map((deal, idx) => {
              const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || '—';
              // Convert confidence level to 'A'|'B'|'C' format
              const rawLevel = deal.ai_confidence_json?.level;
              let confidenceLevel: 'A' | 'B' | 'C' | null = null;
              if (rawLevel === 'A' || rawLevel === 'high') confidenceLevel = 'A';
              else if (rawLevel === 'B' || rawLevel === 'medium') confidenceLevel = 'B';
              else if (rawLevel === 'C' || rawLevel === 'low') confidenceLevel = 'C';
              const analyzed = Boolean(deal.ai_confidence_json);
              const date = deal.created_at ? new Date(deal.created_at).toLocaleDateString() : '—';

              return (
                <tr
                  key={deal.id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => {
                    window.location.href = `/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`;
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(deal.id)}
                      onChange={() => onToggleSelect(deal.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {deal.company_name || 'Untitled Deal'}
                      </Link>
                      {deal.is_saved && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    {deal.industry && (
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {deal.industry}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <SourceBadge source={deal.source_type} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {location}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ConfidenceBadge level={confidenceLevel} analyzed={analyzed} size="small" />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(deal.source_type === 'on_market' || deal.source_type === 'off_market') && deal.final_tier ? (
                      <TierBadge tier={deal.final_tier} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-slate-600 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {date}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {onSaveToggle && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSaveToggle(deal.id);
                          }}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={deal.is_saved ? 'Unsave' : 'Save'}
                        >
                          <Star className={`h-4 w-4 ${deal.is_saved ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this deal?')) {
                              onDelete(deal.id);
                            }
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
