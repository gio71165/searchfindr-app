import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSearcherDeals } from '@/lib/data-access/investor-analytics';
import { DealCard } from '@/components/ui/DealCard';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SearcherDetailPageProps {
  params: { searcherId: string };
  searchParams: { workspace?: string };
}

export default async function SearcherDetailPage({ params, searchParams }: SearcherDetailPageProps) {
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
  
  const workspaceId = searchParams.workspace;
  if (!workspaceId) {
    redirect('/investor');
  }
  
  // Get searcher profile
  const { data: searcherProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', params.searcherId)
    .single();
  
  // Get deals for this searcher
  let deals = [];
  try {
    deals = await getSearcherDeals(user.id, params.searcherId, workspaceId);
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
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {searcherProfile?.full_name || searcherProfile?.email || 'Searcher'} Pipeline
        </h1>
        <p className="text-slate-600">
          {deals.length} {deals.length === 1 ? 'deal' : 'deals'} in pipeline
        </p>
      </div>
      
      {deals.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-slate-600">No deals in pipeline for this searcher.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {deals.map((deal: any) => (
            <DealCard
              key={deal.id}
              deal={deal}
              isSelected={false}
              onToggleSelect={() => {}}
              canSelect={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
