'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabaseClient';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface SetReminderButtonProps {
  dealId: string;
  workspaceId: string;
  currentDate?: string | null;
  currentAction?: string | null;
  onUpdate?: () => void;
}

export function SetReminderButton({ 
  dealId, 
  workspaceId,
  currentDate, 
  currentAction,
  onUpdate 
}: SetReminderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(currentDate || '');
  const [action, setAction] = useState(currentAction || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!date) {
      alert('Please select a date');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to set reminders');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          action: action || 'Follow up',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to set reminder' }));
        throw new Error(error.error || 'Failed to set reminder');
      }

      setShowModal(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert(error instanceof Error ? error.message : 'Failed to set reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to clear reminders');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/reminder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clear: true }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to clear reminder' }));
        throw new Error(error.error || 'Failed to clear reminder');
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error clearing reminder:', error);
      alert(error instanceof Error ? error.message : 'Failed to clear reminder. Please try again.');
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
      >
        {currentDate ? '📅 Edit Reminder' : '📅 Set Reminder'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">Set Reminder</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Follow up on:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What to do:
              </label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g., Follow up with broker"
                className="w-full border border-slate-300 bg-white text-slate-900 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex gap-3">
              {currentDate && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <AsyncButton
                onClick={handleSave}
                isLoading={saving}
                loadingText="Saving..."
                disabled={!date}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
