'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabaseClient';

interface PassDealModalProps {
  dealId: string;
  companyName: string;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PassDealModal({ 
  dealId, 
  companyName, 
  workspaceId,
  onClose, 
  onSuccess 
}: PassDealModalProps) {
  const [passReason, setPassReason] = useState('');
  const [passNotes, setPassNotes] = useState('');
  const [passing, setPassing] = useState(false);

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

  async function handlePass() {
    if (!passReason) {
      alert('Please select a reason for passing');
      return;
    }

    setPassing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in.');

      // Call API endpoint with pass reason and notes
      const res = await fetch(`/api/deals/${dealId}/pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pass_reason: passReason,
          pass_notes: passNotes || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to pass deal');
      }

      onSuccess();
    } catch (error) {
      console.error('Error passing deal:', error);
      alert(`Failed to pass deal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPassing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={passing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handlePass}
            disabled={passing || !passReason}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {passing ? 'Passing...' : 'Confirm Pass'}
          </button>
        </div>
      </div>
    </div>
  );
}
