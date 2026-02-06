import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { validateStoragePath } from '@/lib/api/security';

/**
 * GET /api/deals/[id]/financials-preview
 * Returns a signed URL for the deal's financials file (Excel/CSV/PDF) for download or preview.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const { id: dealId } = await params;

    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    const deals = new DealsRepository(supabase, workspace.id);
    const deal = await deals.getByIdIncludingArchived(dealId);

    if (deal.source_type !== 'financials' || !deal.financials_storage_path) {
      return NextResponse.json(
        { error: 'This deal has no financials file to open' },
        { status: 400 }
      );
    }

    const path = (deal.financials_storage_path as string).trim();
    if (!validateStoragePath(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const bucket = 'financials';
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour

    if (urlError || !urlData?.signedUrl) {
      console.error('Financials preview signed URL error:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate financials preview URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preview_url: urlData.signedUrl,
      filename: deal.financials_filename || 'financials',
      expires_in_seconds: 3600,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('financials-preview error:', e);
    return NextResponse.json(
      { error: 'Failed to get financials preview' },
      { status: 500 }
    );
  }
}
