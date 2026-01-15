'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Building2, Calendar } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceBadge } from './SourceBadge';
import { Skeleton } from './Skeleton';
import { MoreActionsMenu } from '@/components/deal/MoreActionsMenu';
import { supabase } from '@/app/supabaseClient';

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
  verdict?: string | null;
  sba_eligible?: boolean | null;
  asking_price_extracted?: string | null;
  ebitda_ttm_extracted?: string | null;
  next_action?: string | null;
  stage?: string | null;
  next_action_date?: string | null;
  archived_at?: string | null;
  criteria_match_json?: {
    verdict?: string;
    asking_price?: string;
    ebitda_ttm?: string;
    sba_eligible?: boolean;
    recommended_next_action?: string;
  } | null;
};

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  
  const config = {
    proceed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Proceed' },
    park: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Parked' },
    pass: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Passed' }
  };
  
  const normalizedVerdict = verdict.toLowerCase();
  const c = config[normalizedVerdict as keyof typeof config];
  if (!c) return null;
  
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function DealCard({
  deal,
  onSaveToggle,
  onDelete,
  fromView,
  isLoading,
  onArchive,
}: {
  deal?: Deal;
  onSaveToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  fromView?: string | null;
  isLoading?: boolean;
  onArchive?: (id: string) => void;
}) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
  // Convert confidence level from 'low'|'medium'|'high' to 'A'|'B'|'C' format
  const rawLevel = deal.ai_confidence_json?.level;
  let confidenceLevel: 'A' | 'B' | 'C' | null = null;
  if (rawLevel === 'high' || rawLevel === 'A') confidenceLevel = 'A';
  else if (rawLevel === 'medium' || rawLevel === 'B') confidenceLevel = 'B';
  else if (rawLevel === 'low' || rawLevel === 'C') confidenceLevel = 'C';
  const analyzed = Boolean(deal.ai_confidence_json);
  const preview = deal.ai_summary ? deal.ai_summary.slice(0, 120) + (deal.ai_summary.length > 120 ? '...' : '') : 'No summary available yet.';

  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || null;
  const isArchived = Boolean(deal.archived_at);
  
  // Extract verdict and economics from deal or criteria_match_json
  const verdict = deal.verdict || deal.criteria_match_json?.verdict || null;

  const handleArchive = async () => {
    if (!deal || isArchiving) return;
    setIsArchiving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to archive deals');
        return;
      }

      const response = await fetch(`/api/deals/${deal.id}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive deal');
      }

      onArchive?.(deal.id);
      // Optionally refresh the page or update the UI
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error archiving deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to archive deal');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!deal || isDeleting) return;

    // Check if deal is archived
    const isArchived = Boolean(deal.archived_at);
    
    // If not archived, require confirmation
    if (!isArchived) {
      const confirmed = window.confirm(
        'This deal is not archived. Are you sure you want to permanently delete it? This action cannot be undone.'
      );
      if (!confirmed) return;

      // Require typing DELETE
      const confirmation = window.prompt(
        'Type "DELETE" to confirm permanent deletion:'
      );
      if (confirmation !== 'DELETE') {
        return;
      }
    } else {
      // If archived, still require confirmation
      const confirmed = window.confirm(
        'Are you sure you want to permanently delete this archived deal? This action cannot be undone.'
      );
      if (!confirmed) return;
    }

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to delete deals');
        return;
      }

      const response = await fetch(`/api/deals/${deal.id}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force: !isArchived,
          confirmation: !isArchived ? 'DELETE' : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete deal');
      }

      onDelete?.(deal.id);
      // Optionally refresh the page or update the UI
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete deal');
    } finally {
      setIsDeleting(false);
    }
  };
  const askingPrice = deal.asking_price_extracted || deal.criteria_match_json?.asking_price || null;
  const ebitda = deal.ebitda_ttm_extracted || deal.criteria_match_json?.ebitda_ttm || null;
  const sbaEligible = deal.sba_eligible !== undefined ? deal.sba_eligible : deal.criteria_match_json?.sba_eligible ?? null;
  const nextAction = deal.next_action || deal.criteria_match_json?.recommended_next_action || null;

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-all hover:border-blue-300">
      {/* Verdict and SBA Badges */}
      <div className="flex items-center justify-between mb-2">
        <VerdictBadge verdict={verdict} />
        {sbaEligible && (
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            SBA ✓
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
              className="block flex-1"
            >
              <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                {deal.company_name || 'Untitled Deal'}
              </h3>
            </Link>
            <MoreActionsMenu
              dealId={deal.id}
              isArchived={isArchived}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>

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

      {/* Deal Economics */}
      {(askingPrice || ebitda) && (
        <div className="text-sm text-gray-600 mt-2 mb-2">
          {askingPrice && (
            <span>{askingPrice}</span>
          )}
          {ebitda && (
            <span>{askingPrice ? ' • ' : ''}{ebitda} EBITDA</span>
          )}
        </div>
      )}

      {/* Stage */}
      {deal.stage && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-gray-500 mb-1">Stage</div>
          <div className="text-sm font-medium capitalize text-gray-900">
            {deal.stage.replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Next Action */}
      {(nextAction || deal.next_action_date) && (
        <div className="mt-2 mb-3 text-sm">
          <span className="font-medium text-gray-700">Next: </span>
          <span className="text-gray-700">{nextAction || deal.next_action}</span>
          {deal.next_action_date && (
            <span className="text-gray-500 ml-1">
              ({new Date(deal.next_action_date).toLocaleDateString()})
            </span>
          )}
        </div>
      )}

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
      </div>
    </div>
  );
}
