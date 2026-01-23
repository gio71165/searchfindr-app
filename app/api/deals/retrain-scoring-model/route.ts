import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateWeightsFromOutcomes } from '@/lib/ai/deal-scorer';
import { authenticateRequest } from '@/lib/api/auth';

export const runtime = 'nodejs';

/**
 * POST /api/deals/retrain-scoring-model
 * Retrains the deal scoring model based on outcomes (closed vs passed/lost)
 * Requires admin authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const { user, workspace } = await authenticateRequest(req);
    
    // Check if user is admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (!profile.is_admin && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get optional workspace_id from query params
    const searchParams = req.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id') || undefined;
    
    // Retrain the model
    const newWeights = await updateWeightsFromOutcomes(workspaceId);
    
    return NextResponse.json({
      success: true,
      message: 'Model retrained successfully',
      weights: newWeights,
      workspace_id: workspaceId || 'global',
    });
  } catch (error) {
    console.error('Error retraining scoring model:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrain model',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deals/retrain-scoring-model
 * Returns current model weights and training statistics
 */
export async function GET(req: NextRequest) {
  try {
    const { user, workspace } = await authenticateRequest(req);
    const supabase = await createClient();
    
    // Get active weights for workspace or global
    const { data: workspaceWeights } = await supabase
      .from('deal_scoring_weights')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    const { data: globalWeights } = await supabase
      .from('deal_scoring_weights')
      .select('*')
      .is('workspace_id', null)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get training statistics
    const { count: totalDeals } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .not('outcome', 'is', null);
    
    const { count: closedDeals } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)
      .eq('outcome', 'closed');
    
    return NextResponse.json({
      workspace_weights: workspaceWeights,
      global_weights: globalWeights,
      statistics: {
        total_deals_with_outcome: totalDeals || 0,
        closed_deals: closedDeals || 0,
        training_ready: (totalDeals || 0) >= 50,
      },
    });
  } catch (error) {
    console.error('Error fetching model info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model information' },
      { status: 500 }
    );
  }
}
