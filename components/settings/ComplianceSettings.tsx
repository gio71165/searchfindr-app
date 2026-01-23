'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';

export function ComplianceSettings() {
  const { user, workspaceId } = useAuth();
  const [allInvestorsUS, setAllInvestorsUS] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    async function loadComplianceSettings() {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('all_investors_us_citizens')
          .eq('id', workspaceId)
          .single();

        if (error) {
          // Check if it's a "no rows" error (PGRST error code PGRST116)
          // This is fine - the workspace might not exist yet or column might not be set
          const errorCode = (error as any)?.code;
          const errorMessage = (error as any)?.message;
          
          if (errorCode === 'PGRST116' || (errorMessage && errorMessage.includes('No rows'))) {
            // Default to true if no setting exists - this is expected, no need to log
            setAllInvestorsUS(true);
            setLoading(false);
            return;
          }
          
          // Only log if error has meaningful, non-empty content
          const errorDetails = (error as any)?.details;
          const errorHint = (error as any)?.hint;
          
          // Check if we have any meaningful error information
          const hasMeaningfulError = 
            (errorCode && typeof errorCode === 'string' && errorCode.trim() !== '') ||
            (errorMessage && typeof errorMessage === 'string' && errorMessage.trim() !== '') ||
            (errorDetails && (typeof errorDetails === 'string' ? errorDetails.trim() !== '' : (errorDetails && typeof errorDetails === 'object' && Object.keys(errorDetails).length > 0))) ||
            (errorHint && typeof errorHint === 'string' && errorHint.trim() !== '');
          
          if (hasMeaningfulError) {
            // Log meaningful errors only
            const logData: Record<string, unknown> = {};
            if (errorMessage && errorMessage.trim()) logData.message = errorMessage;
            if (errorCode && errorCode.trim()) logData.code = errorCode;
            if (errorDetails) logData.details = errorDetails;
            if (errorHint && errorHint.trim()) logData.hint = errorHint;
            
            console.error('Error loading compliance settings:', logData);
          }
          // Default to true on any error (including empty errors - silently handle)
          setAllInvestorsUS(true);
          setLoading(false);
          return;
        }

        setAllInvestorsUS(data?.all_investors_us_citizens ?? true);
      } catch (error) {
        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Unexpected error loading compliance settings:', errorMessage);
        // Default to true on error
        setAllInvestorsUS(true);
      } finally {
        setLoading(false);
      }
    }

    loadComplianceSettings();
  }, [workspaceId]);

  const handleComplianceChange = async (checked: boolean) => {
    if (!workspaceId || !user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({ all_investors_us_citizens: checked })
        .eq('id', workspaceId)
        .select()
        .single();

      if (error) {
        // Extract meaningful error information
        const errorCode = (error as any)?.code;
        const errorMessage = (error as any)?.message;
        const errorDetails = (error as any)?.details;
        const errorHint = (error as any)?.hint;
        
        // Check for common RLS/permission errors
        if (errorCode === '42501' || errorMessage?.includes('permission denied') || errorMessage?.includes('row-level security')) {
          console.error('Permission denied updating compliance settings. Check RLS policies on workspaces table.', {
            code: errorCode,
            message: errorMessage,
            hint: errorHint,
          });
          showToast('Permission denied. Please check database permissions.', 'error', 4000);
          return;
        }
        
        // Log other errors with details
        if (errorMessage || errorCode || errorDetails || errorHint) {
          console.error('Error updating compliance settings:', {
            code: errorCode,
            message: errorMessage,
            details: errorDetails,
            hint: errorHint,
          });
        }
        showToast('Failed to update compliance settings', 'error', 3000);
        return;
      }

      // Verify the update worked
      if (data && data.all_investors_us_citizens === checked) {
        setAllInvestorsUS(checked);
        showToast(
          checked 
            ? 'Compliance setting updated' 
            : 'Warning: SBA compliance disabled',
          checked ? 'success' : 'error',
          3000
        );
      } else {
        // Update didn't apply - might be RLS or column doesn't exist
        console.warn('Update returned but value not changed. Check if column exists and RLS policies allow updates.');
        showToast('Update may not have applied. Please refresh and try again.', 'error', 4000);
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Unexpected error updating compliance settings:', errorMessage);
      showToast('Failed to update compliance settings', 'error', 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">SBA Compliance</h3>
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-2">SBA Compliance</h3>
      <p className="text-sm text-slate-600 mb-4">
        SBA 7(a) loans require 100% U.S. ownership. All investors must be U.S. citizens or permanent residents.
      </p>
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="all-investors-us"
            checked={allInvestorsUS}
            onChange={(e) => handleComplianceChange(e.target.checked)}
            disabled={saving}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label 
            htmlFor="all-investors-us" 
            className="text-sm text-slate-700 cursor-pointer"
          >
            All investors are U.S. citizens or permanent residents
          </label>
        </div>

        {!allInvestorsUS && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Warning:</strong> SBA 7(a) loans require 100% U.S. ownership. Your current investor structure may not qualify. Consider conventional financing.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Deals will default to Conventional financing in your models when this setting is unchecked.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
