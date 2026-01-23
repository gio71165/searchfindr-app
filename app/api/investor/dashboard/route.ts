import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { getInvestorDashboard } from '@/lib/data-access/investor-analytics';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'investor') {
      return NextResponse.json({ error: 'Access denied. Investor role required.' }, { status: 403 });
    }

    const dashboardData = await getInvestorDashboard(user.id, supabase);
    return NextResponse.json(dashboardData, { status: 200 });
  } catch (error) {
    console.error('Error fetching investor dashboard:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investor dashboard';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
