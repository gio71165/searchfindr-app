import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * GET /api/deals/[id]/documents/search
 * Search and filter documents
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);
    const deals = new DealsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Verify deal exists
    await deals.getById(dealId);

    const { searchParams } = new URL(req.url);
    const filters = {
      searchQuery: searchParams.get('q') || undefined,
      documentType: searchParams.get('type') || undefined,
      folder: searchParams.get('folder') || undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const results = await documents.search(dealId, filters);

    return NextResponse.json({ documents: results });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Search documents error:', error);
    return NextResponse.json({ error: 'Failed to search documents' }, { status: 500 });
  }
}
