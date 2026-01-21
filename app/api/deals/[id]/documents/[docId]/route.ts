import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DatabaseError } from '@/lib/data-access/base';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    const document = await documents.getById(docId);

    // Record access
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await documents.recordAccess(docId, user.id, 'download').catch(err => {
        console.error('Error recording access:', err);
        // Non-critical, continue
      });
    }

    // Determine which bucket the document is in based on document type or storage path
    // Documents attached from existing CIMs/financials are in 'cims' or 'financials' buckets
    // Newly uploaded documents are in 'deal_documents' bucket
    let bucket = 'deal_documents';
    if (document.document_type === 'cim') {
      // Check if storage_path looks like it's from cims bucket (contains user ID pattern)
      // CIMs are stored as: userId/filename.pdf
      // Deal documents are stored as: userId/dealId/filename.pdf
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) {
        bucket = 'cims';
      }
    } else if (document.document_type === 'financials') {
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) {
        bucket = 'financials';
      }
    }

    // Get signed URL for download
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

    if (urlError || !urlData) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({ 
      document,
      download_url: urlData.signedUrl 
    });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get document error:', error);
    return NextResponse.json({ error: 'Failed to get document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);

    const { docId } = await params;
    if (!docId) {
      return NextResponse.json({ error: 'Missing document ID' }, { status: 400 });
    }

    // Get document to get storage path
    const document = await documents.getById(docId);

    // Determine which bucket the document is in
    let bucket = 'deal_documents';
    if (document.document_type === 'cim') {
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) {
        bucket = 'cims';
      }
    } else if (document.document_type === 'financials') {
      const pathParts = document.storage_path.split('/');
      if (pathParts.length === 2) {
        bucket = 'financials';
      }
    }

    // Only delete from storage if it's in deal_documents bucket
    // Documents in cims/financials buckets are shared and shouldn't be deleted
    if (bucket === 'deal_documents') {
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([document.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue to delete DB record even if storage delete fails
      }
    }

    // Delete from database
    await documents.delete(docId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
