import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * GET /api/deals/[id]/documents/[docId]/versions
 * Get all versions of a document
 */
export async function GET(
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

    const versions = await documents.getVersions(docId);

    return NextResponse.json({ versions });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get versions error:', error);
    return NextResponse.json({ error: 'Failed to get versions' }, { status: 500 });
  }
}
