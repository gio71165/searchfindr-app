'use client';

import { useState } from 'react';
import { Download, X, CheckCircle, ArrowRight, FileDown, Archive, Trash2 } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';

type Stage = 'new' | 'reviewing' | 'follow_up' | 'ioi_sent' | 'loi' | 'dd' | 'passed';

interface BulkActionsBarProps {
  selectedDealIds: Set<string>;
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function BulkActionsBar({ selectedDealIds, onClearSelection, onRefresh }: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStageMenu, setShowStageMenu] = useState(false);

  const stages: { value: Stage; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'reviewing', label: 'Reviewing' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'ioi_sent', label: 'IOI Sent' },
    { value: 'loi', label: 'LOI' },
    { value: 'dd', label: 'Due Diligence' },
    { value: 'passed', label: 'Passed' },
  ];

  const handleBulkPass = async () => {
    if (selectedDealIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to mark ${selectedDealIds.size} deal(s) as Pass?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch('/api/deals/bulk-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark deals as pass');
      }

      showToast(`Marked ${selectedDealIds.size} deal(s) as Pass`, 'success');
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Bulk pass error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to mark deals as pass', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStageChange = async (stage: Stage) => {
    if (selectedDealIds.size === 0) return;
    
    setIsProcessing(true);
    setShowStageMenu(false);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch('/api/deals/bulk-stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
          stage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update deal stages');
      }

      const stageLabel = stages.find(s => s.value === stage)?.label || stage;
      showToast(`Moved ${selectedDealIds.size} deal(s) to ${stageLabel}`, 'success');
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Bulk stage change error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to update deal stages', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkArchive = async () => {
    if (selectedDealIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to archive ${selectedDealIds.size} deal(s)? You can unarchive them later from the archived section.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch('/api/deals/bulk-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive deals');
      }

      const result = await response.json();
      showToast(`Archived ${result.successCount || selectedDealIds.size} deal(s) successfully`, 'success');
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Bulk archive error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to archive deals', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDealIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Permanently delete ${selectedDealIds.size} deal(s)?\n\nThis action cannot be undone. All documents, activities, and data associated with these deals will be permanently removed.`
    );
    if (!confirmed) return;

    // Double confirmation for delete
    const doubleConfirm = window.confirm(
      `Are you absolutely sure? Type "DELETE" to confirm.\n\nThis will permanently delete ${selectedDealIds.size} deal(s) and all associated data.`
    );
    if (!doubleConfirm) return;

    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch('/api/deals/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealIds: Array.from(selectedDealIds),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete deals');
      }

      const result = await response.json();
      showToast(`Deleted ${result.successCount || selectedDealIds.size} deal(s) successfully`, 'success');
      onClearSelection();
      onRefresh();
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to delete deals', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    if (selectedDealIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const response = await fetch(`/api/deals/bulk-export?ids=${Array.from(selectedDealIds).join(',')}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export deals');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deals_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${selectedDealIds.size} deal(s) to CSV`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast(error instanceof Error ? error.message : 'Failed to export deals', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedDealIds.size === 0) return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-blue-900">
          {selectedDealIds.size} deal{selectedDealIds.size !== 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {/* Archive */}
        <button
          onClick={handleBulkArchive}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Archive className="h-4 w-4" />
          Archive
        </button>

        {/* Mark as Pass */}
        <button
          onClick={handleBulkPass}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4" />
          Pass
        </button>

        {/* Delete */}
        <button
          onClick={handleBulkDelete}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>

        {/* Move to Stage */}
        <div className="relative">
          <button
            onClick={() => setShowStageMenu(!showStageMenu)}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4" />
            Move to Stage
          </button>
          
          {showStageMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowStageMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20">
                {stages.map((stage) => (
                  <button
                    key={stage.value}
                    onClick={() => handleBulkStageChange(stage.value)}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {stage.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Export CSV */}
        <button
          onClick={handleExportCSV}
          disabled={isProcessing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          disabled={isProcessing}
          className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
