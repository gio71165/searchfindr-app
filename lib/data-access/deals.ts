import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError, NotFoundError } from "./base";

/**
 * Deal/Company entity type
 */
export type Deal = {
  id: string;
  workspace_id: string;
  company_name: string | null;
  source_type: string | null;
  listing_url: string | null;
  external_id: string | null;
  external_source: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  score: number | null;
  final_tier: string | null;
  is_saved: boolean | null;
  ai_summary: string | null;
  ai_red_flags: string | null;
  ai_financials_json: any | null;
  ai_scoring_json: any | null;
  criteria_match_json: any | null;
  ai_confidence_json: any | null;
  raw_listing_text: string | null;
  cim_storage_path: string | null;
  financials_storage_path: string | null;
  financials_filename: string | null;
  financials_mime: string | null;
  created_at: string | null;
  updated_at: string | null;
  passed_at: string | null;
  // Additional fields that may exist
  [key: string]: any;
};

/**
 * Partial type for updating AI analysis fields
 */
export type DealAnalysisUpdate = {
  ai_summary?: string | null;
  ai_red_flags?: string | null;
  ai_financials_json?: any | null;
  ai_scoring_json?: any | null;
  criteria_match_json?: any | null;
  ai_confidence_json?: any | null;
  final_tier?: string | null;
  score?: number | null;
};

/**
 * Type for creating a new deal
 */
export type CreateDealData = {
  company_name?: string | null;
  source_type?: string | null;
  listing_url?: string | null;
  external_id?: string | null;
  external_source?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  industry?: string | null;
  raw_listing_text?: string | null;
  cim_storage_path?: string | null;
  financials_storage_path?: string | null;
  financials_filename?: string | null;
  financials_mime?: string | null;
  [key: string]: any;
};

/**
 * Filters for listing deals
 */
export type DealListFilters = {
  limit?: number;
  offset?: number;
  source_type?: string;
  is_saved?: boolean;
};

/**
 * Repository for managing deals/companies in the database.
 * All queries are automatically scoped to the workspace.
 */
export class DealsRepository extends BaseRepository {
  /**
   * Gets a single deal by ID, workspace-scoped.
   * @param dealId - The deal ID
   * @returns The deal object
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async getById(dealId: string): Promise<Deal> {
    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").select("*").eq("id", dealId)
    ).single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to get deal");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    return data as Deal;
  }

  /**
   * Lists deals for the workspace with optional filters and pagination.
   * @param filters - Optional filters including limit, offset, source_type, is_saved
   * @returns Array of deals
   * @throws DatabaseError if database error occurs
   */
  async list(filters?: DealListFilters): Promise<Deal[]> {
    const baseQuery = this.supabase.from("companies").select("*");
    let query = this.ensureWorkspaceScope(baseQuery);

    if (filters?.source_type) {
      query = query.eq("source_type", filters.source_type) as typeof query;
    }

    if (filters?.is_saved !== undefined) {
      query = query.eq("is_saved", filters.is_saved) as typeof query;
    }

    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters?.offset !== undefined) {
      const end = filters.offset + (filters.limit || 50) - 1;
      query = query.range(filters.offset, end) as typeof query;
    }

    query = query.order("created_at", { ascending: false }) as typeof query;

    const { data, error } = await query;

    if (error) {
      this.handleError(error, "Failed to list deals");
    }

