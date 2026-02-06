import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DealsRepository } from '@/lib/data-access/deals';
import { NotFoundError } from '@/lib/data-access/base';
import { validateStoragePath } from '@/lib/api/security';

/**
 * GET /api/deals/[id]/cim-preview
 * Returns a signed URL for the deal's CIM PDF so the user can "cite sources" (open the PDF and go to the page the AI cited).
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

    if (deal.source_type !== 'cim_pdf' || !deal.cim_storage_path) {
      return NextResponse.json(
        { error: 'This deal has no CIM file to preview' },
        { status: 400 }
      );
    }

    const path = (deal.cim_storage_path as string).trim();
    if (!validateStoragePath(path)) {
      return NextResponse.json({ error: 'Invalid storage path' }, { status: 400 });
    }

    const bucket = 'cims';
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour

    if (urlError || !urlData?.signedUrl) {
      console.error('CIM preview signed URL error:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate CIM preview URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preview_url: urlData.signedUrl,
      expires_in_seconds: 3600,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof NotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    console.error('cim-preview error:', e);
    return NextResponse.json(
      { error: 'Failed to get CIM preview' },
      { status: 500 }
    );
  }
}
