import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError, DatabaseError } from '@/lib/data-access/base';
import { logAudit } from '@/lib/api/audit';

export async function GET(req: NextRequest) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    const idsParam = req.nextUrl.searchParams.get('ids');
    if (!idsParam) {
      return NextResponse.json({ error: 'No deal IDs provided' }, { status: 400 });
    }

    const dealIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (dealIds.length === 0) {
      return NextResponse.json({ error: 'No valid deal IDs provided' }, { status: 400 });
    }

    // Fetch all deals
    const dealList = [];
    for (const dealId of dealIds) {
      try {
        const deal = await deals.getById(dealId);
        dealList.push(deal);
      } catch (err) {
        if (err instanceof NotFoundError) {
          console.warn(`Deal ${dealId} not found, skipping`);
        } else {
          console.error(`Error fetching deal ${dealId}:`, err);
        }
      }
    }

    if (dealList.length === 0) {
      return NextResponse.json({ error: 'No deals found' }, { status: 404 });
    }

    // Build CSV
    const rows: string[][] = [];
    
    // Header row
    const headers = [
      'Company Name',
      'Location',
      'Industry',
      'Source Type',
      'Revenue (TTM)',
      'EBITDA',
      'EBITDA Margin',
      'Asking Price',
      'Tier',
      'Verdict',
      'Stage',
      'Red Flag Count',
      'Data Confidence',
      'SBA Eligible',
      'Created Date',
      'Next Action',
      'Next Action Date',
      'User Notes',
      'Tags',
    ];
    rows.push(headers);

    // Helper to safely get value
    const getValue = (val: any): string => {
      if (val === null || val === undefined) return '—';
      if (Array.isArray(val)) return val.join('; ');
      return String(val);
    };

    // Data rows
    for (const deal of dealList) {
      const fin = deal.ai_financials_json || {};
      const revenue = Array.isArray(fin.revenue) && fin.revenue.length > 0
        ? fin.revenue[0]?.value || fin.revenue[0]?.note || '—'
        : typeof fin.revenue === 'string' ? fin.revenue : '—';
      const ebitda = Array.isArray(fin.ebitda) && fin.ebitda.length > 0
        ? fin.ebitda[0]?.value || fin.ebitda[0]?.note || '—'
        : typeof fin.ebitda === 'string' ? fin.ebitda : '—';
      const margin = typeof fin.margin === 'string' ? fin.margin : '—';
      
      const redFlags = Array.isArray(deal.ai_red_flags) 
        ? deal.ai_red_flags 
        : typeof deal.ai_red_flags === 'string' 
          ? deal.ai_red_flags.split('\n').filter(Boolean)
          : [];
      
      const confidence = deal.ai_confidence_json?.level || '—';
      const askingPrice = deal.asking_price_extracted || deal.criteria_match_json?.asking_price || '—';
      const location = [deal.location_city, deal.location_state].filter(Boolean).join(', ') || '—';
      const tags = Array.isArray(deal.tags) ? deal.tags.join('; ') : '—';

      rows.push([
        getValue(deal.company_name),
        location,
        getValue(deal.industry),
        getValue(deal.source_type),
        getValue(revenue),
        getValue(ebitda),
        getValue(margin),
        getValue(askingPrice),
        getValue(deal.final_tier),
        getValue(deal.verdict),
        getValue(deal.stage || 'new'),
        String(redFlags.length),
        getValue(confidence),
        deal.sba_eligible ? 'Yes' : 'No',
        deal.created_at ? new Date(deal.created_at).toLocaleDateString() : '—',
        getValue(deal.next_action),
        deal.next_action_date ? new Date(deal.next_action_date).toLocaleDateString() : '—',
        getValue(deal.user_notes),
        tags,
      ]);
    }

    await logAudit(supabase, {
      workspace_id: workspace.id,
      user_id: user.id,
      action: 'bulk_export',
      resource_type: 'deal',
      metadata: { deal_count: dealList.length, deal_ids: dealIds },
    });

    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="deals_export_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Bulk export error:', error);
    return NextResponse.json({ error: 'Failed to export deals' }, { status: 500 });
  }
}
