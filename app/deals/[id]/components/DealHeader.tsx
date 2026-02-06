'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
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
import { exportDealToPDF } from '@/lib/pdf/exportDealPDF';
import { JargonTooltip } from '@/components/ui/JargonTooltip';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  
  const config = {
    proceed: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Proceed' },
    park: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Parked' },
    pass: { bg: 'bg-slate-600/50', text: 'text-slate-300', label: 'Passed' }
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
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [loadingCimPreview, setLoadingCimPreview] = useState(false);
  
  const isArchived = Boolean(deal.archived_at);
  const showViewCimPdf = deal?.source_type === 'cim_pdf' && !!(deal as any).cim_storage_path;
  
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

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    
    setIsExportingPDF(true);
    try {
      await exportDealToPDF(deal, financialAnalysis);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(error instanceof Error ? error.message : 'Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

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

  return (
    <section>
      <button onClick={onBack} className="text-sm text-slate-300 hover:text-slate-50 underline mb-4 transition-colors">
        ← Back to dashboard
      </button>
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-3xl font-semibold text-slate-50">{deal.company_name || 'Untitled Company'}</h1>
                {askingPrice && (
                  <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <span className="text-xs text-emerald-400 font-medium">Asking:</span>
                    <span className="text-lg font-bold text-slate-50 ml-2">{askingPrice}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-slate-400">
                {deal.location_city && `${deal.location_city}, `}
                {deal.location_state || (deal.metadata?.address as string | undefined) || ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showViewCimPdf && (
                <AsyncButton
                  onClick={handleViewCimPdf}
                  isLoading={loadingCimPreview}
                  loadingText="Opening..."
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-200 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                  title="Open CIM PDF to verify citations (e.g. page numbers)"
                >
                  <FileText className="h-4 w-4" />
                  View CIM PDF
                </AsyncButton>
              )}
              <AsyncButton
                onClick={handleExportPDF}
                isLoading={isExportingPDF}
                loadingText="Generating..."
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
                title="Export to PDF"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </AsyncButton>
              <MoreActionsMenu
                dealId={deal.id}
                isArchived={isArchived}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </div>
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
        <div className="mb-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700 mt-4">
          <div className="flex items-center justify-between">
            <div>
              {(verdictConfidence || verdictReason) && (
                <>
                  <div className="text-sm text-slate-400">Decision Details</div>
                  <div className="flex items-center gap-2 mt-1">
                    {verdictConfidence && (
                      <span className="text-sm text-slate-300">{verdictConfidence} confidence</span>
                    )}
                  </div>
                  {verdictReason && (
                    <div className="text-sm text-slate-300 mt-1">{verdictReason}</div>
                  )}
                </>
              )}
            </div>
            {nextAction && (
              <div>
                <div className="text-sm text-slate-400">Next Action</div>
                <div className="text-sm font-medium text-slate-50 mt-1">{nextAction}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deal Economics Card */}
      {(askingPrice || ebitda || sbaEligible !== null) && (
        <div className="grid grid-cols-3 gap-4 mb-4 mt-4">
          <div className="p-3 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="text-sm text-slate-400">Asking Price</div>
            <div className="text-lg font-semibold text-slate-50">
              {askingPrice || 'Unknown'}
            </div>
          </div>
          <div className="p-3 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="text-sm text-slate-400">
              <JargonTooltip term="EBITDA">EBITDA</JargonTooltip>
            </div>
            <div className="text-lg font-semibold text-slate-50">
              {ebitda || 'Unknown'}
            </div>
          </div>
          <div className="p-3 border border-slate-700 rounded-lg bg-slate-800/50">
            <div className="text-sm text-slate-400">
              <JargonTooltip term="SBA">SBA</JargonTooltip> Eligible
            </div>
            <div className="text-lg font-semibold text-slate-50">
              {sbaEligible === true ? '✓ Yes' : sbaEligible === false ? '✗ No' : 'Unknown'}
            </div>
          </div>
        </div>
      )}

      {/* Stage Selector */}
      <div className="mb-4 mt-4">
        <label className="text-sm text-slate-400">Stage</label>
        <select 
          value={stage}
          onChange={handleStageChange}
          disabled={updatingStage}
          className="mt-1 block w-full rounded border border-slate-600 px-3 py-2 bg-slate-900 text-slate-50"
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
            <span className="inline-flex items-center rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-400">
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
              className="text-xs px-3 py-1 border border-slate-600 rounded bg-slate-800 text-slate-200 hover:bg-slate-700"
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
