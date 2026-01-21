import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';
import JSZip from 'jszip';

/**
 * POST /api/deals/[id]/documents/bulk
 * Bulk operations on documents (download as ZIP, attach multiple, etc.)
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
    await deals.getById(dealId);

    const body = await req.json();
    const { action, documentIds } = body;

    if (!action || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing action or documentIds' },
        { status: 400 }
      );
    }

    if (action === 'download') {
      if (!JSZip) {
        // JSZip not available - return individual download URLs
        const downloadUrls: Array<{ id: string; filename: string; url: string }> = [];
        
        for (const docId of documentIds) {
          try {
            const document = await documents.getById(docId);
            
            // Determine bucket
            let bucket = 'deal_documents';
            if (document.document_type === 'cim') {
              const pathParts = document.storage_path.split('/');
              if (pathParts.length === 2) bucket = 'cims';
            } else if (document.document_type === 'financials') {
              const pathParts = document.storage_path.split('/');
              if (pathParts.length === 2) bucket = 'financials';
            }

            // Get signed URL
            const { data: urlData } = await supabase.storage
              .from(bucket)
              .createSignedUrl(document.storage_path, 3600);

            if (urlData) {
              downloadUrls.push({
                id: document.id,
                filename: document.filename,
                url: urlData.signedUrl,
              });
            }
          } catch (err) {
            console.error(`Error processing document ${docId}:`, err);
            continue;
          }
        }

        // Record access
        for (const docId of documentIds) {
          try {
            await documents.recordAccess(docId, user.id, 'download');
          } catch (err) {
            console.error('Error recording access:', err);
          }
        }

        return NextResponse.json({
          urls: downloadUrls,
          note: 'JSZip not installed - returning individual URLs. Install jszip package for ZIP download.',
        });
      }

      // Create ZIP file with selected documents
      const zip = new JSZip();

      for (const docId of documentIds) {
        try {
          const document = await documents.getById(docId);
          
          // Determine bucket
          let bucket = 'deal_documents';
          if (document.document_type === 'cim') {
            const pathParts = document.storage_path.split('/');
            if (pathParts.length === 2) bucket = 'cims';
          } else if (document.document_type === 'financials') {
            const pathParts = document.storage_path.split('/');
            if (pathParts.length === 2) bucket = 'financials';
          }

          // Get file from storage
          const { data: fileData, error: fileError } = await supabase.storage
            .from(bucket)
            .download(document.storage_path);

          if (fileError || !fileData) {
            console.error(`Error downloading ${document.filename}:`, fileError);
            continue;
          }

          const arrayBuffer = await fileData.arrayBuffer();
          zip.file(document.filename, arrayBuffer);
        } catch (err) {
          console.error(`Error processing document ${docId}:`, err);
          continue;
        }
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipArrayBuffer = await zipBlob.arrayBuffer();

      // Record access for all documents
      for (const docId of documentIds) {
        try {
          await documents.recordAccess(docId, user.id, 'download');
        } catch (err) {
          console.error('Error recording access:', err);
        }
      }

      return new NextResponse(zipArrayBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="deal_documents_${Date.now()}.zip"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Bulk operation error:', error);
    return NextResponse.json({ error: 'Failed to perform bulk operation' }, { status: 500 });
  }
}
