'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SearcherDetailClient } from './SearcherDetailClient';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/lib/auth-context';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function SearcherDetailPage() {
  const router = useRouter();
  const params = useParams<{ searcherId: string }>();
  const searchParams = useSearchParams();
  const { user, role, loading: authLoading } = useAuth();

  const searcherId = params?.searcherId;
  const workspaceId = searchParams?.get('workspace');

  // Redirect if not authenticated or not investor
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.replace('/');
      return;
    }
    
    if (role !== 'investor') {
      router.replace('/dashboard');
      return;
    }
    
    if (!workspaceId) {
      router.replace('/investor');
      return;
    }
  }, [user, role, authLoading, workspaceId, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user || role !== 'investor' || !searcherId || !workspaceId) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Link
              href="/investor"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back to Dashboard</span>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Searcher Performance Details</h1>
            <p className="text-slate-600">View detailed metrics and analytics for this searcher</p>
          </div>
          
          <SearcherDetailClient
            searcherId={searcherId}
            workspaceId={workspaceId}
            investorId={user.id}
          />
        </div>
      </main>
    </div>
  );
}
