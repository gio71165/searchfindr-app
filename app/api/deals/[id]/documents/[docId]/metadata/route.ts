import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * PATCH /api/deals/[id]/documents/[docId]/metadata
 * Update document metadata (folder, tags, notes)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    const body = await req.json();
    const { folder, tags, notes } = body;

    const updates: {
      folder?: string | null;
      tags?: string[] | null;
      notes?: string | null;
    } = {};

    if (folder !== undefined) updates.folder = folder || null;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : null;
    if (notes !== undefined) updates.notes = notes || null;

    const document = await documents.updateMetadata(docId, updates);

    return NextResponse.json({ document });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Update metadata error:', error);
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 });
  }
}
