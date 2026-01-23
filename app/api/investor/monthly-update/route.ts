import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getInvestorDashboard } from '@/lib/data-access/investor-analytics';
import { generateMonthlyUpdateHTML } from '@/lib/utils/investor-update';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.role !== 'investor') {
      return NextResponse.json({ error: 'Access denied. Investor role required.' }, { status: 403 });
    }
    
    // Get month parameter (default to current month)
    const searchParams = req.nextUrl.searchParams;
    const monthParam = searchParams.get('month');
    const month = monthParam || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Fetch investor dashboard data
    const dashboardData = await getInvestorDashboard(user.id);
    
    // Generate HTML
    const html = generateMonthlyUpdateHTML(dashboardData, month);
    
    // Return HTML response
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating monthly update:', error);
    return NextResponse.json(
      { error: 'Failed to generate monthly update' },
      { status: 500 }
    );
  }
}
