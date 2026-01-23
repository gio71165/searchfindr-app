import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSearcherDeals } from '@/lib/data-access/investor-analytics';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SearcherDealsClient } from './SearcherDealsClient';

interface SearcherDetailPageProps {
  params: Promise<{ searcherId: string }>;
  searchParams: Promise<{ workspace?: string }>;
}

export default async function SearcherDetailPage({ params, searchParams }: SearcherDetailPageProps) {
  // Await params and searchParams (Next.js 15+ requirement)
  const { searcherId } = await params;
  const { workspace } = await searchParams;
  
  const supabase = await createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/');
  }
  
  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || profile.role !== 'investor') {
    redirect('/dashboard');
  }
  
  const workspaceId = workspace;
  if (!workspaceId) {
    redirect('/investor');
  }
  
  // Get searcher profile
  // Profiles table doesn't have full_name or email columns
  const { data: searcherProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', searcherId)
    .single();
  
  // Get deals for this searcher
  let deals = [];
  try {
    deals = await getSearcherDeals(user.id, searcherId, workspaceId);
  } catch (error) {
    console.error('Error fetching searcher deals:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 text-red-700">
          <div className="font-semibold mb-1">Error</div>
          <div className="text-sm">
            Failed to load searcher deals. You may not have access to this searcher.
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <Link
        href="/investor"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Investor Dashboard
      </Link>
      
      <SearcherDealsClient
        initialDeals={deals}
        workspaceId={workspaceId}
        investorId={user.id}
        searcherId={searcherId}
      />
    </div>
  );
}
