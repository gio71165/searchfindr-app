import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, AuthError } from '@/lib/api/auth';
import { DocumentsRepository } from '@/lib/data-access/documents';
import { DealsRepository } from '@/lib/data-access/deals';
import { DatabaseError } from '@/lib/data-access/base';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, workspace } = await authenticateRequest(req);
    const documents = new DocumentsRepository(supabase, workspace.id);

    const { id: dealId } = await params;
    if (!dealId) {
      return NextResponse.json({ error: 'Missing deal ID' }, { status: 400 });
    }

    // Verify deal exists
    const deals = new DealsRepository(supabase, workspace.id);
    await deals.getById(dealId);

    const documentsList = await documents.getByDealId(dealId);

    return NextResponse.json({ documents: documentsList });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Get documents error:', error);
    return NextResponse.json({ error: 'Failed to get documents' }, { status: 500 });
  }
}

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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const notes = formData.get('notes') as string | null;
    const folder = formData.get('folder') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const parentDocumentId = formData.get('parent_document_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Parse tags
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : null;

    // If this is a new version, get the version number
    let version = 1;
    if (parentDocumentId) {
      try {
        const versions = await documents.getVersions(parentDocumentId);
        version = Math.max(...versions.map(v => v.version)) + 1;
      } catch (err) {
        // If parent doesn't exist, treat as new document
        version = 1;
      }
    }

    // Upload to storage
    const fileExt = file.name.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${user.id}/${dealId}/${fileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('deal_documents')
      .upload(filePath, file);

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create document record
    // Only include new fields if they exist (graceful degradation if migration not run)
    const documentData: any = {
      deal_id: dealId,
      user_id: user.id,
      filename: file.name,
      storage_path: storageData.path,
      mime_type: file.type || null,
      document_type: documentType as any || 'other',
      notes: notes || null,
      version: version,
    };

    // Add optional fields (will be ignored if columns don't exist)
    if (folder) documentData.folder = folder;
    if (tags && tags.length > 0) documentData.tags = tags;
    if (file.size) documentData.file_size = file.size;
    if (parentDocumentId) documentData.parent_document_id = parentDocumentId;

    const document = await documents.create(documentData);

    return NextResponse.json({ document });
  } catch (e: unknown) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    if (e instanceof DatabaseError) {
      return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
    const error = e instanceof Error ? e : new Error('Unknown error');
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
