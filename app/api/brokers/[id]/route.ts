import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { BrokersRepository } from '@/lib/data-access/brokers';
import { DatabaseError } from '@/lib/data-access/base';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const brokers = new BrokersRepository(supabase, workspace.id);

    const { id: brokerId } = await params;
    if (!brokerId) {
      return NextResponse.json({ error: 'Missing broker ID' }, { status: 400 });
    }

    const body = await req.json();
    const updates: any = {};

    if (body.name !== undefined) updates.name = typeof body.name === 'string' ? body.name.trim() : null;
    if (body.firm !== undefined) updates.firm = body.firm || null;
    if (body.email !== undefined) updates.email = body.email || null;
    if (body.phone !== undefined) updates.phone = body.phone || null;
    if (body.quality_rating !== undefined) updates.quality_rating = body.quality_rating || null;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    if (updates.name === '') {
      return NextResponse.json({ error: 'Broker name cannot be empty' }, { status: 400 });
    }

    const broker = await brokers.update(brokerId, updates);

    return NextResponse.json({ broker });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Update broker error:', error);
    return NextResponse.json({ error: 'Failed to update broker' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const brokers = new BrokersRepository(supabase, workspace.id);

    const { id: brokerId } = await params;
    if (!brokerId) {
      return NextResponse.json({ error: 'Missing broker ID' }, { status: 400 });
    }

    await brokers.delete(brokerId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Delete broker error:', error);
    return NextResponse.json({ error: 'Failed to delete broker' }, { status: 500 });
  }
}
