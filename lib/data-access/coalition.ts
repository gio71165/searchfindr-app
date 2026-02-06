import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export interface CoalitionDashboardData {
  /** Searchers with no deal stage move in 14+ days */
  driftDetector: { searcherId: string; workspaceId: string; displayName: string; daysSinceLastStageMove: number }[];
  /** Avg days from deal create to LOI stage (coalition-wide and per searcher for dropdown) */
  cohortBenchmark: {
    coalitionAvgDaysCimToLoi: number;
    searcherOptions: { searcherId: string; workspaceId: string; displayName: string }[];
    searcherAvgDaysCimToLoi: Record<string, number>;
  };
  /** Top 5 industries in DD stage */
  marketHeatmap: { industry: string; count: number }[];
  /** Top 3 red flag phrases this week */
  redFlagAggregate: { flag: string; count: number }[];
  /** Searchers by deal flow this month (anonymized labels) */
  leaderboard: { rank: number; label: string; workspaceId: string; dealFlowThisMonth: number; anonymized: boolean }[];
  /** Workspace IDs that have at least one deal in 'reviewing' (for broadcast) */
  reviewingWorkspaceIds: string[];
}

/** Extract bullet-point phrases from ai_red_flags for counting (e.g. "Customer Concentration"). */
function parseRedFlagPhrases(text: string | null): string[] {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.replace(/\r\n/g, '\n');
  const bulletRegex = /(?:^|\n)\s*[-•*]\s*(.+?)(?=\n|$)/g;
  const phrases: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = bulletRegex.exec(normalized)) !== null) {
    const phrase = m[1].replace(/^\d+\.\s*/, '').trim();
    if (phrase.length > 3 && phrase.length < 120) phrases.push(phrase);
  }
  if (phrases.length === 0) {
    const fallback = normalized
      .split(/\n|[-•*]/)
      .map((s) => s.replace(/^\d+\.\s*/, '').trim())
      .filter((s) => s.length > 3 && s.length < 120);
    phrases.push(...fallback);
  }
  return phrases;
}

