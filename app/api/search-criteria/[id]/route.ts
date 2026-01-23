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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const { id: criteriaId } = await params;
    const repository = new SearchCriteriaRepository(supabase, workspace.id, user.id);

    const criteria = await repository.getById(criteriaId);

    return NextResponse.json({ criteria }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get search criteria error:', error);
    return NextResponse.json({ error: 'Failed to load search criteria' }, { status: 500, headers: corsHeaders });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const { id: criteriaId } = await params;
    const repository = new SearchCriteriaRepository(supabase, workspace.id, user.id);

    const body = await req.json();
    const criteria = await repository.update(criteriaId, body);

    return NextResponse.json({ criteria }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Update search criteria error:', error);
    return NextResponse.json({ error: 'Failed to update search criteria' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const { id: criteriaId } = await params;
    const repository = new SearchCriteriaRepository(supabase, workspace.id, user.id);

    await repository.delete(criteriaId);

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode, headers: corsHeaders });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Delete search criteria error:', error);
    return NextResponse.json({ error: 'Failed to delete search criteria' }, { status: 500, headers: corsHeaders });
  }
}
