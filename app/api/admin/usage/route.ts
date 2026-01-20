// app/api/admin/usage/route.ts
// Admin endpoint to get detailed usage logs

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api/auth';
import { authenticateAdmin } from '@/lib/api/admin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { supabase, user } = await authenticateRequest(req);
    
    // Verify admin access
    await authenticateAdmin(supabase, user);

    // Use service role for admin queries
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;
    const endpoint = url.searchParams.get('endpoint');
    const userId = url.searchParams.get('user_id');
    const hours = parseInt(url.searchParams.get('hours') || '24');

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Build query
    let query = adminSupabase
      .from('usage_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Get total count
    let countQuery = adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since);

    if (endpoint) {
      countQuery = countQuery.eq('endpoint', endpoint);
    }

    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      success: true,
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AdminError') {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: (err as any).statusCode || 403 }
      );
    }
    console.error('Admin usage error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch usage logs' },
      { status: 500 }
    );
  }
}
