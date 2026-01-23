import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { getCorsHeaders } from '@/lib/api/security';
import { updateDDItem, updateDDItemStatus } from '@/lib/data-access/dd-tracker';

export const runtime = 'nodejs';

const corsHeaders = getCorsHeaders();

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { supabase } = await authenticateRequest(req);
    const { itemId } = await params;
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const body = await req.json();
    const { status, ...otherUpdates } = body;
    
    // Update status if provided
    if (status) {
      const success = await updateDDItemStatus(supabase, itemId, status);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update item status' },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // Update other fields if provided
    if (Object.keys(otherUpdates).length > 0) {
      const success = await updateDDItem(supabase, itemId, otherUpdates);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update item' },
          { status: 500, headers: corsHeaders }
        );
      }
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
    console.error('update-dd-item error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to update DD item' },
      { status: 500, headers: corsHeaders }
    );
  }
}
