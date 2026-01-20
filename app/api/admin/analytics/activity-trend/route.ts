// app/api/admin/analytics/activity-trend/route.ts
// Activity trend data for last 30 days

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateAdmin } from '@/lib/api/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);
    await authenticateAdmin(supabase, user);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all deals created in last 30 days
    const { data: deals } = await adminSupabase
      .from('companies')
      .select('created_at, cim_storage_path, financials_storage_path')
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Group by date
    const dailyData: Record<
      string,
      { date: string; cims: number; financials: number; deals: number }
    > = {};

    // Initialize all 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { date: dateStr, cims: 0, financials: 0, deals: 0 };
    }

    // Count deals, CIMs, and financials by date
    deals?.forEach((deal) => {
      const dateStr = deal.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].deals++;
        if (deal.cim_storage_path) {
          dailyData[dateStr].cims++;
        }
        if (deal.financials_storage_path) {
          dailyData[dateStr].financials++;
        }
      }
    });

    // Convert to array and format dates
    const trendData = Object.values(dailyData).map((day) => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cims: day.cims,
      financials: day.financials,
      deals: day.deals,
    }));

    return NextResponse.json({
      success: true,
      data: trendData,
    });
  } catch (err) {
    console.error('Activity trend error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity trend' },
      { status: 500 }
    );
  }
}
