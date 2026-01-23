import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { markAllItemsAsRequested } from '@/lib/data-access/dd-tracker';

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
    const { supabase } = await authenticateRequest(req);
    const { id: dealId } = await params;
    
    if (!dealId) {
      return NextResponse.json(
        { error: 'Deal ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const success = await markAllItemsAsRequested(supabase, dealId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to mark items as requested' },
        { status: 500, headers: corsHeaders }
      );
    }
    
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
    console.error('mark-all-requested error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to mark items as requested' },
      { status: 500, headers: corsHeaders }
    );
  }
}
