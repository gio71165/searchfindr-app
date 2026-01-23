import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface InvestorDashboardData {
  // Portfolio overview
  totalCapitalCommitted: number;
  activeSearchers: number;
  totalPipelineValue: number;
  totalDealsInPipeline: number;
  
  // Searcher performance
  searchers: SearcherMetrics[];
  
  // Aggregate metrics
  totalDealsReviewed: number;
  totalCimsProcessed: number;
  totalIoisSubmitted: number;
  totalLoisSubmitted: number;
  
  // Pipeline breakdown
  dealsByStage: { stage: string; count: number; totalValue: number }[];
  dealsByTier: { tier: string; count: number }[];
  
  // Geographic breakdown
  dealsByState: { state: string; count: number }[];
  
  // Industry breakdown
  dealsByIndustry: { industry: string; count: number }[];
}

export interface SearcherMetrics {
  searcherId: string;
  searcherName: string;
  searcherEmail: string;
  
  capitalCommitted: number;
  searchStartDate: Date | null;
  monthsSearching: number;
  
  // Activity
  cimsReviewedThisMonth: number;
  cimsReviewedTotal: number;
  dealsPassedThisMonth: number;
  dealsPassedTotal: number;
  
  // Pipeline
  dealsInPipeline: number;
  totalPipelineValue: number;
  dealsByStage: { stage: string; count: number }[];
  
  // Conversion rates
  conversionRates: {
    cimToIoi: number;
    ioiToLoi: number;
    loiToClose: number;
  };
  
  // Recent activity
  lastActivity: Date | null;
  lastActivityType: string;
  workspaceId: string;
  accessLevel: 'full' | 'summary';
}

/**
 * Gets comprehensive investor dashboard data for a given investor
 */
