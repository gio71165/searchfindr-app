'use client';

import { useState } from 'react';
import { FileDown, Calendar, Users } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { supabase } from '@/app/supabaseClient';

interface GenerateReportButtonProps {
  type: 'weekly' | 'monthly';
  searcherId?: string;
  workspaceId?: string;
  searcherName?: string;
  bulk?: boolean;
}

export function GenerateReportButton({ 
  type, 
  searcherId, 
  workspaceId, 
  searcherName,
  bulk = false 
}: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      let url = `/api/investor/reports/${type}?`;
      if (bulk) {
        url += 'bulk=true';
      } else if (searcherId && workspaceId) {
        url += `searcherId=${searcherId}&workspaceId=${workspaceId}`;
      } else {
        throw new Error('Missing required parameters');
      }
      
      // Open in new window for printing/downloading
      window.open(url, '_blank');
    } catch (error) {
      console.error(`Error generating ${type} report:`, error);
      alert(`Failed to generate ${type} report. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const label = bulk 
    ? `Generate ${type === 'weekly' ? 'Weekly' : 'Monthly'} Report (All Searchers)`
    : `Generate ${type === 'weekly' ? 'Weekly' : 'Monthly'} Report`;

  return (
    <AsyncButton
      onClick={handleGenerate}
      isLoading={loading}
      loadingText="Generating..."
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
    >
      {type === 'weekly' ? <Calendar className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
      {label}
    </AsyncButton>
  );
}
