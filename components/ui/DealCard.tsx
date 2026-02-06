'use client';

import React, { useState, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Calendar, DollarSign, TrendingUp, StickyNote, Plus, Tag, Clock, ChevronRight } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { Skeleton } from './Skeleton';
import { MoreActionsMenu } from '@/components/deal/MoreActionsMenu';
import { TierBadge } from '@/app/deals/[id]/components/TierBadge';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';
import { JargonTooltip } from './JargonTooltip';
import { LoadingDots } from './LoadingSpinner';
import { AsyncButton } from './AsyncButton';

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
  user_notes?: string | null;
  score?: number | null;
  score_components?: Record<string, number> | null;
  criteria_match_json?: {
    verdict?: string;
    asking_price?: string;
    ebitda_ttm?: string;
    sba_eligible?: boolean;
    recommended_next_action?: string;
  } | null;
};

function VerdictBadge({ verdict, size = 'default' }: { verdict: string | null; size?: 'sm' | 'default' }) {
  if (!verdict) return null;
  
  const config = {
    proceed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Proceed' },
    park: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400', label: 'Parked' },
    pass: { bg: 'bg-slate-700/50', text: 'text-slate-400', border: 'border-slate-600', dot: 'bg-slate-400', label: 'Passed' }
  };
  
  const normalizedVerdict = verdict.toLowerCase();
  const c = config[normalizedVerdict as keyof typeof config];
  if (!c) return null;
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';
  
  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-md font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function DealCardComponent({
  deal,
  onSaveToggle,
  onDelete,
  fromView,
  isLoading,
  onArchive,
  onRefresh,
  isSelected,
  onToggleSelect,
  canSelect,
  onNoteUpdate,
}: {
  deal?: Deal;
  onSaveToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  fromView?: string | null;
  isLoading?: boolean;
  onArchive?: (id: string) => void;
  onRefresh?: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
  onNoteUpdate?: () => void;
}) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  if (isLoading || !deal) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton height={24} width="30%" />
          <Skeleton height={24} width="25%" />
        </div>
        <Skeleton height={28} className="mb-3" width="70%" />
        <div className="flex gap-2 mb-4">
          <Skeleton height={24} width={80} />
          <Skeleton height={24} width={80} />
          <Skeleton height={24} width={80} />
        </div>
        <div className="space-y-2.5 mb-4">
          <Skeleton height={20} width="60%" />
          <Skeleton height={20} width="50%" />
        </div>
        <Skeleton height={60} className="mb-4 rounded-lg" />
        <Skeleton lines={2} className="mb-5" />
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Skeleton height={40} className="flex-1" />
          <Skeleton height={40} width={80} />
        </div>
      </div>
    );
  }
  // Convert confidence level to 'A'|'B'|'C' format
  // ai_confidence_json.level can be 'A' | 'B' | 'C' (from ConfidenceJson type)
  const rawLevel = deal.ai_confidence_json?.level;
  let confidenceLevel: 'A' | 'B' | 'C' | null = null;
  if (rawLevel === 'A' || rawLevel === 'high') confidenceLevel = 'A';
  else if (rawLevel === 'B' || rawLevel === 'medium') confidenceLevel = 'B';
  else if (rawLevel === 'C' || rawLevel === 'low') confidenceLevel = 'C';
  const analyzed = Boolean(deal.ai_confidence_json);
  const preview = deal.ai_summary ? deal.ai_summary.slice(0, 120) + (deal.ai_summary.length > 120 ? '...' : '') : 'No summary available yet.';

  const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || null;
  const isArchived = Boolean(deal.archived_at);
  const { session } = useAuth();
  
  // Extract verdict and economics from deal or criteria_match_json
  const verdict = deal.verdict || deal.criteria_match_json?.verdict || null;

  const handleArchive = async () => {
    if (!deal || isArchiving) return;
    setIsArchiving(true);
    try {
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
      onRefresh?.();
    } catch (error) {
      logger.error('Error archiving deal:', error);
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
      onRefresh?.();
    } catch (error) {
      logger.error('Error deleting deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete deal');
    } finally {
      setIsDeleting(false);
    }
  };
  const askingPrice = deal.asking_price_extracted || deal.criteria_match_json?.asking_price || null;
  const ebitda = deal.ebitda_ttm_extracted || deal.criteria_match_json?.ebitda_ttm || null;
  const sbaEligible = deal.sba_eligible !== undefined ? deal.sba_eligible : deal.criteria_match_json?.sba_eligible ?? null;
  const nextAction = deal.next_action || deal.criteria_match_json?.recommended_next_action || null;

  // Helper to format currency from string or number
  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return '—';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return '—';
  };

  const dealHref = `/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isNonNavigable =
      target.closest('[data-no-navigate]') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="menu"]');
    if (isNonNavigable) return;
    router.push(dealHref);
  };

  return (
    <>
      {/* Desktop card (current design) */}
      <div className="hidden md:block">
        <div
          role="link"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(dealHref);
            }
          }}
          className="block group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-xl cursor-pointer"
          aria-label={`View details for ${deal.company_name || 'deal'}`}
        >
          <div className={`relative group rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:border-slate-600 hover:shadow-black/50 ${
            isSelected 
              ? 'border-emerald-500 border-2 bg-emerald-500/10' 
              : 'border-slate-700'
          }`}>
      {/* Bulk select checkbox - always visible so selected state is clear */}
      {onToggleSelect && (
        <div className="flex items-center justify-end mb-3" data-no-navigate onClick={(e) => e.stopPropagation()}>
          <label className={`flex items-center gap-2 cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'} transition-opacity`}>
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                e.stopPropagation();
                if (canSelect !== false) {
                  onToggleSelect(deal.id);
                }
              }}
              disabled={canSelect === false && !isSelected}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            />
            <span className={`text-xs font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
              {isSelected ? 'Selected' : 'Select'}
            </span>
          </label>
        </div>
      )}

      {/* Header: Company Name + Verdict - title truncates so badge never overlaps */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-emerald-400 transition-colors truncate" title={deal.company_name || 'Untitled Deal'}>
            {deal.company_name || 'Untitled Deal'}
          </h3>
          
          {/* Location + Industry */}
          <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
            {location && (
              <>
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </>
            )}
            {deal.industry && location && <span className="flex-shrink-0">·</span>}
            {deal.industry && <span className="truncate">{deal.industry}</span>}
          </div>
        </div>

        {/* Verdict Badge + menu - fixed width so they never overlap title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <VerdictBadge verdict={verdict} size="sm" />
          <div data-no-navigate onClick={(e) => e.stopPropagation()}>
            <MoreActionsMenu
              dealId={deal.id}
              isArchived={isArchived}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      {(askingPrice || ebitda) && (
        <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-700">
          {askingPrice && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Asking Price</p>
              <p className="text-base font-semibold font-mono text-slate-300">{askingPrice}</p>
            </div>
          )}
          {ebitda && (
            <div>
              <div className="text-xs text-slate-500 mb-1">
                <JargonTooltip term="EBITDA">EBITDA</JargonTooltip>
              </div>
              <p className="text-base font-semibold font-mono text-slate-300">{ebitda}</p>
            </div>
          )}
        </div>
      )}

      {/* Next Action (if exists) */}
      {(nextAction || deal.next_action_date) && (
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
          <Clock className="w-4 h-4" />
          <span>{nextAction || deal.next_action}</span>
          {deal.next_action_date && (
            <span className="text-slate-500">
              ({new Date(deal.next_action_date).toLocaleDateString()})
            </span>
          )}
        </div>
      )}



      {/* Hover Actions */}
      <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
          View Details
        </button>
        {onSaveToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(deal.id);
            }}
            className="text-sm text-slate-400 hover:text-slate-300"
            data-no-navigate
          >
            {deal.is_saved ? 'Unsave' : 'Save'}
          </button>
        )}
      </div>
      </div>
        </div>
      </div>

      {/* Mobile card (simplified) */}
      <div className="md:hidden">
        <div
          role="link"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push(dealHref);
            }
          }}
          className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg cursor-pointer"
          aria-label={`View details for ${deal.company_name || 'deal'}`}
        >
          <div className={`bg-slate-800 rounded-lg p-4 border border-slate-700 active:bg-slate-700 relative ${
            isSelected 
              ? 'border-emerald-500 border-2 bg-emerald-500/10' 
              : ''
          }`}>
            {/* Comparison Checkbox */}
            {onToggleSelect && (
              <div className="flex items-center justify-end mb-3" data-no-navigate onClick={(e) => e.stopPropagation()}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSelected || false}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (canSelect !== false) {
                        onToggleSelect(deal.id);
                      }
                    }}
                    disabled={canSelect === false && !isSelected}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="text-xs text-slate-400 font-medium">
                    {isSelected ? 'Selected' : 'Select'}
                  </span>
                </label>
              </div>
            )}

            {/* Header: Name + Tier */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-semibold text-base truncate text-slate-50 mb-1">
                  {deal.company_name || 'Untitled Deal'}
                </h3>
                {deal.industry && (
                  <p className="text-sm text-slate-400 truncate">
                    {deal.industry}
                  </p>
                )}
              </div>
              {(deal.source_type === 'on_market' || deal.source_type === 'off_market') && deal.final_tier && (
                <div className="flex-shrink-0" data-no-navigate onClick={(e) => e.stopPropagation()}>
                  <TierBadge tier={deal.final_tier} />
                </div>
              )}
            </div>
            
            {/* Key metrics - 2 column grid */}
            {(askingPrice || ebitda) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {askingPrice && (
                  <div>
                    <p className="text-xs text-slate-500">Asking Price</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {formatCurrency(askingPrice)}
                    </p>
                  </div>
                )}
                {ebitda && (
                  <div>
                    <p className="text-xs text-slate-500">EBITDA</p>
                    <p className="text-sm font-semibold text-slate-300">
                      {formatCurrency(ebitda)}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Badges - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 scrollbar-hide">
              {sbaEligible && (
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium rounded whitespace-nowrap">
                  SBA Eligible
                </span>
              )}
              {verdict && (
                <VerdictBadge verdict={verdict} />
              )}
              <SourceBadge source={deal.source_type} />
            </div>
            
            {/* Next action - condensed */}
            {nextAction && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{nextAction}</span>
              </div>
            )}
            
            {/* Chevron indicator */}
            <ChevronRight className="absolute right-4 top-4 w-5 h-5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const DealCard = memo(DealCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.canSelect !== nextProps.canSelect) return false;
  if (prevProps.fromView !== nextProps.fromView) return false;
  
  // Deep compare deal object (only key fields that affect rendering)
  if (prevProps.deal?.id !== nextProps.deal?.id) return false;
  if (prevProps.deal?.is_saved !== nextProps.deal?.is_saved) return false;
  if (prevProps.deal?.user_notes !== nextProps.deal?.user_notes) return false;
  if (prevProps.deal?.archived_at !== nextProps.deal?.archived_at) return false;
  
  // If callbacks changed, we need to re-render (but they should be memoized in parent)
  if (prevProps.onSaveToggle !== nextProps.onSaveToggle) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;
  if (prevProps.onArchive !== nextProps.onArchive) return false;
  if (prevProps.onRefresh !== nextProps.onRefresh) return false;
  if (prevProps.onToggleSelect !== nextProps.onToggleSelect) return false;
  
  return true; // Props are equal, skip re-render
});
