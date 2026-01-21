import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { BrokersRepository } from '@/lib/data-access/brokers';
import { DatabaseError } from '@/lib/data-access/base';

export async function GET(req: NextRequest) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const brokers = new BrokersRepository(supabase, workspace.id);

    const brokersList = await brokers.getAll();
    
    // Get deal counts for each broker
    const brokersWithCounts = await Promise.all(
      brokersList.map(async (broker) => {
        const dealCount = await brokers.getDealCount(broker.id);
        return { ...broker, deal_count: dealCount };
      })
    );

    return NextResponse.json({ brokers: brokersWithCounts });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get brokers error:', error);
    return NextResponse.json({ error: 'Failed to load brokers' }, { status: 500 });
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
