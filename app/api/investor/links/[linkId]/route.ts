import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// PATCH: Update custom display name for a searcher link
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params;
    
    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }
    
    const { supabase, user } = await authenticateRequest(req);
    
    // Check if user is admin or investor
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile || (!profile.is_admin && profile.role !== 'investor')) {
      return NextResponse.json({ error: 'Access denied. Admin or investor role required.' }, { status: 403 });
    }
    
    const body = await req.json();
    const { custom_display_name } = body;
    
    // Verify the link belongs to this investor
    const { data: link, error: linkError } = await supabase
      .from('investor_searcher_links')
      .select('investor_id')
      .eq('id', linkId)
      .single();
    
    if (linkError) {
      console.error('Error fetching link:', {
        linkId,
        error: linkError,
        message: linkError.message,
        code: linkError.code,
        details: linkError.details,
        hint: linkError.hint,
      });
      
      // Check if it's an RLS/permission error
      if (linkError.code === '42501' || linkError.message?.includes('permission denied') || linkError.message?.includes('row-level security')) {
        return NextResponse.json({ 
          error: 'Permission denied. Unable to access link. This may be due to RLS policies.' 
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: linkError.message || 'Link not found',
        code: linkError.code 
      }, { status: 404 });
    }
    
    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    
    // Only allow updating if user is admin or the link belongs to them
    if (!profile.is_admin && link.investor_id !== user.id) {
      return NextResponse.json({ error: 'Access denied. You can only update your own links.' }, { status: 403 });
    }
    
    // Update the custom display name using service role to bypass RLS
    // (RLS policies may only allow admins to update, but we've validated the user is an investor/admin)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    
    const { data: updatedLink, error: updateError } = await supabaseAdmin
      .from('investor_searcher_links')
      .update({ custom_display_name: custom_display_name || null })
      .eq('id', linkId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating custom display name:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ link: updatedLink }, { status: 200 });
  } catch (error) {
    console.error('Error updating searcher link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update link';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
