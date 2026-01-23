import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// GET: List all linked searchers for the current investor
export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await authenticateRequest(req);
    
    // Check if user has investor role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'investor') {
      return NextResponse.json({ error: 'Access denied. Investor role required.' }, { status: 403 });
    }
    
    // Get all linked searchers
    const { data: links, error: linksError } = await supabase
      .from('investor_searcher_links')
      .select(`
        id,
        searcher_id,
        workspace_id,
        capital_committed,
        access_level,
        created_at,
        custom_display_name
      `)
      .eq('investor_id', user.id);
    
    if (linksError) {
      console.error('Error fetching investor_searcher_links:', {
        error: linksError,
        message: linksError.message,
        code: linksError.code,
        details: linksError.details,
        hint: linksError.hint,
      });
      return NextResponse.json({ 
        error: linksError.message || 'Failed to fetch investor links',
        code: linksError.code,
        details: linksError.details,
      }, { status: 500 });
    }
    
    // Get searcher profiles
    if (links && links.length > 0) {
      const searcherIds = links.map(l => l.searcher_id);
      // Try to get email from profiles, but make it optional in case the column doesn't exist
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', searcherIds);
      
      // If profiles query failed, still return links but without profile data
      if (profilesError) {
        console.warn('Error fetching searcher profiles (email may not be available):', profilesError);
      }
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      const linksWithProfiles = links.map(link => ({
        ...link,
        searcher: profileMap.get(link.searcher_id) || null,
      }));
      
      return NextResponse.json({ links: linksWithProfiles }, { status: 200 });
    }
    
    return NextResponse.json({ links: [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching investor links:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch links';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Create a new link (admin or investor)
export async function POST(req: NextRequest) {
  try {
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
    const { workspaceId, capitalCommitted, accessLevel } = body;
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }
    
    // Find searcher by workspace_id in profiles table
    // Use service role to bypass RLS (investors can't see other users' profiles by default)
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ 
        error: 'Server configuration error. Please contact support.' 
      }, { status: 500 });
    }
    
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
    
    const { data: searcherProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, workspace_id, role')
      .eq('workspace_id', workspaceId)
      .eq('role', 'searcher')
      .single();
    
    if (profileError || !searcherProfile) {
      // Log detailed error for debugging
      console.error('Error finding searcher profile:', {
        workspaceId,
        error: profileError,
        errorCode: profileError?.code,
        errorMessage: profileError?.message,
        errorDetails: profileError?.details,
        errorHint: profileError?.hint,
        hasProfile: !!searcherProfile,
      });
      
      // Check if it's an RLS/permission error
      const isPermissionError = 
        profileError?.code === '42501' || 
        profileError?.message?.includes('permission denied') ||
        profileError?.message?.includes('row-level security') ||
        profileError?.message?.includes('RLS policy');
      
      if (isPermissionError) {
        return NextResponse.json({ 
          error: 'Permission denied. RLS policies may be blocking access to searcher profiles. An admin may need to adjust database permissions.' 
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: `Searcher not found with that workspace ID. ${profileError?.message || 'Make sure the workspace ID is correct and the user has the searcher role.'}`,
        details: profileError?.code ? { code: profileError.code, hint: profileError.hint } : undefined
      }, { status: 404 });
    }
    
    if (searcherProfile.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Workspace ID mismatch' }, { status: 400 });
    }
    
    // Determine investor_id - if admin is creating, use body.investorId, otherwise use current user
    const investorId = body.investorId || user.id;
    
    // Create the link using service role to bypass RLS
    // (RLS policies only allow admins to insert, but we've validated the user is an investor/admin)
    const { data: link, error: linkError } = await supabaseAdmin
      .from('investor_searcher_links')
      .insert({
        investor_id: investorId,
        searcher_id: searcherProfile.id,
        workspace_id: workspaceId,
        capital_committed: capitalCommitted ? parseFloat(capitalCommitted) : null,
        access_level: accessLevel || 'summary',
      })
      .select()
      .single();
    
    if (linkError) {
      // Handle unique constraint violation
      if (linkError.code === '23505') {
        return NextResponse.json({ error: 'Link already exists between this investor and searcher' }, { status: 409 });
      }
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }
    
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Error creating investor link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create link';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
