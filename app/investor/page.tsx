'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Navigation } from '@/components/Navigation';
import InvestorOverview from './components/InvestorOverview';
import SearcherPerformance from './components/SearcherPerformance';
import PipelineVisibility from './components/PipelineVisibility';
import GenerateMonthlyUpdateButton from './components/GenerateMonthlyUpdateButton';
import { LinkSearcherModal } from './components/LinkSearcherModal';
import { useInvestorRealtime } from './hooks/useInvestorRealtime';
import { Skeleton } from '@/components/ui/Skeleton';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function InvestorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Listen for link modal open event from SearcherPerformance
  useEffect(() => {
    const handleOpenModal = () => {
      setShowLinkModal(true);
    };
    window.addEventListener('investor:open-link-modal', handleOpenModal);
    return () => window.removeEventListener('investor:open-link-modal', handleOpenModal);
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Use getSession() for better performance
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace('/');
        return;
      }

      // Check if user has investor role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'investor') {
        router.replace('/dashboard');
        return;
      }

      // Fetch investor dashboard data
      const token = session.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch('/api/investor/dashboard', { 
        method: 'GET',
        headers,
        cache: 'no-store', // Ensure fresh data
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Failed to load investor dashboard (${res.status})`;
        
        // Check for service role/permission errors
        const isServiceRoleError = errorMessage.toLowerCase().includes('service role') || 
                                   errorMessage.toLowerCase().includes('permission') ||
                                   errorMessage.toLowerCase().includes('access denied') ||
                                   res.status === 403;
        
        throw new Error(isServiceRoleError 
          ? 'Unable to access searcher data. This may be a temporary service issue. Please try again or contact support.'
          : errorMessage);
      }

      const data = await res.json();
      setDashboardData(data);
      setError(null); // Clear any previous errors on success
    } catch (err) {
      console.error('Investor dashboard error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investor dashboard';
      setError(errorMessage);
      
      // If we have partial data, don't clear it - just show the error
      if (!dashboardData && !isRefresh) {
        // Only clear data if this is initial load and we have no data
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, dashboardData]);

  // Extract workspace IDs from dashboard data for realtime subscriptions
  const workspaceIds = useMemo(() => {
    if (!dashboardData?.searchers) return [];
    return dashboardData.searchers
      .map((searcher: any) => searcher.workspaceId)
      .filter((id: string | null | undefined): id is string => !!id);
  }, [dashboardData]);

  // Set up realtime subscriptions to automatically update when searchers make changes
  useInvestorRealtime({
    workspaceIds,
    onUpdate: loadDashboard,
    enabled: !loading && !!dashboardData && workspaceIds.length > 0,
  });

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Skeleton */}
            <div className="mb-8">
              <Skeleton height={40} width="300px" className="mb-2" />
              <Skeleton height={24} width="400px" />
            </div>
            
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
                  <Skeleton height={16} width="60%" className="mb-2" />
                  <Skeleton height={32} width="40%" />
                </div>
              ))}
            </div>
            
            {/* Pipeline Chart Skeleton */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <Skeleton height={24} width="200px" className="mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton height={16} width="120px" />
                      <Skeleton height={16} width="100px" />
                    </div>
                    <Skeleton height={12} width="100%" rounded={true} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Activity Summary Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
                  <Skeleton height={14} width="50%" className="mb-2" />
                  <Skeleton height={32} width="30%" />
                </div>
              ))}
            </div>
            
            {/* Table Skeleton */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <Skeleton height={24} width="200px" />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton height={20} width="25%" />
                      <Skeleton height={20} width="15%" />
                      <Skeleton height={20} width="15%" />
                      <Skeleton height={20} width="15%" />
                      <Skeleton height={20} width="15%" />
                      <Skeleton height={20} width="15%" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error && !dashboardData) {
    const isServiceRoleError = error.includes('service role') || error.includes('permission') || error.includes('access');
    
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {isServiceRoleError ? 'Unable to Load Dashboard' : 'Error Loading Dashboard'}
              </h2>
              <p className="text-slate-600 mb-4">
                {isServiceRoleError 
                  ? 'We\'re having trouble accessing searcher data. This may be a temporary issue. Please try refreshing or contact support if the problem persists.'
                  : error}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => loadDashboard(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Investor Dashboard</h1>
              <p className="text-slate-600">Monitor your portfolio searchers' progress and pipeline</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => loadDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Link Searcher
              </button>
              <GenerateMonthlyUpdateButton />
            </div>
          </div>
          
          {error && dashboardData && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium mb-1">Partial data loaded</p>
                <p className="text-sm text-yellow-700">{error}</p>
              </div>
              <button
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="text-sm text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
              >
                {refreshing ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          )}
          
          {dashboardData && (
            <>
              <InvestorOverview data={dashboardData} />
              <div className="mt-8">
                <SearcherPerformance 
                  searchers={dashboardData.searchers} 
                  onSearcherUpdate={loadDashboard}
                  onLinkSearcher={() => setShowLinkModal(true)}
                />
              </div>
              <div className="mt-8">
                <PipelineVisibility dealsByStage={dashboardData.dealsByStage} />
              </div>
            </>
          )}
        </div>
      </main>
      
      <LinkSearcherModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSuccess={() => {
          // Reload dashboard data after linking searcher
          loadDashboard();
        }}
      />
    </>
  );
}
