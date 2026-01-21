import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError } from "./base";

export interface DealDocument {
  id: string;
  workspace_id: string;
  deal_id: string;
  user_id: string | null;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  version: number;
  notes: string | null;
  folder: string | null;
  tags: string[] | null;
  file_size: number | null;
  parent_document_id: string | null;
  accessed_at: string | null;
  accessed_by: string | null;
  access_count: number;
  created_at: string;
}

export interface CreateDocumentData {
  deal_id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  mime_type?: string | null;
  document_type?: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  version?: number;
  notes?: string | null;
  folder?: string | null;
  tags?: string[] | null;
  file_size?: number | null;
  parent_document_id?: string | null;
}

/**
 * Repository for managing deal documents in the database.
 * All queries are automatically scoped to the workspace.
 */
export class DocumentsRepository extends BaseRepository {
  /**
   * Gets all documents for a deal.
   * @param dealId - The deal ID
   * @returns Array of documents
   * @throws DatabaseError if database error occurs
   */
  async getByDealId(dealId: string): Promise<DealDocument[]> {
    const { data, error } = await this.supabase
      .from("deal_documents")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError(error, "Failed to get documents");
    }

    return (data || []) as DealDocument[];
  }

  /**
   * Gets a document by ID.
   * @param documentId - The document ID
   * @returns The document
   * @throws DatabaseError if database error occurs
   */
  async getById(documentId: string): Promise<DealDocument> {
    const { data, error } = await this.supabase
      .from("deal_documents")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("id", documentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new DatabaseError(`Document with id ${documentId} not found`, 404);
      }
      this.handleError(error, "Failed to get document");
    }

    if (!data) {
      throw new DatabaseError(`Document with id ${documentId} not found`, 404);
    }

    return data as DealDocument;
  }

  /**
   * Creates a new document.
   * @param documentData - The document data
   * @returns The created document
   * @throws DatabaseError if database error occurs
   */
  async create(documentData: CreateDocumentData): Promise<DealDocument> {
    const insertData: any = {
      deal_id: documentData.deal_id,
      user_id: documentData.user_id,
      filename: documentData.filename,
      storage_path: documentData.storage_path,
      mime_type: documentData.mime_type || null,
      document_type: documentData.document_type || null,
      notes: documentData.notes || null,
      workspace_id: this.workspaceId,
      version: documentData.version || 1,
    };

    // Only include new fields if provided (graceful degradation if migration not run)
    if (documentData.folder !== undefined) insertData.folder = documentData.folder;
    if (documentData.tags !== undefined) insertData.tags = documentData.tags;
    if (documentData.file_size !== undefined) insertData.file_size = documentData.file_size;
    if (documentData.parent_document_id !== undefined) insertData.parent_document_id = documentData.parent_document_id;

    const { data, error } = await this.supabase
      .from("deal_documents")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If error is about missing columns, try without new fields
      if (error.message?.includes('column') && (
        error.message.includes('folder') ||
        error.message.includes('tags') ||
        error.message.includes('file_size') ||
        error.message.includes('parent_document_id')
      )) {
        // Retry without new fields
        const fallbackData: any = {
          deal_id: documentData.deal_id,
          user_id: documentData.user_id,
          filename: documentData.filename,
          storage_path: documentData.storage_path,
          mime_type: documentData.mime_type || null,
          document_type: documentData.document_type || null,
          notes: documentData.notes || null,
          workspace_id: this.workspaceId,
          version: documentData.version || 1,
        };
        
        const { data: fallbackResult, error: fallbackError } = await this.supabase
          .from("deal_documents")
          .insert(fallbackData)
          .select()
          .single();

        if (fallbackError) {
          this.handleError(fallbackError, "Failed to create document");
        }

        if (!fallbackResult) {
          throw new DatabaseError("Failed to create document: no data returned");
        }

        return fallbackResult as DealDocument;
      }
      
      this.handleError(error, "Failed to create document");
    }

    if (!data) {
      throw new DatabaseError("Failed to create document: no data returned");
    }

    return data as DealDocument;
  }

  /**
   * Deletes a document.
   * @param documentId - The document ID
   * @throws DatabaseError if database error occurs
   */
  async delete(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from("deal_documents")
      .delete()
      .eq("workspace_id", this.workspaceId)
      .eq("id", documentId);

    if (error) {
      this.handleError(error, "Failed to delete document");
    }
  }

  /**
   * Updates document notes.
   * @param documentId - The document ID
   * @param notes - The notes to update
   * @returns The updated document
   * @throws DatabaseError if database error occurs
   */
  async updateNotes(documentId: string, notes: string | null): Promise<DealDocument> {
    const { data, error } = await this.supabase
      .from("deal_documents")
      .update({ notes })
      .eq("workspace_id", this.workspaceId)
      .eq("id", documentId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new DatabaseError(`Document with id ${documentId} not found`, 404);
      }
      this.handleError(error, "Failed to update document");
    }

    if (!data) {
      throw new DatabaseError(`Document with id ${documentId} not found`, 404);
    }

    return data as DealDocument;
  }

  /**
   * Updates document metadata (folder, tags, notes).
   * @param documentId - The document ID
   * @param updates - The fields to update
   * @returns The updated document
   * @throws DatabaseError if database error occurs
   */
  async updateMetadata(
    documentId: string,
    updates: {
      folder?: string | null;
      tags?: string[] | null;
      notes?: string | null;
    }
  ): Promise<DealDocument> {
    const { data, error } = await this.supabase
      .from("deal_documents")
      .update(updates)
      .eq("workspace_id", this.workspaceId)
      .eq("id", documentId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new DatabaseError(`Document with id ${documentId} not found`, 404);
      }
      this.handleError(error, "Failed to update document metadata");
    }

    if (!data) {
      throw new DatabaseError(`Document with id ${documentId} not found`, 404);
    }

    return data as DealDocument;
  }

  /**
   * Records document access.
   * @param documentId - The document ID
   * @param userId - The user ID accessing the document
   * @param accessType - Type of access (view, download, preview)
   */
  async recordAccess(
    documentId: string,
    userId: string,
    accessType: 'view' | 'download' | 'preview'
  ): Promise<void> {
    // Get current access_count first
    const document = await this.getById(documentId);
    const currentCount = document.access_count || 0;

    // Update document access tracking
    const { error: updateError } = await this.supabase
      .from("deal_documents")
      .update({
        accessed_at: new Date().toISOString(),
        accessed_by: userId,
        access_count: currentCount + 1,
      })
      .eq("workspace_id", this.workspaceId)
      .eq("id", documentId);

    if (updateError) {
      console.error('Error updating document access:', updateError);
      // Don't throw - access logging is non-critical
    }

    // Log to access log table
    const { error: logError } = await this.supabase
      .from("document_access_log")
      .insert({
        workspace_id: this.workspaceId,
        document_id: documentId,
        user_id: userId,
        access_type: accessType,
      });

    if (logError) {
      console.error('Error logging document access:', logError);
      // Don't throw - access logging is non-critical
    }
  }

  /**
   * Gets document versions (all versions of a document).
   * @param documentId - The document ID (can be any version)
   * @returns Array of all versions
   */
  async getVersions(documentId: string): Promise<DealDocument[]> {
    // First get the root document (the one without a parent or the document itself)
    const document = await this.getById(documentId);
    const rootId = document.parent_document_id || document.id;

    // Get all versions (root and all children)
    const { data, error } = await this.supabase
      .from("deal_documents")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)
      .order("version", { ascending: true });

    if (error) {
      this.handleError(error, "Failed to get document versions");
    }

    return (data || []) as DealDocument[];
  }

  /**
   * Searches documents with filters.
   * @param dealId - The deal ID
   * @param filters - Search filters
   * @returns Array of matching documents
   */
  async search(
    dealId: string,
    filters: {
      searchQuery?: string;
      documentType?: string;
      folder?: string;
      tags?: string[];
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<DealDocument[]> {
    let query = this.supabase
      .from("deal_documents")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId);

    if (filters.searchQuery) {
      query = query.or(`filename.ilike.%${filters.searchQuery}%,notes.ilike.%${filters.searchQuery}%`);
    }

    if (filters.documentType) {
      query = query.eq("document_type", filters.documentType);
    }

    if (filters.folder) {
      query = query.eq("folder", filters.folder);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains("tags", filters.tags);
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte("created_at", filters.dateTo);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      this.handleError(error, "Failed to search documents");
    }

    return (data || []) as DealDocument[];
  }
}
