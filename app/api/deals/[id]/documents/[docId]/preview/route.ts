import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * GET /api/deals/[id]/documents/[docId]/preview
 * Get preview URL for a document (for PDF viewer)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { supabase, workspace, user } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    const document = await documents.getById(docId);

    // Record preview access
    if (user) {
      await documents.recordAccess(docId, user.id, 'preview').catch(err => {
        console.error('Error recording access:', err);
      });
    }

    // Determine bucket
    let bucket = 'deal_documents';
    if (document.document_type === 'cim') {
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) bucket = 'cims';
    } else if (document.document_type === 'financials') {
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) bucket = 'financials';
    }

    // Get signed URL for preview (longer expiry for viewing)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.storage_path, 3600 * 24); // 24 hour expiry for preview

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 });
    }

    return NextResponse.json({
      preview_url: urlData.signedUrl,
      document_type: document.document_type,
      mime_type: document.mime_type,
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get preview error:', error);
    return NextResponse.json({ error: 'Failed to get preview' }, { status: 500 });
  }
}
