import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { SearchCriteriaRepository } from '@/lib/data-access/search-criteria';
import { DatabaseError } from '@/lib/data-access/base';
import { getCorsHeaders } from '@/lib/api/security';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const repository = new SearchCriteriaRepository(supabase, workspace.id, user.id);

    const criteria = await repository.getAll();

    return NextResponse.json({ criteria }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get search criteria error:', error);
    return NextResponse.json({ error: 'Failed to load search criteria' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const repository = new SearchCriteriaRepository(supabase, workspace.id, user.id);

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const criteria = await repository.create(body);

    return NextResponse.json({ criteria }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Create search criteria error:', error);
    return NextResponse.json({ error: 'Failed to create search criteria' }, { status: 500, headers: corsHeaders });
  }
}
