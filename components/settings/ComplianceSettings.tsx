'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function ComplianceSettings() {
  const { user } = useAuth();
  const [isSbaCompliant, setIsSbaCompliant] = useState<boolean>(false);
  const [isCitizenOrResident, setIsCitizenOrResident] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function createProfileIfMissing(userId: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          sba_compliant: false,
          is_citizen_or_resident: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });
      
      if (error) {
        logger.error('Failed to create profile:', error);
      } else {
        logger.info('Profile created successfully');
      }
    } catch (e) {
      logger.error('Error creating profile:', e);
    }
  }

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function loadComplianceSettings() {
      if (!user) return;
      
      setIsLoading(true);
      setLoadError(null);
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('sba_compliant, is_citizen_or_resident')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading compliance settings:', {
            error,
            errorMessage: error?.message,
            errorDetails: error?.details,
            errorHint: error?.hint,
            errorCode: error?.code,
            userId: user?.id
          });
          
          // Check if this is an RLS policy issue or missing profile
          if (error?.code === 'PGRST116' || error?.message?.includes('policy') || error?.message?.includes('No rows')) {
            console.warn('RLS policy blocking profile read or profile missing - creating profile');
            // Try to create profile if it doesn't exist
            await createProfileIfMissing(user.id);
            // Try to reload after creating
            const { data: retryData } = await supabase
              .from('profiles')
              .select('sba_compliant, is_citizen_or_resident')
              .eq('id', user.id)
              .single();
            
            if (retryData) {
              setIsSbaCompliant(retryData.sba_compliant ?? false);
              setIsCitizenOrResident(retryData.is_citizen_or_resident ?? false);
              setIsLoading(false);
              return;
            }
          }
          
          // Default to FALSE on error (let users opt in, not force it)
          setIsSbaCompliant(false);
          setIsCitizenOrResident(false);
          setLoadError('Could not load your compliance settings. Please refresh the page.');
        } else {
          // Successfully loaded
          setIsSbaCompliant(data?.sba_compliant ?? false);
          setIsCitizenOrResident(data?.is_citizen_or_resident ?? false);
        }
      } catch (error) {
        // Handle unexpected errors
        console.error('Unexpected error loading compliance settings:', {
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          userId: user?.id
        });
        // Default to FALSE on error (let users opt in, not force it)
        setIsSbaCompliant(false);
        setIsCitizenOrResident(false);
        setLoadError('Could not load your compliance settings. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    }

    loadComplianceSettings();
  }, [user]);

  const handleSbaComplianceChange = async (checked: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ sba_compliant: checked })
        .eq('id', user.id)
        .select('sba_compliant')
        .single();

      if (error) {
        console.error('Error updating SBA compliance:', {
          error,
          errorMessage: error?.message,
          errorDetails: error?.details,
          errorHint: error?.hint,
          errorCode: error?.code,
          userId: user?.id
        });
        
        // Check for common RLS/permission errors
        if (error?.code === '42501' || error?.message?.includes('permission denied') || error?.message?.includes('row-level security')) {
          showToast('Permission denied. Please check database permissions.', 'error', 4000);
          return;
        }
        
        showToast('Failed to update SBA compliance setting', 'error', 3000);
        return;
      }

      // Verify the update worked
      if (data && data.sba_compliant === checked) {
        setIsSbaCompliant(checked);
        showToast('SBA compliance setting updated', 'success', 2000);
      } else {
        console.warn('Update returned but value not changed. Check if column exists and RLS policies allow updates.');
        showToast('Update may not have applied. Please refresh and try again.', 'error', 4000);
      }
    } catch (error) {
      console.error('Unexpected error updating SBA compliance:', error);
      showToast('Failed to update SBA compliance setting', 'error', 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCitizenResidentChange = async (checked: boolean) => {
    if (!user) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_citizen_or_resident: checked })
        .eq('id', user.id)
        .select('is_citizen_or_resident')
        .single();

      if (error) {
        console.error('Error updating citizen/resident status:', {
          error,
          errorMessage: error?.message,
          errorDetails: error?.details,
          errorHint: error?.hint,
          errorCode: error?.code,
          userId: user?.id
        });
        
        // Check for common RLS/permission errors
        if (error?.code === '42501' || error?.message?.includes('permission denied') || error?.message?.includes('row-level security')) {
          showToast('Permission denied. Please check database permissions.', 'error', 4000);
          return;
        }
        
        showToast('Failed to update citizen/resident status', 'error', 3000);
        return;
      }

      // Verify the update worked
      if (data && data.is_citizen_or_resident === checked) {
        setIsCitizenOrResident(checked);
        showToast('Citizen/resident status updated', 'success', 2000);
      } else {
        console.warn('Update returned but value not changed. Check if column exists and RLS policies allow updates.');
        showToast('Update may not have applied. Please refresh and try again.', 'error', 4000);
      }
    } catch (error) {
      console.error('Unexpected error updating citizen/resident status:', error);
      showToast('Failed to update citizen/resident status', 'error', 3000);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">SBA Compliance</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <LoadingSpinner size="md" className="mb-2" />
            <p className="text-sm text-slate-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="font-semibold text-slate-900 mb-2">SBA Compliance</h3>
      <p className="text-sm text-slate-600 mb-4">
        SBA 7(a) loans require 100% U.S. ownership. All investors must be U.S. citizens or permanent residents.
      </p>
      
      {loadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {loadError}
          <button 
            onClick={() => window.location.reload()} 
            className="ml-2 underline hover:no-underline"
          >
            Refresh
          </button>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="is-citizen-resident"
            checked={isCitizenOrResident}
            onChange={(e) => handleCitizenResidentChange(e.target.checked)}
            disabled={isLoading || isSaving}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label 
            htmlFor="is-citizen-resident" 
            className="text-sm text-slate-700 cursor-pointer"
          >
            I am a U.S. citizen or permanent resident
          </label>
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="sba-compliant"
            checked={isSbaCompliant}
            onChange={(e) => handleSbaComplianceChange(e.target.checked)}
            disabled={isLoading || isSaving}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
          />
          <label 
            htmlFor="sba-compliant" 
            className="text-sm text-slate-700 cursor-pointer"
          >
            All investors are U.S. citizens or permanent residents (SBA compliant)
          </label>
        </div>

        {!isSbaCompliant && (
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
