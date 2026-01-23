import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { BrokersRepository } from '@/lib/data-access/brokers';
import { DatabaseError } from '@/lib/data-access/base';
import { getCorsHeaders } from '@/lib/api/security';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const { id: brokerId } = await params;
    const brokers = new BrokersRepository(supabase, workspace.id);

    const deals = await brokers.getDeals(brokerId);

    return NextResponse.json({ deals }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get broker deals error:', error);
    return NextResponse.json({ error: 'Failed to load deals' }, { status: 500, headers: corsHeaders });
  }
}
