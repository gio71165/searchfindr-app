'use client';

import React, { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Building2, Calendar, DollarSign, TrendingUp, StickyNote, Plus, Tag } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceBadge } from './SourceBadge';
import { Skeleton } from './Skeleton';
import { DealScoreBadge } from './DealScoreBadge';
import { MoreActionsMenu } from '@/components/deal/MoreActionsMenu';
import { TierBadge } from '@/app/deals/[id]/components/TierBadge';
import { supabase } from '@/app/supabaseClient';
import { JargonTooltip } from './JargonTooltip';

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

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  
  const config = {
    proceed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Proceed' },
    park: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Parked' },
    pass: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Passed' }
  };
  
  const normalizedVerdict = verdict.toLowerCase();
  const c = config[normalizedVerdict as keyof typeof config];
  if (!c) return null;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${c.bg} ${c.text} ${c.border}`}>
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
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  canSelect?: boolean;
  onNoteUpdate?: () => void;
}) {
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  if (isLoading || !deal) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
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
        <div className="flex gap-3 pt-4 border-t border-slate-200">
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
    <div className={`group rounded-xl border bg-white p-6 transition-all duration-200 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-0.5 ${
      isSelected 
        ? 'border-blue-500 border-2 bg-blue-50/30' 
        : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Comparison Checkbox */}
      {onToggleSelect && (
        <div className="flex items-center justify-end mb-3">
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
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-xs text-slate-600 font-medium">
              {isSelected ? 'Selected' : 'Select for comparison'}
            </span>
          </label>
        </div>
      )}

      {/* Verdict and SBA Badges */}
      <div className="flex items-center justify-between mb-4">
        <VerdictBadge verdict={verdict} />
        {sbaEligible && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold">
            <TrendingUp className="h-3 w-3" />
            <JargonTooltip term="SBA">SBA</JargonTooltip> Eligible
          </span>
        )}
      </div>

      {/* Company Name - Most Prominent */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <Link
              href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
              className="block flex-1 min-w-0"
            >
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors duration-200 leading-tight">
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

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <SourceBadge source={deal.source_type} />
            {(deal.source_type === 'on_market' || deal.source_type === 'off_market') && deal.final_tier && (
              <TierBadge tier={deal.final_tier} />
            )}
            <ConfidenceBadge level={confidenceLevel} analyzed={analyzed} />
            {deal.final_tier && (deal.final_tier === 'A' || deal.final_tier === 'B' || deal.final_tier === 'C') && (
              <DealScoreBadge 
                tier={deal.final_tier as 'A' | 'B' | 'C'} 
                score={deal.score || undefined}
                breakdown={deal.score_components || undefined}
              />
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics with Icons */}
      <div className="space-y-2.5 mb-4">
        {location && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <span className="font-medium">{location}</span>
          </div>
        )}

        {deal.industry && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <span className="font-medium">{deal.industry}</span>
          </div>
        )}

        {deal.created_at && (
          <div className="flex items-center gap-2.5 text-sm text-slate-500">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <span>{new Date(deal.created_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {/* Deal Economics - Enhanced with Icons */}
      {(askingPrice || ebitda) && (
        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            {askingPrice && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-medium">Asking Price</span>
                  <span className="text-sm font-bold text-emerald-700">{askingPrice}</span>
                </div>
              </div>
            )}
            {ebitda && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 font-medium">
                    <JargonTooltip term="EBITDA">EBITDA</JargonTooltip>
                  </span>
                  <span className="text-sm font-bold text-blue-700">{ebitda}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stage */}
      {deal.stage && (
        <div className="mb-4 pb-4 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Stage</div>
          <div className="text-sm font-semibold capitalize text-slate-900">
            {deal.stage.replace('_', ' ')}
          </div>
        </div>
      )}

      {/* Next Action */}
      {(nextAction || deal.next_action_date) && (
        <div className="mb-4 pb-4 border-b border-slate-200">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Next Action</div>
          <div className="text-sm text-slate-900">
            <span className="font-medium">{nextAction || deal.next_action}</span>
            {deal.next_action_date && (
              <span className="text-slate-500 ml-2">
                ({new Date(deal.next_action_date).toLocaleDateString()})
              </span>
            )}
          </div>
        </div>
      )}


      {/* Summary Preview */}
      <p className="text-sm text-slate-600 mb-4 line-clamp-2 leading-relaxed">{preview}</p>

      {/* User Notes Preview */}
      {(deal.user_notes || showNoteInput) && (
        <div className="mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Notes</span>
            </div>
            {!showNoteInput && (
              <button
                onClick={() => {
                  setNoteInput(deal.user_notes || '');
                  setShowNoteInput(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>
          
          {showNoteInput ? (
            <div className="space-y-2">
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note about this deal..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setIsSavingNote(true);
                    try {
                      const { data: sessionData } = await supabase.auth.getSession();
                      if (!sessionData?.session) {
                        alert('Please log in to save notes');
                        return;
                      }

                      const response = await fetch(`/api/deals/${deal.id}/notes`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${sessionData.session.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ notes: noteInput.trim() || null }),
                      });

                      if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Failed to save note');
                      }

                      setShowNoteInput(false);
                      onNoteUpdate?.();
                    } catch (error) {
                      console.error('Error saving note:', error);
                      alert(error instanceof Error ? error.message : 'Failed to save note');
                    } finally {
                      setIsSavingNote(false);
                    }
                  }}
                  disabled={isSavingNote}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingNote ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setNoteInput(deal.user_notes || '');
                    setShowNoteInput(false);
                  }}
                  disabled={isSavingNote}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">
              {deal.user_notes || 'No notes yet'}
            </p>
          )}
        </div>
      )}

      {/* Quick Add Note Button */}
      {!deal.user_notes && !showNoteInput && (
        <div className="mb-4">
          <button
            onClick={() => {
              setNoteInput('');
              setShowNoteInput(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Note
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
        <Link
          href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
          className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 hover:shadow-md hover:shadow-blue-200"
        >
          View Details
        </Link>
        {onSaveToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(deal.id);
            }}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-all duration-200"
          >
            {deal.is_saved ? 'Unsave' : 'Save'}
          </button>
        )}
      </div>
    </div>
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
  if (prevProps.onToggleSelect !== nextProps.onToggleSelect) return false;
  
  return true; // Props are equal, skip re-render
});
