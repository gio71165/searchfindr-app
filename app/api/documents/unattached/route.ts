import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * GET /api/documents/unattached
 * Returns CIMs and financials that are standalone deals (not attached to other deals)
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const deals = new DealsRepository(supabase, workspace.id);

    // Get all deals that are CIMs or financials
    const { data: cimDeals, error: cimError } = await supabase
      .from('companies')
      .select('id, company_name, cim_storage_path, created_at')
      .eq('workspace_id', workspace.id)
      .eq('source_type', 'cim_pdf')
      .not('cim_storage_path', 'is', null)
      .order('created_at', { ascending: false });

    if (cimError) {
      console.error('Error fetching CIMs:', cimError);
      return NextResponse.json({ error: 'Failed to fetch CIMs' }, { status: 500 });
    }

    const { data: financialsDeals, error: finError } = await supabase
      .from('companies')
      .select('id, company_name, financials_storage_path, financials_filename, created_at')
      .eq('workspace_id', workspace.id)
      .eq('source_type', 'financials')
      .not('financials_storage_path', 'is', null)
      .order('created_at', { ascending: false });

    if (finError) {
      console.error('Error fetching financials:', finError);
      return NextResponse.json({ error: 'Failed to fetch financials' }, { status: 500 });
    }

    // Get all storage paths that are already attached to deals via deal_documents
    const { data: attachedDocs, error: attachedError } = await supabase
      .from('deal_documents')
      .select('storage_path')
      .eq('workspace_id', workspace.id);

    if (attachedError) {
      console.error('Error checking attached documents:', attachedError);
    }

    // Build set of storage paths that are attached
    const attachedPaths = new Set(
      (attachedDocs || []).map(doc => doc.storage_path)
    );

    // Filter out CIMs that are already attached to deals
    const unattachedCims = (cimDeals || []).filter(deal => {
      return deal.cim_storage_path && !attachedPaths.has(deal.cim_storage_path);
    }).map(deal => ({
      id: deal.id,
      name: deal.company_name || 'Untitled CIM',
      storage_path: deal.cim_storage_path!,
      type: 'cim' as const,
      created_at: deal.created_at,
    }));

    // Filter out financials that are already attached to deals
    const unattachedFinancials = (financialsDeals || []).filter(deal => {
      return deal.financials_storage_path && !attachedPaths.has(deal.financials_storage_path);
    }).map(deal => ({
      id: deal.id,
      name: deal.company_name || deal.financials_filename || 'Untitled Financials',
      storage_path: deal.financials_storage_path!,
      filename: deal.financials_filename,
      type: 'financials' as const,
      created_at: deal.created_at,
    }));

    return NextResponse.json({
      cims: unattachedCims,
      financials: unattachedFinancials,
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get unattached documents error:', error);
    return NextResponse.json({ error: 'Failed to get unattached documents' }, { status: 500 });
  }
}
