'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';

export function ProfileSettings() {
  const { user, workspaceId } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyWorkspaceId = async () => {
    if (!workspaceId) return;
    
    try {
      await navigator.clipboard.writeText(workspaceId);
      setCopied(true);
      showToast('Workspace ID copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy workspace ID', 'error', 2000);
    }
  };

  return (
    <div className="p-6 bg-slate-800/50 rounded-lg border border-slate-600">
      <h3 className="font-semibold text-slate-50 mb-4">Profile Information</h3>
      <p className="text-sm text-slate-400 mb-4">
        Your account details. Share your workspace ID with investors who want to link to your account.
      </p>
      
      <div className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Email Address
          </label>
          <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-slate-100">
            {user?.email || 'Not available'}
          </div>
        </div>

        {/* Workspace ID */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Workspace ID
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-sm text-slate-100 font-mono break-all">
              {workspaceId || 'Not available'}
            </div>
            {workspaceId && (
              <button
                onClick={handleCopyWorkspaceId}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                title="Copy workspace ID"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Share this ID with investors who want to link to your account
          </p>
        </div>
      </div>
    </div>
  );
}
