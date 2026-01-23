'use client';

import React, { useState, memo, useCallback } from 'react';
import Link from 'next/link';
import { MapPin, Building2, Calendar, DollarSign, TrendingUp, StickyNote, Plus, Tag, Clock, ChevronRight } from 'lucide-react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceBadge } from './SourceBadge';
import { Skeleton } from './Skeleton';
import { DealScoreBadge } from './DealScoreBadge';
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
      // Optionally refresh the page or update the UI
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
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

  return (
    <>
      {/* Desktop card (current design) */}
      <div className="hidden md:block">
        <Link
          href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
          className="block group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-xl"
          aria-label={`View details for ${deal.company_name || 'deal'}`}
          onClick={(e) => {
            // Allow clicks on interactive elements to work normally
            const target = e.target as HTMLElement;
            if (
              target.closest('button') ||
              target.closest('input') ||
              target.closest('[role="button"]') ||
              target.closest('a[href]') ||
              target.closest('[data-no-link]')
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className={`rounded-xl border bg-white p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] group-hover:border-gray-300 ${
            isSelected 
              ? 'border-blue-500 border-2 bg-blue-50/30' 
              : 'border-slate-200'
          }`}>
      {/* Comparison Checkbox */}
      {onToggleSelect && (
        <div className="flex items-center justify-end mb-3" data-no-link onClick={(e) => e.stopPropagation()}>
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
            <div className="flex-1 min-w-0" data-no-link>
              <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors duration-200 leading-tight">
                {deal.company_name || 'Untitled Deal'}
              </h3>
            </div>
            <div data-no-link onClick={(e) => e.stopPropagation()}>
              <MoreActionsMenu
                dealId={deal.id}
                isArchived={isArchived}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteInput(deal.user_notes || '');
                  setShowNoteInput(true);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2 py-1"
                data-no-link
              >
                Edit
              </button>
            )}
          </div>
          
          {showNoteInput ? (
              <div className="space-y-2" data-no-link onClick={(e) => e.stopPropagation()}>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note about this deal..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={1000}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex items-center gap-2">
                <AsyncButton
                  onClick={async (e) => {
                    e.stopPropagation();
                    setIsSavingNote(true);
                    try {
                      if (!session) {
                        alert('Please log in to save notes');
                        return;
                      }

                      const response = await fetch(`/api/deals/${deal.id}/notes`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`,
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
                      logger.error('Error saving note:', error);
                      alert(error instanceof Error ? error.message : 'Failed to save note');
                    } finally {
                      setIsSavingNote(false);
                    }
                  }}
                  isLoading={isSavingNote}
                  loadingText="Saving..."
                  className="px-3 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors min-h-[44px]"
                >
                  Save
                </AsyncButton>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteInput(deal.user_notes || '');
                    setShowNoteInput(false);
                  }}
                  disabled={isSavingNote}
                  className="px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50 min-h-[44px]"
                  data-no-link
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
        <div className="mb-4" data-no-link onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNoteInput('');
              setShowNoteInput(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors min-h-[44px]"
            data-no-link
          >
            <Plus className="h-3.5 w-3.5" />
            Add Note
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200" data-no-link onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 text-center px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 hover:shadow-md hover:shadow-blue-200 pointer-events-none min-h-[44px] flex items-center justify-center">
          View Details
        </div>
        {onSaveToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveToggle(deal.id);
            }}
            className="px-4 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-all duration-200 min-h-[44px]"
            data-no-link
          >
            {deal.is_saved ? 'Unsave' : 'Save'}
          </button>
        )}
      </div>
      </div>
        </Link>
      </div>

      {/* Mobile card (simplified) */}
      <div className="md:hidden">
        <Link
          href={`/deals/${deal.id}${fromView ? `?from_view=${fromView}` : ''}`}
          className="block focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg"
          aria-label={`View details for ${deal.company_name || 'deal'}`}
          onClick={(e) => {
            // Allow clicks on interactive elements to work normally
            const target = e.target as HTMLElement;
            if (
              target.closest('button') ||
              target.closest('input') ||
              target.closest('[role="button"]') ||
              target.closest('[data-no-link]')
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className={`bg-white rounded-lg p-4 border border-gray-200 active:bg-gray-50 relative ${
            isSelected 
              ? 'border-blue-500 border-2 bg-blue-50/30' 
              : ''
          }`}>
            {/* Comparison Checkbox */}
            {onToggleSelect && (
              <div className="flex items-center justify-end mb-3" data-no-link onClick={(e) => e.stopPropagation()}>
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
                    {isSelected ? 'Selected' : 'Select'}
                  </span>
                </label>
              </div>
            )}

            {/* Header: Name + Tier */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-semibold text-base truncate text-gray-900 mb-1">
                  {deal.company_name || 'Untitled Deal'}
                </h3>
                {deal.industry && (
                  <p className="text-sm text-gray-600 truncate">
                    {deal.industry}
                  </p>
                )}
              </div>
              {(deal.source_type === 'on_market' || deal.source_type === 'off_market') && deal.final_tier && (
                <div className="flex-shrink-0" data-no-link onClick={(e) => e.stopPropagation()}>
                  <TierBadge tier={deal.final_tier} />
                </div>
              )}
            </div>
            
            {/* Key metrics - 2 column grid */}
            {(askingPrice || ebitda) && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {askingPrice && (
                  <div>
                    <p className="text-xs text-gray-500">Asking Price</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(askingPrice)}
                    </p>
                  </div>
                )}
                {ebitda && (
                  <div>
                    <p className="text-xs text-gray-500">EBITDA</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(ebitda)}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Badges - horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 scrollbar-hide">
              {sbaEligible && (
                <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded whitespace-nowrap">
                  SBA Eligible
                </span>
              )}
              {verdict && (
                <VerdictBadge verdict={verdict} />
              )}
              <SourceBadge source={deal.source_type} />
              {confidenceLevel && (
                <ConfidenceBadge level={confidenceLevel} analyzed={analyzed} />
              )}
            </div>
            
            {/* Next action - condensed */}
            {nextAction && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{nextAction}</span>
              </div>
            )}
            
            {/* Chevron indicator */}
            <ChevronRight className="absolute right-4 top-4 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </Link>
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
  if (prevProps.onToggleSelect !== nextProps.onToggleSelect) return false;
  
  return true; // Props are equal, skip re-render
});