    return (data || []) as Deal[];
  }

  /**
   * Updates AI analysis fields for a deal.
   * @param dealId - The deal ID
   * @param analysis - Partial analysis data to update
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async updateAnalysis(dealId: string, analysis: DealAnalysisUpdate & { website?: string | null }): Promise<Deal> {
    const updateData: Record<string, any> = {};

    if (analysis.ai_summary !== undefined) updateData.ai_summary = analysis.ai_summary;
    if (analysis.ai_red_flags !== undefined) updateData.ai_red_flags = analysis.ai_red_flags;
    if (analysis.ai_financials_json !== undefined) updateData.ai_financials_json = analysis.ai_financials_json;
    if (analysis.ai_scoring_json !== undefined) updateData.ai_scoring_json = analysis.ai_scoring_json;
    if (analysis.criteria_match_json !== undefined) updateData.criteria_match_json = analysis.criteria_match_json;
    if (analysis.ai_confidence_json !== undefined) updateData.ai_confidence_json = analysis.ai_confidence_json;
    if (analysis.final_tier !== undefined) updateData.final_tier = analysis.final_tier;
    if (analysis.score !== undefined) updateData.score = analysis.score;
    if (analysis.website !== undefined) updateData.website = analysis.website;

    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update(updateData).eq("id", dealId)
    ).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to update deal analysis");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    return data as Deal;
  }

  /**
   * Creates a new deal in the workspace.
   * @param dealData - The deal data to create
   * @returns The created deal
   * @throws DatabaseError if database error occurs
   */
  async create(dealData: CreateDealData): Promise<Deal> {
    const insertData = {
      ...dealData,
      workspace_id: this.workspaceId,
    };

    const { data, error } = await this.supabase
      .from("companies")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.handleError(error, "Failed to create deal");
    }

    if (!data) {
      throw new DatabaseError("Failed to create deal: no data returned");
    }

    return data as Deal;
  }

  /**
   * Upserts a single deal (insert or update on conflict).
   * Automatically adds workspace_id from this.workspaceId.
   * @param dealData - The deal data to upsert (any fields)
   * @returns The upserted deal
   * @throws DatabaseError if database error occurs
   */
  async upsert(dealData: any): Promise<Deal> {
    const insertData = {
      ...dealData,
      workspace_id: this.workspaceId,
    };

    const { data, error } = await this.supabase
      .from("companies")
      .upsert(insertData, {
        onConflict: "workspace_id,external_source,external_id",
      })
      .select()
      .single();

    if (error) {
      this.handleError(error, "Failed to upsert deal");
    }

    if (!data) {
      throw new DatabaseError("Failed to upsert deal: no data returned");
    }

    return data as Deal;
  }

  /**
   * Upserts multiple deals (insert or update on conflict).
   * Useful for bulk operations where deals might already exist.
   * @param dealsData - Array of deal data to upsert
   * @param conflictColumns - Columns to use for conflict resolution (default: "workspace_id,external_source,external_id")
   * @param selectColumns - Columns to return (optional)
   * @returns Array of upserted deals
   * @throws DatabaseError if database error occurs
   */
  async upsertMany(
    dealsData: CreateDealData[],
    conflictColumns: string = "workspace_id,external_source,external_id",
    selectColumns?: string
  ): Promise<Deal[]> {
    if (dealsData.length === 0) {
      return [];
    }

    const insertData = dealsData.map((deal) => ({
      ...deal,
      workspace_id: this.workspaceId,
    }));

    const baseQuery = this.supabase.from("companies").upsert(insertData, {
      onConflict: conflictColumns,
    });

    const { data, error } = selectColumns
      ? await baseQuery.select(selectColumns)
      : await baseQuery.select();

    if (error) {
      this.handleError(error, "Failed to upsert deals");
    }

    return (data || []) as Deal[];
  }

  /**
   * Updates the diligence checklist state for a deal.
   * Stores checklist state in metadata JSON field.
   * @param dealId - The deal ID
   * @param checklistState - The checklist state object: { "item_1": { checked: true, notes: "..." }, ... }
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async updateDiligenceChecklist(dealId: string, checklistState: Record<string, { checked: boolean; notes?: string }>): Promise<Deal> {
    // Get current deal to merge with existing metadata
    const deal = await this.getById(dealId);
    
    const currentMetadata = (deal as any).metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      diligence_checklist: checklistState,
    };

    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update({ metadata: updatedMetadata }).eq("id", dealId)
    ).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to update diligence checklist");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    return data as Deal;
  }

  /**
   * Gets the diligence checklist state for a deal.
   * @param dealId - The deal ID
   * @returns The checklist state object or null if not set
   * @throws NotFoundError if deal not found
   */
  async getDiligenceChecklist(dealId: string): Promise<Record<string, { checked: boolean; notes?: string }> | null> {
    const deal = await this.getById(dealId);
    const metadata = (deal as any).metadata;
    return metadata?.diligence_checklist || null;
  }

  /**
   * Marks a deal as passed (sets passed_at timestamp).
   * @param dealId - The deal ID
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async passDeal(dealId: string): Promise<Deal> {
    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update({ passed_at: new Date().toISOString() }).eq("id", dealId)
    ).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to pass deal");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    return data as Deal;
  }

  /**
   * Filters out deals that have been passed (passed_at is not null).
   * @param deals - Array of deals to filter
   * @returns Array of deals excluding passed ones
   */
  static filterOutPassedDeals<T extends { passed_at?: string | null }>(deals: T[]): T[] {
    return deals.filter((deal) => !deal.passed_at);
  }
}