export async function getInvestorDashboard(
  investorId: string,
  supabaseClient?: SupabaseClient
): Promise<InvestorDashboardData> {
  const supabase = supabaseClient || await createClient();
  
  // Get linked searchers (without direct profile join initially)
  const { data: links, error: linksError } = await supabase
    .from('investor_searcher_links')
    .select('searcher_id, workspace_id, capital_committed, access_level, created_at')
    .eq('investor_id', investorId);
  
  if (linksError) {
    console.error('Error fetching investor links:', {
      error: linksError,
      message: linksError.message,
      code: linksError.code,
      details: linksError.details,
      hint: linksError.hint,
    });
    throw new Error(`Failed to fetch investor links: ${linksError.message || linksError.code || 'Unknown error'}`);
  }
  
  if (!links || links.length === 0) {
    return {
      totalCapitalCommitted: 0,
      activeSearchers: 0,
      totalPipelineValue: 0,
      totalDealsInPipeline: 0,
      searchers: [],
      totalDealsReviewed: 0,
      totalCimsProcessed: 0,
      totalIoisSubmitted: 0,
      totalLoisSubmitted: 0,
      dealsByStage: [],
      dealsByTier: [],
      dealsByState: [],
      dealsByIndustry: [],
    };
  }
  
  // Fetch profiles for all searchers in one separate query
  const searcherIds = links.map(l => l.searcher_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', searcherIds);
  
  if (profilesError) {
    console.error('Error fetching searcher profiles:', profilesError);
    throw new Error(`Failed to fetch searcher profiles: ${profilesError.message || profilesError.code || 'Unknown error'}`);
  }
  
  // Create a map of searcher_id -> profile for quick lookup
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  
  const totalCapitalCommitted = links.reduce((sum, l) => sum + (Number(l.capital_committed) || 0), 0);
  
  const searcherMetrics: SearcherMetrics[] = [];
  let totalPipelineValue = 0;
  let totalDealsInPipeline = 0;
  let totalDealsReviewed = 0;
  let totalCimsProcessed = 0;
  let totalIoisSubmitted = 0;
  let totalLoisSubmitted = 0;
  
  const allDealsByStage: Record<string, { count: number; totalValue: number }> = {};
  const allDealsByTier: Record<string, number> = {};
  const allDealsByState: Record<string, number> = {};
  const allDealsByIndustry: Record<string, number> = {};
  
  // Process each searcher
  for (const link of links) {
    const searcherProfile = profileMap.get(link.searcher_id);
    if (!searcherProfile) {
      console.warn(`Profile not found for searcher ${link.searcher_id}`);
      continue;
    }
    
    const workspaceId = link.workspace_id;
    const searchStartDate = link.created_at ? new Date(link.created_at) : null;
    const monthsSearching = searchStartDate 
      ? Math.max(1, Math.floor((Date.now() - searchStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)))
      : 0;
    
    // Get deals for this searcher's workspace (active deals only, not passed)
    const { data: deals, error: dealsError } = await supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', workspaceId)
      .is('passed_at', null)
      .is('archived_at', null);
    
    if (dealsError) {
      console.error(`Error fetching deals for workspace ${workspaceId}:`, dealsError);
      continue;
    }
    
    if (!deals || deals.length === 0) {
      // Still add searcher with zero metrics
      searcherMetrics.push({
        searcherId: link.searcher_id,
        searcherName: (searcherProfile.full_name as string) || (searcherProfile.email as string) || 'Unknown',
        searcherEmail: (searcherProfile.email as string) || '',
        capitalCommitted: Number(link.capital_committed) || 0,
        searchStartDate,
        monthsSearching,
        cimsReviewedThisMonth: 0,
        cimsReviewedTotal: 0,
        dealsPassedThisMonth: 0,
        dealsPassedTotal: 0,
        dealsInPipeline: 0,
        totalPipelineValue: 0,
        dealsByStage: [],
        conversionRates: {
          cimToIoi: 0,
          ioiToLoi: 0,
          loiToClose: 0,
        },
        lastActivity: null,
        lastActivityType: 'none',
        workspaceId,
        accessLevel: link.access_level as 'full' | 'summary',
      });
      continue;
    }
    
    // Calculate pipeline metrics
    const dealsInPipeline = deals.length;
    const pipelineValue = deals.reduce((sum, d: any) => {
      const priceStr = d.asking_price_extracted || d.asking_price || '0';
      const price = parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
      return sum + price;
    }, 0);
    
    totalPipelineValue += pipelineValue;
    totalDealsInPipeline += dealsInPipeline;
    totalDealsReviewed += dealsInPipeline;
    
    // Count CIMs processed
    const cimDeals = deals.filter((d: any) => d.source_type === 'cim_pdf');
    totalCimsProcessed += cimDeals.length;
    
    // Count IOIs and LOIs submitted
    const ioiDeals = deals.filter((d: any) => 
      d.stage === 'ioi_sent' || d.stage === 'loi' || d.stage === 'dd' || d.stage === 'closed'
    );
    const loiDeals = deals.filter((d: any) => 
      d.stage === 'loi' || d.stage === 'dd' || d.stage === 'closed'
    );
    totalIoisSubmitted += ioiDeals.length;
    totalLoisSubmitted += loiDeals.length;
    
    // Group deals by stage
    const dealsByStage: Record<string, number> = {};
    deals.forEach((d: any) => {
      const stage = d.stage || 'new';
      dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
      
      // Aggregate for overall dashboard
      if (!allDealsByStage[stage]) {
        allDealsByStage[stage] = { count: 0, totalValue: 0 };
      }
      allDealsByStage[stage].count += 1;
      const dealPrice = parseFloat((d.asking_price_extracted || d.asking_price || '0').toString().replace(/[^0-9.]/g, '')) || 0;
      allDealsByStage[stage].totalValue += dealPrice;
    });
    
    // Group deals by tier
    deals.forEach((d: any) => {
      const tier = d.final_tier || 'unrated';
      allDealsByTier[tier] = (allDealsByTier[tier] || 0) + 1;
    });
    
    // Group deals by state
    deals.forEach((d: any) => {
      const state = d.location_state || 'unknown';
      allDealsByState[state] = (allDealsByState[state] || 0) + 1;
    });
    
    // Group deals by industry
    deals.forEach((d: any) => {
      const industry = d.industry || 'unknown';
      allDealsByIndustry[industry] = (allDealsByIndustry[industry] || 0) + 1;
    });
    
    // Calculate conversion rates
    const closedDeals = deals.filter((d: any) => d.stage === 'closed' || d.verdict === 'closed_won');
    
    const cimToIoi = dealsInPipeline > 0 ? (ioiDeals.length / dealsInPipeline) * 100 : 0;
    const ioiToLoi = ioiDeals.length > 0 ? (loiDeals.length / ioiDeals.length) * 100 : 0;
    const loiToClose = loiDeals.length > 0 ? (closedDeals.length / loiDeals.length) * 100 : 0;
    
    // Get recent activity
    const { data: activities } = await supabase
      .from('deal_activities')
      .select('activity_type, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // Get passed deals count
    const { count: passedCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('passed_at', 'is', null);
    
    // Get CIMs reviewed this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const { count: cimsThisMonth } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .eq('source_type', 'cim_pdf')
      .gte('created_at', startOfMonth.toISOString());
    
    // Get deals passed this month
    const { count: passedThisMonth } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('passed_at', 'is', null)
      .gte('passed_at', startOfMonth.toISOString());
    
    searcherMetrics.push({
      searcherId: link.searcher_id,
      searcherName: searcherProfile.full_name || searcherProfile.email || 'Unknown',
      searcherEmail: searcherProfile.email || '',
      capitalCommitted: Number(link.capital_committed) || 0,
      searchStartDate,
      monthsSearching,
      cimsReviewedThisMonth: cimsThisMonth || 0,
      cimsReviewedTotal: cimDeals.length,
      dealsPassedThisMonth: passedThisMonth || 0,
      dealsPassedTotal: passedCount || 0,
      dealsInPipeline,
      totalPipelineValue: pipelineValue,
      dealsByStage: Object.entries(dealsByStage).map(([stage, count]) => ({ stage, count })),
      conversionRates: {
        cimToIoi,
        ioiToLoi,
        loiToClose,
      },
      lastActivity: activities?.created_at ? new Date(activities.created_at) : null,
      lastActivityType: activities?.activity_type || 'none',
      workspaceId,
      accessLevel: link.access_level as 'full' | 'summary',
    });
  }
  
  return {
    totalCapitalCommitted,
    activeSearchers: links.length,
    totalPipelineValue,
    totalDealsInPipeline,
    searchers: searcherMetrics,
    totalDealsReviewed,
    totalCimsProcessed,
    totalIoisSubmitted,
    totalLoisSubmitted,
    dealsByStage: Object.entries(allDealsByStage).map(([stage, data]) => ({
      stage,
      count: data.count,
      totalValue: data.totalValue,
    })),
    dealsByTier: Object.entries(allDealsByTier).map(([tier, count]) => ({
      tier,
      count,
    })),
    dealsByState: Object.entries(allDealsByState).map(([state, count]) => ({
      state,
      count,
    })),
    dealsByIndustry: Object.entries(allDealsByIndustry).map(([industry, count]) => ({
      industry,
      count,
    })),
  };
}

/**
 * Gets deals for a specific searcher (respecting access level)
 */
export async function getSearcherDeals(
  investorId: string,
  searcherId: string,
  workspaceId: string
): Promise<any[]> {
  const supabase = await createClient();
  
  // Verify investor has access to this searcher
  const { data: link, error: linkError } = await supabase
    .from('investor_searcher_links')
    .select('access_level')
    .eq('investor_id', investorId)
    .eq('searcher_id', searcherId)
    .eq('workspace_id', workspaceId)
    .single();
  
  if (linkError || !link) {
    throw new Error('Access denied: Investor not linked to this searcher');
  }
  
  // Get deals
  const { data: deals, error: dealsError } = await supabase
    .from('companies')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('passed_at', null)
    .is('archived_at', null)
    .order('created_at', { ascending: false });
  
  if (dealsError) {
    throw new Error('Failed to fetch deals');
  }
  
  // Apply visibility settings based on access level
  const dealsWithVisibility = await Promise.all(
    (deals || []).map(async (deal) => {
      const { data: visibility } = await supabase
        .from('deal_investor_visibility')
        .select('*')
        .eq('deal_id', deal.id)
        .single();
      
      const isVisible = visibility?.visible_to_investors !== false;
      const showCompanyName = link.access_level === 'full' && (visibility?.show_company_name !== false);
      const showFinancials = visibility?.show_financials !== false;
      const showAiAnalysis = visibility?.show_ai_analysis !== false;
      
      if (!isVisible) {
        return null;
      }
      
      // Redact company name if access level is 'summary' or visibility setting says no
      const redactedDeal = {
        ...deal,
        company_name: showCompanyName ? deal.company_name : '[Company Name Hidden]',
        // Hide financials if not allowed
        asking_price_extracted: showFinancials ? deal.asking_price_extracted : null,
        ebitda_ttm_extracted: showFinancials ? deal.ebitda_ttm_extracted : null,
        // Hide AI analysis if not allowed
        ai_summary: showAiAnalysis ? deal.ai_summary : null,
        ai_red_flags: showAiAnalysis ? deal.ai_red_flags : null,
      };
      
      return redactedDeal;
    })
  );
  
  return dealsWithVisibility.filter(d => d !== null);
}
