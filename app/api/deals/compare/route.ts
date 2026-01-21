import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { checkRateLimit, getRateLimitConfig } from '@/lib/api/rate-limit';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate request
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    // Rate limiting
    const config = getRateLimitConfig('compare-deals');
    const rateLimit = await checkRateLimit(user.id, 'compare-deals', config.limit, config.windowSeconds, supabase);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${config.limit} requests per hour. Please try again later.` },
        { status: 429 }
      );
    }

    // Get deal IDs from query params
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');
    
    if (!idsParam) {
      return NextResponse.json({ error: 'Missing ids parameter' }, { status: 400 });
    }

    // Parse and validate deal IDs
    const dealIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    
    if (dealIds.length < 2 || dealIds.length > 3) {
      return NextResponse.json({ error: 'Must provide 2-3 deal IDs' }, { status: 400 });
    }

    // Fetch all deals (workspace-scoped)
    const dealsData = [];
    for (const dealId of dealIds) {
      try {
        const deal = await deals.getById(dealId);
        dealsData.push(deal);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return NextResponse.json({ error: `Deal ${dealId} not found` }, { status: 404 });
        }
        throw err;
      }
    }

    return NextResponse.json({ deals: dealsData }, { status: 200 });
  } catch (e: any) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    console.error('Error in compare deals API:', e);
    return NextResponse.json({ error: e?.message ?? 'Internal server error' }, { status: 500 });
  }
}
