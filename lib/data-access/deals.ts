import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError, NotFoundError } from "./base";
import type { Deal as DealType, DealSourceType, DealTier, FinancialMetrics, DealScoring, CriteriaMatch, ConfidenceJson } from "@/lib/types/deal";

/**
 * Deal/Company entity type (re-export from types for backwards compatibility)
 */
export type Deal = DealType;

/**
 * Partial type for updating AI analysis fields
 */
export type DealAnalysisUpdate = {
  ai_summary?: string | null;
  ai_red_flags?: string | null;
  ai_financials_json?: FinancialMetrics | null;
  ai_scoring_json?: DealScoring | null;
  criteria_match_json?: CriteriaMatch | null;
  ai_confidence_json?: ConfidenceJson | null;
  final_tier?: DealTier | null;
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
  include_archived?: boolean; // If true, include archived deals. Default: false (exclude archived)
};

/**
 * Repository for managing deals/companies in the database.
 * All queries are automatically scoped to the workspace.
 */
export class DealsRepository extends BaseRepository {
  /**
   * Gets a single deal by ID, workspace-scoped.
   * By default, excludes archived deals. Use getByIdIncludingArchived to get archived deals.
   * @param dealId - The deal ID
   * @returns The deal object
   * @throws NotFoundError if deal not found or is archived
   * @throws DatabaseError if database error occurs
   */
  async getById(dealId: string): Promise<Deal> {
    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").select("*").eq("id", dealId).is("archived_at", null)
    ).single();

    if (error) {
      // Log the full Supabase error for debugging
      console.error("DealsRepository.getById Supabase error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        dealId,
        workspaceId: this.workspaceId,
      });
      
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
   * Gets a single deal by ID including archived deals, workspace-scoped.
   * @param dealId - The deal ID
   * @returns The deal object (may be archived)
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async getByIdIncludingArchived(dealId: string): Promise<Deal> {
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
   * By default, excludes archived deals unless include_archived is true.
   * @param filters - Optional filters including limit, offset, source_type, is_saved, include_archived
   * @returns Array of deals
   * @throws DatabaseError if database error occurs
   */
  async list(filters?: DealListFilters): Promise<Deal[]> {
    const baseQuery = this.supabase.from("companies").select("*");
    let query = this.ensureWorkspaceScope(baseQuery);

    // Filter out archived deals by default
    if (!filters?.include_archived) {
      query = query.is("archived_at", null) as typeof query;
    }

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
    const updateData: Partial<{
      ai_summary: string | null;
      ai_red_flags: string | null;
      ai_financials_json: FinancialMetrics | null;
      ai_scoring_json: DealScoring | null;
      criteria_match_json: CriteriaMatch | null;
      ai_confidence_json: ConfidenceJson | null;
      final_tier: DealTier | null;
      score: number | null;
      website: string | null;
    }> = {};

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
    
    const currentMetadata = (deal.metadata && typeof deal.metadata === 'object' ? deal.metadata : {}) as Record<string, unknown>;
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
    const metadata = deal.metadata && typeof deal.metadata === 'object' ? deal.metadata as Record<string, unknown> : null;
    if (metadata && 'diligence_checklist' in metadata) {
      const checklist = metadata.diligence_checklist;
      if (checklist && typeof checklist === 'object' && !Array.isArray(checklist)) {
        return checklist as Record<string, { checked: boolean; notes?: string }>;
      }
    }
    return null;
  }

  /**
   * Marks a deal as passed (sets passed_at timestamp, stage, and reason).
   * @param dealId - The deal ID
   * @param passReason - The reason for passing (required)
   * @param passNotes - Additional notes (optional)
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async passDeal(dealId: string, passReason: string, passNotes?: string | null): Promise<Deal> {
    const now = new Date().toISOString();
    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update({ 
        passed_at: now,
        stage: 'passed',
        verdict: 'pass',
        pass_reason: passReason,
        pass_notes: passNotes || null,
        last_action_at: now,
      }).eq("id", dealId)
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

    // Log activity
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      await this.supabase.from("deal_activities").insert({
        workspace_id: this.workspaceId,
        deal_id: dealId,
        user_id: userData?.user?.id || null,
        activity_type: 'passed',
        description: `Passed: ${passReason}`,
        metadata: {
          reason: passReason,
          notes: passNotes || null,
        },
      });
    } catch (activityError) {
      // Don't fail the whole operation if activity logging fails
      console.error("Failed to log activity:", activityError);
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

  /**
   * Archives a deal (soft delete) by setting archived_at timestamp.
   * @param dealId - The deal ID
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async archive(dealId: string): Promise<Deal> {
    const now = new Date().toISOString();
    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update({ archived_at: now }).eq("id", dealId)
    ).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to archive deal");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    // Log activity
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      await this.supabase.from("deal_activities").insert({
        workspace_id: this.workspaceId,
        deal_id: dealId,
        user_id: userData?.user?.id || null,
        activity_type: 'archived',
        description: 'Deal archived',
        metadata: {},
      });
    } catch (activityError) {
      // Don't fail the whole operation if activity logging fails
      console.error("Failed to log activity:", activityError);
    }

    return data as Deal;
  }

  /**
   * Generic update method for updating any deal fields.
   * @param dealId - The deal ID
   * @param updates - Partial deal data to update
   * @returns The updated deal
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs
   */
  async update(dealId: string, updates: Partial<Record<string, any>>): Promise<Deal> {
    // Verify deal exists first
    await this.getById(dealId);

    const { data, error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").update(updates).eq("id", dealId)
    ).select().single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to update deal");
    }

    if (!data) {
      throw new NotFoundError(`Deal with id ${dealId} not found`);
    }

    return data as Deal;
  }

  /**
   * Permanently deletes a deal and its related data.
   * Only allows deletion if the deal is already archived OR if force is true.
   * Related data (deal_activities, deal_chat_messages) will be deleted via CASCADE.
   * @param dealId - The deal ID
   * @param force - If true, allows deletion even if not archived (requires strong confirmation on client)
   * @returns void
   * @throws NotFoundError if deal not found
   * @throws DatabaseError if database error occurs or deal is not archived and force is false
   */
  async delete(dealId: string, force: boolean = false): Promise<void> {
    // First, get the deal to check if it's archived
    const deal = await this.getByIdIncludingArchived(dealId);

    // Safety check: only allow deletion if archived or force is true
    if (!force && !deal.archived_at) {
      throw new DatabaseError("Cannot delete deal that is not archived. Archive it first or use force=true.", 400);
    }

    // Delete the deal (CASCADE will handle related tables)
    const { error } = await this.ensureWorkspaceScope(
      this.supabase.from("companies").delete().eq("id", dealId)
    );

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError(`Deal with id ${dealId} not found`);
      }
      this.handleError(error, "Failed to delete deal");
    }
  }
}
