'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { Navigation } from '@/components/Navigation';
import InvestorOverview from './components/InvestorOverview';
import SearcherPerformance from './components/SearcherPerformance';
import PipelineVisibility from './components/PipelineVisibility';
import GenerateMonthlyUpdateButton from './components/GenerateMonthlyUpdateButton';
import { LinkSearcherModal } from './components/LinkSearcherModal';

export default function InvestorDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
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
        throw new Error(errorData.error || `Failed to load investor dashboard (${res.status})`);
      }

      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Investor dashboard error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load investor dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading investor dashboard…</p>
        </main>
      </>
    );
  }

  if (error && !dashboardData) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
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
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Investor Dashboard</h1>
              <p className="text-slate-600">Monitor your portfolio searchers' progress and pipeline</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLinkModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Link Searcher
              </button>
              <GenerateMonthlyUpdateButton />
            </div>
          </div>
          
          {dashboardData && (
            <>
              <InvestorOverview data={dashboardData} />
              <div className="mt-8">
                <SearcherPerformance 
                  searchers={dashboardData.searchers} 
                  onSearcherUpdate={loadDashboard}
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
