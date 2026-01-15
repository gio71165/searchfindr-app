import React from 'react';
import Link from 'next/link';
import { MapPin, Building2, Calendar } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceBadge } from './SourceBadge';
import { Skeleton } from './Skeleton';

type Deal = {
  id: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  source_type: string | null;
  created_at: string | null;
  ai_confidence_json?: {
    level?: 'low' | 'medium' | 'high' | null;
  } | null;
  final_tier?: string | null;
  ai_summary?: string | null;
  is_saved?: boolean | null;
};

export function DealCard({
  deal,
  onSaveToggle,
  onDelete,
  fromView,
  isLoading,
}: {
  deal?: Deal;
  onSaveToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  fromView?: string;
  isLoading?: boolean;
}) {
  if (isLoading || !deal) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <Skeleton height={24} className="mb-4" width="60%" />
        <div className="flex gap-2 mb-3">
          <Skeleton height={20} width={80} />
          <Skeleton height={20} width={80} />
        </div>
        <Skeleton lines={2} className="mb-4" />
        <Skeleton height={40} className="mb-2" />
        <div className="flex gap-2 pt-4 border-t border-slate-200">
          <Skeleton height={36} className="flex-1" />
          <Skeleton height={36} width={80} />
        </div>
      </div>
    );
  }
  const confidenceLevel = deal.ai_confidence_json?.level || null;
  const analyzed = Boolean(deal.ai_confidence_json);
  const preview = deal.ai_summary ? deal.ai_summary.slice(0, 120) + (deal.ai_summary.length > 120 ? '...' : '') : 'No summary available yet.';

  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || null;

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-all hover:border-blue-300">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
            className="block"
          >
            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
              {deal.company_name || 'Untitled Deal'}
            </h3>
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SourceBadge source={deal.source_type} />
            {deal.final_tier && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-1 text-xs font-medium uppercase">
                Tier {deal.final_tier}
              </span>
            )}
            <ConfidenceBadge level={confidenceLevel} analyzed={analyzed} />
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {location && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        )}

        {deal.industry && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4" />
            <span>{deal.industry}</span>
          </div>
        )}

        {deal.created_at && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600 mb-4 line-clamp-2">{preview}</p>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-200">
        <Link
          href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
          className="flex-1 text-center px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          View Details
        </Link>
        {onSaveToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(deal.id);
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {deal.is_saved ? 'Unsave' : 'Save'}
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
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
