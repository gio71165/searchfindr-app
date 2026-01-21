import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError, DatabaseError } from '@/lib/data-access/base';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    const body = await req.json();
    const brokerId = body?.broker_id || null;

    // Verify deal exists
    await deals.getById(dealId);

    // If broker_id provided, verify broker exists
    if (brokerId) {
      const { data: broker, error: brokerError } = await supabase
        .from('brokers')
        .select('id')
        .eq('workspace_id', workspace.id)
        .eq('id', brokerId)
        .single();

      if (brokerError || !broker) {
        return NextResponse.json({ error: 'Broker not found' }, { status: 404 });
      }
    }

    // Update deal broker_id
    const { error: updateError } = await supabase
      .from('companies')
      .update({ broker_id: brokerId })
      .eq('id', dealId)
      .eq('workspace_id', workspace.id);

    if (updateError) {
      console.error('Error updating broker:', updateError);
      return NextResponse.json({ error: 'Failed to update broker' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Update broker error:', error);
    return NextResponse.json({ error: 'Failed to update broker' }, { status: 500 });
  }
}
