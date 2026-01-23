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
  onClose: () => void;
  onSuccess: () => void;
}

export function PassDealModal({ 
  dealId, 
  companyName, 
  workspaceId,
  deal,
  onClose, 
  onSuccess 
}: PassDealModalProps) {
  const [passReason, setPassReason] = useState('');
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

      // Prepare request body
      const requestBody: {
        pass_reason: string;
        pass_notes?: string | null;
        broker_feedback?: string | null;
      } = {
        pass_reason: passReason,
        pass_notes: passNotes || null,
      };

      // Include broker feedback if generated
      if (generateFeedback && brokerFeedback) {
        requestBody.broker_feedback = brokerFeedback;
      }

      // Call API endpoint with pass reason and notes
      const res = await fetch(`/api/deals/${dealId}/pass`, {
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full my-auto">
          <h2 id="pass-modal-title" className="text-lg sm:text-xl font-semibold mb-4">
            Pass {companyName}?
          </h2>
          
          <p className="text-sm text-gray-600 mb-4">
            Document why you're passing to avoid re-evaluating this deal later.
          </p>

          {/* Reason Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why are you passing? <span className="text-red-500">*</span>
            </label>
            <select
              value={passReason}
              onChange={(e) => setPassReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
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

          {/* Generate Broker Feedback Checkbox */}
          {deal && deal.broker_id && (
            <div className="mb-4">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generateFeedback}
                  onChange={(e) => setGenerateFeedback(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Generate broker feedback note
                </span>
              </label>
            </div>
          )}

          {/* Broker Feedback Preview */}
          {generateFeedback && brokerFeedback && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Feedback Note Preview
                </label>
                <button
                  onClick={handleCopyFeedback}
                  className="text-xs px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors min-h-[44px]"
                >
                  Copy Note
                </button>
              </div>
              <textarea
                value={brokerFeedback}
                readOnly
                rows={6}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-800 resize-none focus:outline-none"
              />
            </div>
          )}

          {/* Additional Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional notes (optional)
            </label>
            <textarea
              value={passNotes}
              onChange={(e) => setPassNotes(e.target.value)}
              placeholder="Any other details to remember..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              disabled={passing}
              className="flex-1 px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 touch-manipulation font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePass}
              disabled={passing || !passReason}
              className="flex-1 px-4 py-3 min-h-[44px] bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 touch-manipulation font-medium flex items-center justify-center gap-2"
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
