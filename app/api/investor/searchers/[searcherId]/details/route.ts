import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ searcherId: string }> }
) {
  try {
    const { searcherId } = await params;
    const { supabase, user } = await authenticateRequest(req);

    // Check if user has investor role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'investor') {
      return NextResponse.json({ error: 'Access denied. Investor role required.' }, { status: 403 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspace');
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspace parameter required' }, { status: 400 });
    }

    // Verify investor has access to this searcher
    const { data: link, error: linkError } = await supabase
      .from('investor_searcher_links')
      .select('*')
      .eq('investor_id', user.id)
      .eq('searcher_id', searcherId)
      .eq('workspace_id', workspaceId)
      .single();

    if (linkError || !link) {
      return NextResponse.json({ error: 'Access denied: Investor not linked to this searcher' }, { status: 403 });
    }

    // Use service role to bypass RLS
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get searcher email
    let searcherEmail = '';
    let searcherName = link.custom_display_name || '';
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(searcherId);
      if (userData?.user?.email) {
        searcherEmail = userData.user.email;
        if (!searcherName) {
          searcherName = searcherEmail;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch searcher email:', error);
    }

    // Get all deals for this workspace
    const { data: allDeals, error: dealsError } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
      return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 });
    }

    const deals = allDeals || [];

    // Calculate metrics
    const totalDealsReviewed = deals.length;
    const dealsPassed = deals.filter(d => d.passed_at !== null).length;
    const dealsMovedToIoi = deals.filter(d => 
      d.stage === 'ioi_sent' || d.stage === 'loi' || d.stage === 'dd' || d.stage === 'closed'
    ).length;
    const cimsProceeding = deals.filter(d => 
      d.source_type === 'cim_pdf' && 
      d.passed_at === null && 
      (d.stage === 'reviewing' || d.stage === 'follow_up' || d.stage === 'ioi_sent' || d.stage === 'loi' || d.stage === 'dd')
    ).length;
    const dealsInPipeline = deals.filter(d => d.passed_at === null && d.archived_at === null).length;
    
    const totalPipelineValue = deals
      .filter(d => d.passed_at === null && d.archived_at === null)
      .reduce((sum, d: any) => {
        const priceStr = d.asking_price_extracted || d.asking_price || '0';
        const price = parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
        return sum + price;
      }, 0);

    // CIM analysis
    const cimDeals = deals.filter(d => d.source_type === 'cim_pdf');
    const cimsWithRedFlags = cimDeals.filter(d => {
      const redFlags = d.ai_red_flags;
      return redFlags && (Array.isArray(redFlags) ? redFlags.length > 0 : typeof redFlags === 'string');
    }).length;
    
    const cimsWithGreenFlags = cimDeals.filter(d => {
      // Check for positive indicators in criteria_match or scoring
      const criteriaMatch = d.criteria_match_json;
      const scoring = d.ai_scoring_json;
      return (criteriaMatch && typeof criteriaMatch === 'object') || 
             (scoring && typeof scoring === 'object' && (scoring as any).final_tier === 'A');
    }).length;

    // Extract top red flags
    const redFlagCounts: Record<string, number> = {};
    cimDeals.forEach((deal: any) => {
      const redFlags = deal.ai_red_flags;
      if (redFlags) {
        const flags = Array.isArray(redFlags) ? redFlags : [redFlags];
        flags.forEach((flag: string) => {
          if (flag && typeof flag === 'string') {
            // Extract key phrases (first 50 chars for grouping)
            const key = flag.substring(0, 80).trim();
            redFlagCounts[key] = (redFlagCounts[key] || 0) + 1;
          }
        });
      }
    });
    const topRedFlags = Object.entries(redFlagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([flag, count]) => ({ flag, count }));

    // Extract top green flags (from criteria_match or positive signals)
    const greenFlagCounts: Record<string, number> = {};
    cimDeals.forEach((deal: any) => {
      const criteriaMatch = deal.criteria_match_json;
      const scoring = deal.ai_scoring_json;
      
      // Check for tier A deals
      if (scoring && typeof scoring === 'object' && (scoring as any).final_tier === 'A') {
        greenFlagCounts['Tier A Deal'] = (greenFlagCounts['Tier A Deal'] || 0) + 1;
      }
      
      // Check for SBA eligible
      if (deal.sba_eligible === true) {
        greenFlagCounts['SBA Eligible'] = (greenFlagCounts['SBA Eligible'] || 0) + 1;
      }
      
      // Check for verdict PROCEED
      const decisionFramework = (criteriaMatch as any)?.decision_framework;
      if (decisionFramework?.verdict === 'PROCEED') {
        greenFlagCounts['Proceed Verdict'] = (greenFlagCounts['Proceed Verdict'] || 0) + 1;
      }
    });
    const topGreenFlags = Object.entries(greenFlagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([flag, count]) => ({ flag, count }));

    // Conversion rates
    const cimToIoiRate = cimDeals.length > 0 ? (dealsMovedToIoi / cimDeals.length) * 100 : 0;
    const loiDeals = deals.filter(d => d.stage === 'loi' || d.stage === 'dd' || d.stage === 'closed');
    const ioiToLoiRate = dealsMovedToIoi > 0 ? (loiDeals.length / dealsMovedToIoi) * 100 : 0;
    const closedDeals = deals.filter(d => d.stage === 'closed' || d.verdict === 'closed_won');
    const loiToCloseRate = loiDeals.length > 0 ? (closedDeals.length / loiDeals.length) * 100 : 0;

    // Activity metrics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const cimsReviewedThisMonth = cimDeals.filter(d => 
      d.created_at && new Date(d.created_at) >= startOfMonth
    ).length;
    const dealsPassedThisMonth = deals.filter(d => 
      d.passed_at && new Date(d.passed_at) >= startOfMonth
    ).length;

    // Get last activity
    const { data: lastActivity } = await supabaseAdmin
      .from('deal_activities')
      .select('activity_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Pipeline breakdown
    const dealsByStage: Record<string, number> = {};
    deals.filter(d => d.passed_at === null && d.archived_at === null).forEach((d: any) => {
      const stage = d.stage || 'new';
      dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
    });

    const dealsByTier: Record<string, number> = {};
    deals.filter(d => d.passed_at === null && d.archived_at === null).forEach((d: any) => {
      const tier = d.final_tier || 'unrated';
      dealsByTier[tier] = (dealsByTier[tier] || 0) + 1;
    });

    // Calculate months searching
    const searchStartDate = link.created_at ? new Date(link.created_at) : null;
    const monthsSearching = searchStartDate 
      ? Math.max(1, Math.floor((Date.now() - searchStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;

    return NextResponse.json({
      searcherName,
      searcherEmail,
      capitalCommitted: Number(link.capital_committed) || 0,
      monthsSearching,
      totalDealsReviewed,
      dealsPassed,
      dealsMovedToIoi,
      cimsProceeding,
      dealsInPipeline,
      totalPipelineValue,
      cimsWithRedFlags,
      cimsWithGreenFlags,
      topRedFlags,
      topGreenFlags,
      cimToIoiRate,
      ioiToLoiRate,
      loiToCloseRate,
      cimsReviewedThisMonth,
      cimsReviewedTotal: cimDeals.length,
      dealsPassedThisMonth,
      dealsPassedTotal: dealsPassed,
      lastActivity: lastActivity?.created_at ? new Date(lastActivity.created_at) : null,
      lastActivityType: lastActivity?.activity_type || 'none',
      dealsByStage: Object.entries(dealsByStage).map(([stage, count]) => ({ stage, count })),
      dealsByTier: Object.entries(dealsByTier).map(([tier, count]) => ({ tier, count })),
    });
  } catch (error) {
    console.error('Error fetching searcher details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch searcher details';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
