import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DatabaseError } from '@/lib/data-access/base';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);

    const { id: presetId } = await params;
    if (!presetId) {
      return NextResponse.json({ error: 'Missing preset ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('saved_filter_presets')
      .delete()
      .eq('id', presetId)
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id);

    if (error) {
      throw new DatabaseError(`Failed to delete filter preset: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Delete filter preset error:', error);
    return NextResponse.json({ error: 'Failed to delete filter preset' }, { status: 500 });
  }
}
