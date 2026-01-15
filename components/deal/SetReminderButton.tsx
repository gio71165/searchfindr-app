'use client';

import { useState } from 'react';
import { supabase } from '@/app/supabaseClient';

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
      const { error } = await supabase
        .from('companies')
        .update({
          next_action_date: date,
          next_action: action || 'Follow up',
          reminded_at: null, // Reset reminder flag
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('deal_activities')
          .insert({
            workspace_id: workspaceId,
            deal_id: dealId,
            user_id: user.id,
            activity_type: 'reminder_set',
            description: `Reminder set for ${new Date(date).toLocaleDateString()}: ${action || 'Follow up'}`,
            metadata: {
              reminder_date: date,
              action
            }
          });
      }

      setShowModal(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error setting reminder:', error);
      alert('Failed to set reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    try {
      await supabase
        .from('companies')
        .update({
          next_action_date: null,
          next_action: null,
          reminded_at: null
        })
        .eq('id', dealId)
        .eq('workspace_id', workspaceId);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error clearing reminder:', error);
      alert('Failed to clear reminder. Please try again.');
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
      >
        {currentDate ? '📅 Edit Reminder' : '📅 Set Reminder'}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Set Reminder</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow up on:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What to do:
              </label>
              <input
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="e.g., Follow up with broker"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !date}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
