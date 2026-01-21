import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DatabaseError } from '@/lib/data-access/base';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);

    const { data, error } = await supabase
      .from('saved_filter_presets')
      .select('id, name, filters, created_at')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(`Failed to load filter presets: ${error.message}`);
    }

    return NextResponse.json({ presets: data || [] });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get filter presets error:', error);
    return NextResponse.json({ error: 'Failed to load filter presets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const filters = body?.filters || {};

    if (!name) {
      return NextResponse.json({ error: 'Filter name is required' }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: 'Filter name must be 100 characters or less' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('saved_filter_presets')
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        name,
        filters,
      })
      .select('id, name, filters, created_at')
      .single();

    if (error) {
      throw new DatabaseError(`Failed to save filter preset: ${error.message}`);
    }

    return NextResponse.json({ preset: data });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Save filter preset error:', error);
    return NextResponse.json({ error: 'Failed to save filter preset' }, { status: 500 });
  }
}
