import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { createDDChecklistFromTemplate } from '@/lib/data-access/dd-tracker';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const { id: dealId } = await params;
    
    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Check if checklist already exists
    const { data: existing } = await supabase
      .from('dd_categories')
      .select('id')
      .eq('deal_id', dealId)
      .eq('workspace_id', workspace.id)
      .limit(1);
    
    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'DD checklist already exists for this deal' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    await createDDChecklistFromTemplate(supabase, dealId, workspace.id);
    
    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode, headers: corsHeaders }
      );
    }
    console.error('init-dd-checklist error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize DD checklist' },
      { status: 500, headers: corsHeaders }
    );
  }
}
