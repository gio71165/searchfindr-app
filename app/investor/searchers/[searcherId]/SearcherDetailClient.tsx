'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, TrendingUp, X, CheckCircle2, AlertTriangle, Download, Calendar } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/Skeleton';
import { AsyncButton } from '@/components/ui/AsyncButton';

interface SearcherDetailData {
  searcherName: string;
  searcherEmail: string;
  capitalCommitted: number;
  monthsSearching: number;
  
  // Deal metrics
  totalDealsReviewed: number;
  dealsPassed: number;
  dealsMovedToIoi: number;
  cimsProceeding: number;
  dealsInPipeline: number;
  totalPipelineValue: number;
  
  // CIM analysis
  cimsWithRedFlags: number;
  cimsWithGreenFlags: number;
  topRedFlags: Array<{ flag: string; count: number }>;
  topGreenFlags: Array<{ flag: string; count: number }>;
  
  // Conversion rates
  cimToIoiRate: number;
  ioiToLoiRate: number;
  loiToCloseRate: number;
  
  // Activity
  cimsReviewedThisMonth: number;
  cimsReviewedTotal: number;
  dealsPassedThisMonth: number;
  dealsPassedTotal: number;
  lastActivity: Date | null;
  lastActivityType: string;
  
  // Pipeline breakdown
  dealsByStage: Array<{ stage: string; count: number }>;
  dealsByTier: Array<{ tier: string; count: number }>;
}

interface SearcherDetailClientProps {
  searcherId: string;
  workspaceId: string;
  investorId: string;
}

export function SearcherDetailClient({ searcherId, workspaceId, investorId }: SearcherDetailClientProps) {
  const router = useRouter();
  const { session, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SearcherDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  console.log('SearcherDetailClient rendered', { searcherId, workspaceId, investorId });

  useEffect(() => {
    if (searcherId && workspaceId && session && user) {
      loadData();
    } else if (!session || !user) {
      setError('Not authenticated. Please log in again.');
      setLoading(false);
    } else {
      setError('Missing searcher ID or workspace ID');
      setLoading(false);
    }
  }, [searcherId, workspaceId, session, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading searcher details...', { searcherId, workspaceId });
      
      // Use session from useAuth hook instead of getSession()
      if (!session || !user) {
        console.error('No session or user found');
        setError('Not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const url = `/api/investor/searchers/${searcherId}/details?workspace=${workspaceId}`;
      console.log('Fetching from:', url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        // Handle 401/403 errors specially
        if (res.status === 401 || res.status === 403) {
          setError('Authentication failed. Please refresh the page and try again.');
          setLoading(false);
          return;
        }
        
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API error:', errorData);
        throw new Error(errorData.error || `Failed to load searcher details (${res.status})`);
      }

      const result = await res.json();
      console.log('Data loaded:', result);
      setData(result);
    } catch (err) {
      console.error('Error loading searcher details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load searcher details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    if (!session) {
      setError('Not authenticated. Please log in again.');
      return;
    }
    
    setGeneratingReport(true);
    try {
      const url = `/api/investor/reports/${type}?searcherId=${searcherId}&workspaceId=${workspaceId}`;
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Searcher Details</h2>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-2">No Data Available</h2>
        <p className="text-yellow-700 mb-4">Unable to load searcher details. Please try again.</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null; // Still loading
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{data.searcherName}</h1>
          <p className="text-slate-600">{data.searcherEmail}</p>
        </div>
        <div className="flex gap-2">
          <AsyncButton
            onClick={() => handleGenerateReport('weekly')}
            isLoading={generatingReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Weekly Report
          </AsyncButton>
          <AsyncButton
            onClick={() => handleGenerateReport('monthly')}
            isLoading={generatingReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Calendar className="h-4 w-4" />
            Monthly Report
          </AsyncButton>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">Deals Passed</div>
          <div className="text-3xl font-bold text-slate-900">{data.dealsPassed}</div>
          <div className="text-xs text-slate-500 mt-1">{data.dealsPassedThisMonth} this month</div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">Moved to IOI</div>
          <div className="text-3xl font-bold text-slate-900">{data.dealsMovedToIoi}</div>
          <div className="text-xs text-slate-500 mt-1">
            {data.cimToIoiRate.toFixed(1)}% conversion rate
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">CIMs Proceeding</div>
          <div className="text-3xl font-bold text-slate-900">{data.cimsProceeding}</div>
          <div className="text-xs text-slate-500 mt-1">{data.cimsReviewedTotal} total reviewed</div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">Total Pipeline Value</div>
          <div className="text-3xl font-bold text-slate-900">{formatCurrency(data.totalPipelineValue)}</div>
          <div className="text-xs text-slate-500 mt-1">{data.dealsInPipeline} deals in pipeline</div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">CIMs with Red Flags</div>
          <div className="text-3xl font-bold text-red-600">{data.cimsWithRedFlags}</div>
          <div className="text-xs text-slate-500 mt-1">
            {data.cimsReviewedTotal > 0 
              ? `${((data.cimsWithRedFlags / data.cimsReviewedTotal) * 100).toFixed(0)}% of CIMs`
              : 'N/A'}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="text-sm text-slate-600 mb-1">CIMs with Green Flags</div>
          <div className="text-3xl font-bold text-emerald-600">{data.cimsWithGreenFlags}</div>
          <div className="text-xs text-slate-500 mt-1">
            {data.cimsReviewedTotal > 0 
              ? `${((data.cimsWithGreenFlags / data.cimsReviewedTotal) * 100).toFixed(0)}% of CIMs`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Top Red Flags */}
      {data.topRedFlags.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-semibold text-slate-900">Top Red Flags</h2>
          </div>
          <div className="space-y-2">
            {data.topRedFlags.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-slate-900">{item.flag}</span>
                <span className="text-sm font-medium text-red-600">{item.count} CIMs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Green Flags */}
      {data.topGreenFlags.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-slate-900">Top Green Flags</h2>
          </div>
          <div className="space-y-2">
            {data.topGreenFlags.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm text-slate-900">{item.flag}</span>
                <span className="text-sm font-medium text-emerald-600">{item.count} CIMs</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Pipeline Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">By Stage</h3>
            <div className="space-y-2">
              {data.dealsByStage.map((item) => (
                <div key={item.stage} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 capitalize">{item.stage.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">By Tier</h3>
            <div className="space-y-2">
              {data.dealsByTier.map((item) => (
                <div key={item.tier} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{item.tier}</span>
                  <span className="text-sm font-medium text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conversion Rates */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Conversion Rates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.cimToIoiRate.toFixed(1)}%</div>
            <div className="text-sm text-slate-600 mt-1">CIM → IOI</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{data.ioiToLoiRate.toFixed(1)}%</div>
            <div className="text-sm text-slate-600 mt-1">IOI → LOI</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{data.loiToCloseRate.toFixed(1)}%</div>
            <div className="text-sm text-slate-600 mt-1">LOI → Close</div>
          </div>
        </div>
      </div>
    </div>
  );
}
