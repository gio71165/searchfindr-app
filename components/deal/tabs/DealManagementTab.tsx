'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { BrokerSelector } from '@/components/deal/BrokerSelector';
import { StagePlaybook } from '@/components/deal/StagePlaybook';
import type { Deal } from '@/lib/types/deal';
import { Settings } from 'lucide-react';

interface DealManagementTabProps {
  deal: Deal;
  dealId: string;
  onRefresh?: () => void;
}

export function DealManagementTab({ deal, dealId, onRefresh }: DealManagementTabProps) {
  const [editingWorkflow, setEditingWorkflow] = useState(false);
  const [nextAction, setNextAction] = useState(deal.next_action || '');
  const [reminderDate, setReminderDate] = useState(
    deal.next_action_date ? new Date(deal.next_action_date).toISOString().split('T')[0] : ''
  );
  // Local state for stage to allow immediate UI updates
  const [localStage, setLocalStage] = useState(deal.stage || 'new');

  // Sync localStage when deal prop changes
  useEffect(() => {
    setLocalStage(deal.stage || 'new');
  }, [deal.stage]);

  useEffect(() => {
    setNextAction(deal.next_action || '');
  }, [deal.next_action]);

  useEffect(() => {
    if (deal.next_action_date) {
      setReminderDate(new Date(deal.next_action_date).toISOString().split('T')[0]);
    } else {
      setReminderDate('');
    }
  }, [deal.next_action_date]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-900">Deal Management</h2>
      </div>

      <div className="space-y-6">
        {/* Broker */}
        <div className="border rounded-lg p-4 sm:p-6 bg-white">
          <h3 className="text-base font-semibold mb-4">Broker</h3>
          <BrokerSelector dealId={dealId} currentBrokerId={deal.broker_id} />
        </div>

        {/* Deal Workflow */}
        <div className="border rounded-lg p-4 sm:p-6 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold">Deal Workflow</h3>
            <button 
              onClick={() => setEditingWorkflow(!editingWorkflow)}
              className="text-sm text-blue-600 hover:text-blue-800 min-h-[44px] px-3 touch-manipulation"
            >
              {editingWorkflow ? 'Done' : 'Edit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stage
              </label>
              {editingWorkflow ? (
                <select
                  value={localStage}
                  onChange={async (e) => {
                    const newStage = e.target.value;
                    // Optimistic update
                    setLocalStage(newStage);
                    try {
                      await supabase
                        .from('companies')
                        .update({ 
                          stage: newStage,
                          last_action_at: new Date().toISOString()
                        })
                        .eq('id', deal.id);
                      // Refresh deal data to sync with server
                      await onRefresh?.();
                    } catch (error) {
                      // Revert on error
                      setLocalStage(deal.stage || 'new');
                      console.error('Error updating stage:', error);
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="new">New</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="ioi_sent">IOI Sent</option>
                  <option value="loi">LOI</option>
                  <option value="dd">Due Diligence</option>
                  <option value="passed">Passed</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                </select>
              ) : (
                <div className="text-base font-medium capitalize">
                  {localStage?.replace(/_/g, ' ') || 'New'}
                </div>
              )}
            </div>

            {/* Next Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Action
              </label>
              {editingWorkflow ? (
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  onBlur={async () => {
                    await supabase
                      .from('companies')
                      .update({ next_action: nextAction })
                      .eq('id', deal.id);
                    await onRefresh?.();
                  }}
                  placeholder="e.g., Call broker to clarify revenue"
                  className="w-full border rounded-lg px-3 py-2"
                />
              ) : (
                <div className="text-base">
                  {deal.next_action || <span className="text-gray-400">Not set</span>}
                </div>
              )}
            </div>

            {/* Reminder Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Date
              </label>
              {editingWorkflow ? (
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  onBlur={async () => {
                    await supabase
                      .from('companies')
                      .update({ next_action_date: reminderDate || null })
                      .eq('id', deal.id);
                    await onRefresh?.();
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                />
              ) : (
                <div className="text-base">
                  {deal.next_action_date 
                    ? new Date(deal.next_action_date).toLocaleDateString()
                    : <span className="text-gray-400">Not set</span>
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stage Playbook */}
        <StagePlaybook stage={localStage} dealId={dealId} />
      </div>
    </div>
  );
}
