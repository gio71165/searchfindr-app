import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { getSearcherDeals } from '@/lib/data-access/investor-analytics';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ searcherId: string }> }
) {
  try {
    const { searcherId } = await params;
    const { supabase, user } = await authenticateRequest(req);

    // Get workspace ID from query params
    const searchParams = req.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace parameter is required' },
        { status: 400 }
      );
    }

    // Verify user is investor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'investor') {
      return NextResponse.json(
        { error: 'Access denied. Investor role required.' },
        { status: 403 }
      );
    }

    const deals = await getSearcherDeals(user.id, searcherId, workspaceId);
    
    return NextResponse.json({ deals }, { status: 200 });
  } catch (error) {
    console.error('Error fetching searcher deals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch searcher deals';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
