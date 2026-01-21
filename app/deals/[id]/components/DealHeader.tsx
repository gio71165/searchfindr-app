'use client';

import { useState } from 'react';
import { SourceBadge } from './SourceBadge';
import { TierBadge } from './TierBadge';
import { ConfidencePill } from './ConfidencePill';
import { getDealConfidence } from '../lib/confidence';
import { safeDateLabel } from '../lib/formatters';
import type { Deal, FinancialAnalysis } from '@/lib/types/deal';
import { supabase } from '@/app/supabaseClient';
import { useRouter } from 'next/navigation';
import { SetReminderButton } from '@/components/deal/SetReminderButton';
import { MoreActionsMenu } from '@/components/deal/MoreActionsMenu';
import { CompareDealModal } from '@/components/modals/CompareDealModal';

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
    <span className={`px-3 py-1.5 rounded-md text-sm font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function DealHeader({
  deal,
  onBack,
  canToggleSave,
  savingToggle,
  onToggleSave,
  financialAnalysis,
}: {
  deal: Deal;
  onBack: () => void;
  canToggleSave: boolean;
  savingToggle: boolean;
  onToggleSave: () => void;
  financialAnalysis?: FinancialAnalysis | null;
}) {
  const router = useRouter();
  const [updatingStage, setUpdatingStage] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  
  const isArchived = Boolean(deal.archived_at);
  
  const isTierSource = deal?.source_type === 'on_market' || deal?.source_type === 'off_market';
  const tier = isTierSource ? ((deal?.final_tier as string | null) || null) : null;

  const confidence = getDealConfidence(deal, { financialAnalysis: financialAnalysis ?? null });
  const addedLabel = safeDateLabel(deal.created_at);

  // Extract verdict and economics from deal or criteria_match_json
  const verdict = (deal as any).verdict || deal.criteria_match_json?.verdict || null;
  const verdictConfidence = (deal as any).verdict_confidence || null;
  const verdictReason = (deal as any).verdict_reason || null;
  const nextAction = (deal as any).next_action || deal.criteria_match_json?.recommended_next_action || null;
  const askingPrice = (deal as any).asking_price_extracted || deal.criteria_match_json?.asking_price || null;
  const ebitda = (deal as any).ebitda_ttm_extracted || deal.criteria_match_json?.ebitda_ttm || null;
  const sbaEligible = (deal as any).sba_eligible !== undefined ? (deal as any).sba_eligible : deal.criteria_match_json?.sba_eligible ?? null;
  const stage = (deal as any).stage || 'new';
  const nextActionDate = (deal as any).next_action_date || null;
  const nextActionText = (deal as any).next_action || null;

  const handleStageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStage = e.target.value;
    setUpdatingStage(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ stage: newStage, last_action_at: new Date().toISOString() })
        .eq('id', deal.id);
      
      if (error) {
        console.error('Failed to update stage:', error);
      } else {
        // Refresh the page to show updated data
        router.refresh();
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleArchive = async () => {
    if (isArchiving) return;
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

      // Redirect to dashboard after archiving
      router.push('/dashboard');
    } catch (error) {
      console.error('Error archiving deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to archive deal');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

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

      // Redirect to dashboard after deletion
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting deal:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete deal');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section>
      <button onClick={onBack} className="text-xs underline mb-4">
        ← Back to dashboard
      </button>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-3xl font-semibold">{deal.company_name || 'Untitled Company'}</h1>
                {askingPrice && (
                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-xs text-blue-600 font-medium">Asking:</span>
                    <span className="text-lg font-bold text-blue-900 ml-2">{askingPrice}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {deal.location_city && `${deal.location_city}, `}
                {deal.location_state || (deal.metadata?.address as string | undefined) || ''}
              </p>
            </div>
            <MoreActionsMenu
              dealId={deal.id}
              isArchived={isArchived}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          </div>
        </div>
        {/* Verdict Badge - Prominently displayed */}
        {verdict && (
          <div className="flex-shrink-0">
            <VerdictBadge verdict={verdict} />
          </div>
        )}
      </div>

      {/* Verdict Details Section */}
      {verdict && (verdictConfidence || verdictReason || nextAction) && (
        <div className="mb-4 p-4 rounded-lg bg-gray-50 mt-4">
          <div className="flex items-center justify-between">
            <div>
              {(verdictConfidence || verdictReason) && (
                <>
                  <div className="text-sm text-gray-500">Decision Details</div>
                  <div className="flex items-center gap-2 mt-1">
                    {verdictConfidence && (
                      <span className="text-sm text-gray-600">{verdictConfidence} confidence</span>
                    )}
                  </div>
                  {verdictReason && (
                    <div className="text-sm mt-1">{verdictReason}</div>
                  )}
                </>
              )}
            </div>
            {nextAction && (
              <div>
                <div className="text-sm text-gray-500">Next Action</div>
                <div className="text-sm font-medium mt-1">{nextAction}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deal Economics Card */}
      {(askingPrice || ebitda || sbaEligible !== null) && (
        <div className="grid grid-cols-3 gap-4 mb-4 mt-4">
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">Asking Price</div>
            <div className="text-lg font-semibold">
              {askingPrice || 'Not stated'}
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">EBITDA</div>
            <div className="text-lg font-semibold">
              {ebitda || 'Unknown'}
            </div>
          </div>
          <div className="p-3 border rounded">
            <div className="text-sm text-gray-500">SBA Eligible</div>
            <div className="text-lg font-semibold">
              {sbaEligible === true ? '✓ Yes' : sbaEligible === false ? '✗ No' : 'Unknown'}
            </div>
          </div>
        </div>
      )}

      {/* Stage Selector */}
      <div className="mb-4 mt-4">
        <label className="text-sm text-gray-500">Stage</label>
        <select 
          value={stage}
          onChange={handleStageChange}
          disabled={updatingStage}
          className="mt-1 block w-full rounded border-gray-300 px-3 py-2 border bg-white"
        >
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="follow_up">Follow-up</option>
          <option value="ioi_sent">IOI Sent</option>
          <option value="loi">LOI</option>
          <option value="dd">Due Diligence</option>
          <option value="passed">Passed</option>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={deal.source_type} />
          {isTierSource ? <TierBadge tier={tier} /> : null}

          <ConfidencePill
            icon={confidence.icon}
            label={confidence.label}
            title={confidence.reason}
            analyzed={confidence.analyzed}
            level={confidence.level}
          />

          {addedLabel ? (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
              Added {addedLabel}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <SetReminderButton
            dealId={deal.id}
            workspaceId={deal.workspace_id}
            currentDate={nextActionDate}
            currentAction={nextActionText}
            onUpdate={() => {
              router.refresh();
            }}
          />
          {canToggleSave ? (
            <button
              onClick={onToggleSave}
              disabled={savingToggle}
              className="text-xs px-3 py-1 border rounded"
              title="Save/Unsave deal"
            >
              {savingToggle ? 'Saving…' : deal.is_saved ? 'Saved ✓' : 'Save'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Compare Modal */}
      {showCompareModal && (
        <CompareDealModal
          dealId={deal.id}
          companyName={deal.company_name || 'Untitled Company'}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </section>
  );
}
