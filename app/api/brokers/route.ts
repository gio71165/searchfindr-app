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

export async function GET(req: NextRequest) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const brokers = new BrokersRepository(supabase, workspace.id);

    const brokersList = await brokers.getAll();
    
    // Update stats for all brokers and get deal counts
    const brokersWithStats = await Promise.all(
      brokersList.map(async (broker) => {
        // Update stats
        await brokers.updateBrokerStats(broker.id).catch(err => {
          console.error(`Failed to update stats for broker ${broker.id}:`, err);
        });
        
        // Get fresh broker data with updated stats
        const updatedBroker = await brokers.getById(broker.id);
        const dealCount = updatedBroker.deals_received || 0;
        
        return { ...updatedBroker, deal_count: dealCount };
      })
    );

    return NextResponse.json({ brokers: brokersWithStats }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get brokers error:', error);
    return NextResponse.json({ error: 'Failed to load brokers' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const brokers = new BrokersRepository(supabase, workspace.id);

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Broker name is required' }, { status: 400 });
    }

    const broker = await brokers.create({
      name,
      firm: body?.firm || null,
      email: body?.email || null,
      phone: body?.phone || null,
      quality_rating: body?.quality_rating || null,
      notes: body?.notes || null,
    });

    return NextResponse.json({ broker });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Create broker error:', error);
    return NextResponse.json({ error: 'Failed to create broker' }, { status: 500 });
  }
}
