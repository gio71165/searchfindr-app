'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/app/supabaseClient';
import { generateBrokerFeedbackSync } from '@/lib/ai/generate-broker-feedback';
import { showToast } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { UndoToast } from '@/components/ui/UndoToast';
import type { Deal } from '@/lib/types/deal';

interface PassDealModalProps {
  dealId: string;
  companyName: string;
  workspaceId: string;
  deal?: Deal | null; // Optional deal object for feedback generation
  /** Seconds spent on deal page since last opened (for training_data context_metadata). */
  sessionDurationSeconds?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function PassDealModal({ 
  dealId, 
  companyName, 
  workspaceId,
  deal,
  sessionDurationSeconds,
  onClose, 
  onSuccess 
}: PassDealModalProps) {
  const [passReason, setPassReason] = useState('');
  const [passReasonSentence, setPassReasonSentence] = useState('');
  const [gutCheckRating, setGutCheckRating] = useState<number>(5);
  const [passNotes, setPassNotes] = useState('');
  const [passing, setPassing] = useState(false);
  const [generateFeedback, setGenerateFeedback] = useState(true);
  const [brokerFeedback, setBrokerFeedback] = useState<string>('');
  const [brokerName, setBrokerName] = useState<string | null>(null);
  const [loadingBroker, setLoadingBroker] = useState(false);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const passTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const passReasons = [
    'Too expensive / Wrong valuation',
    'Customer concentration too high',
    'Owner not really retiring / succession unclear',
    'Industry declining or unattractive',
    'Location - would require relocation',
    'Deal too small (below search criteria)',
    'Deal too large / Not SBA eligible',
    'Insufficient information / Poor CIM quality',
    'Financial irregularities / QoE concerns',
    'Technology/operational obsolescence',
    'Competitive position weak',
    'Growth concerns / declining revenue',
    'Management team issues',
    'Legal/regulatory concerns',
    'Other'
  ];

  // Load broker name if deal has broker_id
  useEffect(() => {
    async function loadBrokerName() {
      if (!deal?.broker_id || !workspaceId) {
        setBrokerName(null);
        return;
      }

      setLoadingBroker(true);
      try {
        const { data, error } = await supabase
          .from('brokers')
          .select('name')
          .eq('id', deal.broker_id)
          .eq('workspace_id', workspaceId)
          .single();

        if (!error && data) {
          setBrokerName(data.name);
        } else {
          setBrokerName(null);
        }
      } catch (error) {
        console.error('Error loading broker name:', error);
        setBrokerName(null);
      } finally {
        setLoadingBroker(false);
      }
    }

    loadBrokerName();
  }, [deal?.broker_id, workspaceId]);

  // Generate feedback when reason or deal changes
  useEffect(() => {
    if (generateFeedback && deal && passReason) {
      const feedback = generateBrokerFeedbackSync(deal, passReason, brokerName);
      setBrokerFeedback(feedback);
    } else {
      setBrokerFeedback('');
    }
  }, [generateFeedback, deal, passReason, brokerName]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !passing) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, passing]);

  async function handleCopyFeedback() {
    if (!brokerFeedback) return;

    try {
      await navigator.clipboard.writeText(brokerFeedback);
      showToast('Broker feedback copied!', 'success');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showToast('Failed to copy to clipboard', 'error');
    }
  }

  async function actuallyPassDeal() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      const requestBody = {
        verdict_type: 'pass' as const,
        searcher_input_text: passReasonSentence.trim(),
        searcher_rating: gutCheckRating,
        context_metadata: {
          session_duration_seconds: sessionDurationSeconds ?? undefined,
          broker_name: brokerName ?? undefined,
        },
        pass_reason: passReason,
        pass_notes: passNotes || null,
        broker_feedback: (generateFeedback && brokerFeedback) ? brokerFeedback : undefined,
      };

      const res = await fetch(`/api/deals/${dealId}/verdict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to pass deal');
      }

      onSuccess();
      showToast('Deal marked as Pass', 'success');
    } catch (error) {
      console.error('Error passing deal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Failed to pass deal: ${errorMessage}`, 'error', 5000, {
        label: 'Retry',
        onClick: handlePass
      });
    } finally {
      setPassing(false);
    }
  }

  async function handlePass() {
    if (!passReason) {
      alert('Please select a reason for passing');
      return;
    }
    if (!passReasonSentence.trim()) {
      alert('Please provide a one-sentence reason (used to improve our deal scoring).');
      return;
    }

    // Clear any existing timeout
    if (passTimeoutRef.current) {
      clearTimeout(passTimeoutRef.current);
    }

    setPassing(true);
    setShowUndoToast(true);
    
    // Close the modal immediately
    onClose();
    
    // Wait 5 seconds, then actually pass it
    passTimeoutRef.current = setTimeout(async () => {
      await actuallyPassDeal();
      setShowUndoToast(false);
      passTimeoutRef.current = null;
    }, 5000);
  }

  function handleUndo() {
    // Cancel the pending pass
    if (passTimeoutRef.current) {
      clearTimeout(passTimeoutRef.current);
      passTimeoutRef.current = null;
    }
    setShowUndoToast(false);
    setPassing(false);
    showToast('Pass action cancelled', 'success');
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (passTimeoutRef.current) {
        clearTimeout(passTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full my-auto">
          <h2 id="pass-modal-title" className="text-xl font-bold text-slate-50 mb-4">
            Pass {companyName}?
          </h2>
          
          <p className="text-sm text-slate-400 mb-4">
            Document why you're passing to avoid re-evaluating this deal later.
          </p>

          {/* Reason Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Why are you passing? <span className="text-red-400">*</span>
            </label>
            <select
              value={passReason}
              onChange={(e) => setPassReason(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 touch-manipulation"
              required
            >
              <option value="">Select a reason...</option>
              {passReasons.map(reason => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* One-sentence reason for ML training */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              In one sentence, why are you passing? <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-1">Used to improve our deal scoring model.</p>
            <input
              type="text"
              value={passReasonSentence}
              onChange={(e) => setPassReasonSentence(e.target.value)}
              placeholder="e.g. Customer concentration too high for our criteria"
              maxLength={500}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          {/* Gut Check: How confident in this decision? */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              How confident are you in this decision? <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={gutCheckRating}
                onChange={(e) => setGutCheckRating(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-slate-300 font-medium w-8">{gutCheckRating}/10</span>
            </div>
          </div>

          {/* Generate Broker Feedback Checkbox */}
          {deal && deal.broker_id && (
            <div className="mb-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateFeedback}
                  onChange={(e) => setGenerateFeedback(e.target.checked)}
                  className="mt-1 h-4 w-4 text-emerald-600 border-slate-600 rounded focus:ring-emerald-500 bg-slate-900"
                />
                <span className="text-sm font-medium text-slate-400">
                  Generate broker feedback note
                </span>
              </label>
            </div>
          )}

          {/* Broker Feedback Preview */}
          {generateFeedback && brokerFeedback && (
            <div className="mb-4 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-400">
                  Feedback Note Preview
                </label>
                <button
                  onClick={handleCopyFeedback}
                  className="btn-secondary btn-sm min-h-[44px]"
                >
                  Copy Note
                </button>
              </div>
              <textarea
                value={brokerFeedback}
                readOnly
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 resize-none focus:outline-none"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Additional notes (optional)
            </label>
            <textarea
              value={passNotes}
              onChange={(e) => setPassNotes(e.target.value)}
              placeholder="Any other details to remember..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={passing}
              className="btn-ghost flex-1 min-h-[44px] touch-manipulation"
            >
              Cancel
            </button>
            <button
              onClick={handlePass}
              disabled={passing || !passReason || !passReasonSentence.trim()}
              className="btn-danger flex-1 min-h-[44px] touch-manipulation flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {passing ? (
                <>
                  <LoadingDots />
                  <span>Passing...</span>
                </>
              ) : (
                'Confirm Pass'
              )}
            </button>
          </div>
        </div>
      </div>
      {showUndoToast && (
        <UndoToast
          message="Deal marked as Pass"
          onUndo={handleUndo}
          onClose={() => setShowUndoToast(false)}
        />
      )}
    </>
  );
}
