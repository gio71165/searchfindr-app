import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateCoalitionLeader } from '@/lib/api/admin';
import { getCoalitionDashboardData } from '@/lib/data-access/coalition';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);
    await authenticateCoalitionLeader(supabase, user);
    const data = await getCoalitionDashboardData();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    const status = error?.statusCode ?? 500;
    const message = error?.message ?? 'Failed to load coalition dashboard';
    return NextResponse.json({ error: message }, { status });
  }
}
