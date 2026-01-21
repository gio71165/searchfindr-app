import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

/**
 * POST /api/deals/[id]/documents/attach
 * Attaches an existing CIM or financials from storage to a deal
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);
    const deals = new DealsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Verify deal exists
    const deal = await deals.getById(dealId);

    const body = await req.json();
    const { storage_path, document_type, source_deal_id, bucket } = body;

    if (!storage_path || !document_type || !bucket) {
      return NextResponse.json(
        { error: 'Missing required fields: storage_path, document_type, bucket' },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = ['cim', 'financials', 'loi', 'term_sheet', 'other'];
    if (!validTypes.includes(document_type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Validate bucket
    const validBuckets = ['cims', 'financials'];
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }

    // Verify the source file exists in storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from(bucket)
      .list(storage_path.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: storage_path.split('/').pop() || '',
      });

    if (fileError || !fileData || fileData.length === 0) {
      return NextResponse.json({ error: 'File not found in storage' }, { status: 404 });
    }

    // Get filename from storage path or use a default
    const filename = storage_path.split('/').pop() || 'document.pdf';
    
    // Get original deal name if source_deal_id is provided
    let notes = null;
    if (source_deal_id) {
      try {
        const sourceDeal = await deals.getById(source_deal_id);
        notes = `Attached from deal: ${sourceDeal.company_name || 'Unknown'}`;
      } catch (err) {
        // Source deal not found, continue without notes
      }
    }

    // Create document record pointing to the existing storage path
    const document = await documents.create({
      deal_id: dealId,
      user_id: user.id,
      filename: filename,
      storage_path: storage_path,
      mime_type: bucket === 'cims' ? 'application/pdf' : null,
      document_type: document_type as any,
      notes: notes,
    });

    return NextResponse.json({ document });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Attach document error:', error);
    return NextResponse.json({ error: 'Failed to attach document' }, { status: 500 });
  }
}
