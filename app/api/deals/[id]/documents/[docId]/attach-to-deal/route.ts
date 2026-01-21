import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * POST /api/deals/[id]/documents/[docId]/attach-to-deal
 * Attach a document from one deal to another deal
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);
    const deals = new DealsRepository(supabase, workspace.id);

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    const body = await req.json();
    const { targetDealId } = body;

    if (!targetDealId) {
      return NextResponse.json({ error: 'Missing targetDealId' }, { status: 400 });
    }

    // Verify both deals exist
    await deals.getById(targetDealId);
    const sourceDocument = await documents.getById(docId);

    // Determine bucket
    let bucket = 'deal_documents';
    if (sourceDocument.document_type === 'cim') {
      const pathParts = sourceDocument.storage_path.split('/');
      if (pathParts.length === 2) bucket = 'cims';
    } else if (sourceDocument.document_type === 'financials') {
      const pathParts = sourceDocument.storage_path.split('/');
      if (pathParts.length === 2) bucket = 'financials';
    }

    // Create new document record pointing to the same storage path
    const newDocument = await documents.create({
      deal_id: targetDealId,
      user_id: user.id,
      filename: sourceDocument.filename,
      storage_path: sourceDocument.storage_path,
      mime_type: sourceDocument.mime_type,
      document_type: sourceDocument.document_type,
      notes: `Attached from deal: ${sourceDocument.deal_id}`,
      folder: sourceDocument.folder,
      tags: sourceDocument.tags,
      file_size: sourceDocument.file_size,
    });

    return NextResponse.json({ document: newDocument });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Attach to deal error:', error);
    return NextResponse.json({ error: 'Failed to attach document to deal' }, { status: 500 });
  }
}