export async function getCoalitionDashboardData(): Promise<CoalitionDashboardData> {
  const supabase = getAdminClient();

  // Coalition admin sees only coalition members (searchers with coalition branding), like investor sees linked searchers.
  const { data: members, error: membersError } = await supabase
    .from('profiles')
    .select('id, workspace_id')
    .eq('is_coalition_member', true)
    .not('workspace_id', 'is', null);

  if (membersError || !members?.length) {
    return {
      driftDetector: [],
      cohortBenchmark: { coalitionAvgDaysCimToLoi: 0, searcherOptions: [], searcherAvgDaysCimToLoi: {} },
      marketHeatmap: [],
      redFlagAggregate: [],
      leaderboard: [],
      reviewingWorkspaceIds: [],
    };
  }

  const workspaceIds = [...new Set(members.map((m) => m.workspace_id))];
  const searcherByWorkspace = new Map<string, { searcherId: string; displayName: string }>();
  members.forEach((m) => {
    const displayName = `Searcher ${(m.id as string).slice(0, 8)}`;
    searcherByWorkspace.set(m.workspace_id, { searcherId: m.id, displayName });
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ---- Drift: max(created_at) per workspace from deal_activities (stage_change); gap > 14 days ----
  const { data: stageChangeActivities } = await supabase
    .from('deal_activities')
    .select('workspace_id, created_at')
    .eq('activity_type', 'stage_change')
    .in('workspace_id', workspaceIds);

  const lastStageChangeByWorkspace = new Map<string, Date>();
  (stageChangeActivities || []).forEach((a: { workspace_id: string; created_at: string }) => {
    const at = new Date(a.created_at);
    const existing = lastStageChangeByWorkspace.get(a.workspace_id);
    if (!existing || at > existing) lastStageChangeByWorkspace.set(a.workspace_id, at);
  });

  const driftDetector: CoalitionDashboardData['driftDetector'] = [];
  for (const wid of workspaceIds) {
    const lastAt = lastStageChangeByWorkspace.get(wid) ?? null;
    const daysSince = lastAt
      ? Math.floor((now.getTime() - lastAt.getTime()) / (24 * 60 * 60 * 1000))
      : 999;
    if (daysSince > 14) {
      const info = searcherByWorkspace.get(wid);
      driftDetector.push({
        searcherId: info?.searcherId ?? '',
        workspaceId: wid,
        displayName: info?.displayName ?? `Workspace ${wid.slice(0, 8)}`,
        daysSinceLastStageMove: daysSince === 999 ? 15 : daysSince,
      });
    }
  }

  // ---- Cohort: avg days CIM to LOI ----
  const { data: loiActivities } = await supabase
    .from('deal_activities')
    .select('deal_id, workspace_id, created_at, metadata')
    .eq('activity_type', 'stage_change')
    .in('workspace_id', workspaceIds);

  const dealToLoiAt = new Map<string, Date>();
  (loiActivities || []).forEach((a: any) => {
    const newStage = a.metadata?.new_stage;
    if (newStage === 'loi' && a.deal_id) {
      const at = new Date(a.created_at);
      const existing = dealToLoiAt.get(a.deal_id);
      if (!existing || at < existing) dealToLoiAt.set(a.deal_id, at);
    }
  });

  const dealIdsWithLoi = [...dealToLoiAt.keys()];
  let coalitionTotalDays = 0;
  let coalitionCount = 0;
  const searcherDays: Record<string, number[]> = {};

  if (dealIdsWithLoi.length > 0) {
    const { data: deals } = await supabase
      .from('companies')
      .select('id, workspace_id, created_at')
      .in('id', dealIdsWithLoi);

    (deals || []).forEach((d: any) => {
      const loiAt = dealToLoiAt.get(d.id);
      if (!loiAt) return;
      const created = new Date(d.created_at);
      const days = Math.round((loiAt.getTime() - created.getTime()) / (24 * 60 * 60 * 1000));
      coalitionTotalDays += days;
      coalitionCount += 1;
      const wid = d.workspace_id;
      if (!searcherDays[wid]) searcherDays[wid] = [];
      searcherDays[wid].push(days);
    });
  }

  const coalitionAvgDaysCimToLoi = coalitionCount > 0 ? Math.round(coalitionTotalDays / coalitionCount) : 0;
  const searcherOptions: { searcherId: string; workspaceId: string; displayName: string }[] = [];
  const searcherAvgDaysCimToLoi: Record<string, number> = {};
  workspaceIds.forEach((wid) => {
    const info = searcherByWorkspace.get(wid);
    if (!info) return;
    searcherOptions.push({ searcherId: info.searcherId, workspaceId: wid, displayName: info.displayName });
    const arr = searcherDays[wid];
    searcherAvgDaysCimToLoi[wid] = arr?.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });

  // ---- Market heatmap: top 5 industries in DD ----
  const { data: ddDeals } = await supabase
    .from('companies')
    .select('industry')
    .eq('stage', 'dd')
    .in('workspace_id', workspaceIds)
    .not('industry', 'is', null);

  const industryCount: Record<string, number> = {};
  (ddDeals || []).forEach((d: any) => {
    const ind = (d.industry || 'Unknown').trim();
    industryCount[ind] = (industryCount[ind] || 0) + 1;
  });
  const marketHeatmap = Object.entries(industryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([industry, count]) => ({ industry, count }));

  // ---- Red flag aggregate: top 3 phrases this week ----
  const { data: recentDeals } = await supabase
    .from('companies')
    .select('ai_red_flags')
    .in('workspace_id', workspaceIds)
    .gte('created_at', oneWeekAgo.toISOString())
    .not('ai_red_flags', 'is', null);

  const flagCount: Record<string, number> = {};
  (recentDeals || []).forEach((d: any) => {
    const phrases = parseRedFlagPhrases(d.ai_red_flags);
    phrases.forEach((p) => {
      const key = p.slice(0, 80);
      flagCount[key] = (flagCount[key] || 0) + 1;
    });
  });
  const redFlagAggregate = Object.entries(flagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([flag, count]) => ({ flag, count }));

  // ---- Leaderboard: deal flow this month per workspace ----
  const { data: companiesThisMonth } = await supabase
    .from('companies')
    .select('workspace_id')
    .in('workspace_id', workspaceIds)
    .gte('created_at', startOfMonth.toISOString());

  const flowByWorkspace: Record<string, number> = {};
  workspaceIds.forEach((w) => (flowByWorkspace[w] = 0));
  (companiesThisMonth || []).forEach((d: any) => {
    flowByWorkspace[d.workspace_id] = (flowByWorkspace[d.workspace_id] || 0) + 1;
  });
  const leaderboard = Object.entries(flowByWorkspace)
    .sort((a, b) => b[1] - a[1])
    .map(([workspaceId, dealFlowThisMonth], i) => {
      const info = searcherByWorkspace.get(workspaceId);
      return {
        rank: i + 1,
        label: info?.displayName ?? `Searcher ${i + 1}`,
        workspaceId,
        dealFlowThisMonth,
        anonymized: !info?.displayName || info.displayName.startsWith('Searcher '),
      };
    });

  // ---- Reviewing workspace IDs for broadcast ----
  const { data: reviewingDeals } = await supabase
    .from('companies')
    .select('workspace_id')
    .eq('stage', 'reviewing')
    .in('workspace_id', workspaceIds)
    .is('passed_at', null)
    .is('archived_at', null);

  const reviewingWorkspaceIds = [...new Set((reviewingDeals || []).map((d: any) => d.workspace_id))];

  return {
    driftDetector,
    cohortBenchmark: {
      coalitionAvgDaysCimToLoi,
      searcherOptions,
      searcherAvgDaysCimToLoi,
    },
    marketHeatmap,
    redFlagAggregate,
    leaderboard,
    reviewingWorkspaceIds,
  };
}
