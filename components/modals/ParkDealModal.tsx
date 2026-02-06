'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { LoadingDots } from '@/components/ui/LoadingSpinner';

interface ParkDealModalProps {
  dealId: string;
  companyName: string;
  workspaceId: string;
  sessionDurationSeconds?: number | null;
  brokerName?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParkDealModal({
  dealId,
  companyName,
  workspaceId,
  sessionDurationSeconds,
  brokerName,
  onClose,
  onSuccess,
}: ParkDealModalProps) {
  const [searcherInputText, setSearcherInputText] = useState('');
  const [gutCheckRating, setGutCheckRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  async function handleSubmit() {
    if (!searcherInputText.trim()) {
      alert('Please provide a one-sentence explanation for parking.');
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in.');

      const res = await fetch(`/api/deals/${dealId}/verdict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          verdict_type: 'park',
          searcher_input_text: searcherInputText.trim(),
          searcher_rating: gutCheckRating,
          context_metadata: {
            session_duration_seconds: sessionDurationSeconds ?? undefined,
            broker_name: brokerName ?? undefined,
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to set Park');
      }
      showToast('Marked as Park', 'info');
      onSuccess();
    } catch (e) {
      console.error('Park error:', e);
      showToast(e instanceof Error ? e.message : 'Failed to set Park', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full my-auto">
        <h2 className="text-xl font-bold text-slate-50 mb-4">Park {companyName}?</h2>
        <p className="text-sm text-slate-400 mb-4">In one sentence, why are you parking this deal? (Used to improve our deal scoring.)</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-2">One-sentence reason <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={searcherInputText}
            onChange={(e) => setSearcherInputText(e.target.value)}
            placeholder="e.g. Waiting on management call before deciding"
            maxLength={500}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-slate-300 placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-400 mb-2">How confident are you in this decision? <span className="text-red-400">*</span></label>
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

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="btn-ghost flex-1 min-h-[44px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !searcherInputText.trim()}
            className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <><LoadingDots /> Setting…</> : 'Confirm Park'}
          </button>
        </div>
      </div>
    </div>
  );
}
