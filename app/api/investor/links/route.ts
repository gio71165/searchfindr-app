import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';

export const runtime = 'nodejs';

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
        created_at
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', searcherIds);
      
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
    const { searcherEmail, workspaceId, capitalCommitted, accessLevel } = body;
    
    if (!searcherEmail || !workspaceId) {
      return NextResponse.json({ error: 'searcherEmail and workspaceId are required' }, { status: 400 });
    }
    
    // Find searcher by email in profiles table
    const { data: searcherProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, workspace_id, role')
      .eq('email', searcherEmail)
      .single();
    
    if (profileError || !searcherProfile) {
      return NextResponse.json({ error: 'Searcher not found with that email' }, { status: 404 });
    }
    
    if (searcherProfile.workspace_id !== workspaceId) {
      return NextResponse.json({ error: 'Workspace ID does not match searcher' }, { status: 400 });
    }
    
    // Determine investor_id - if admin is creating, use body.investorId, otherwise use current user
    const investorId = body.investorId || user.id;
    
    // Create the link
    const { data: link, error: linkError } = await supabase
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
