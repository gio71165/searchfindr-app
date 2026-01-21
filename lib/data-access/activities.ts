import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError } from "./base";
import type { DealActivity } from "@/lib/types/deal";

/**
 * Repository for managing deal activities in the database.
 * All queries are automatically scoped to the workspace.
 */
export class ActivitiesRepository extends BaseRepository {
  /**
   * Gets activities for a deal, workspace-scoped.
   * @param dealId - The deal ID
   * @param limit - Maximum number of activities to return (default: 50)
   * @returns Array of deal activities
   * @throws DatabaseError if database error occurs
   */
  async getByDealId(dealId: string, limit: number = 50): Promise<DealActivity[]> {
    const { data, error } = await this.supabase
      .from("deal_activities")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      this.handleError(error, "Failed to get deal activities");
    }

    return (data || []) as DealActivity[];
  }

  /**
   * Creates a new activity entry.
   * @param activityData - The activity data
   * @returns The created activity
   * @throws DatabaseError if database error occurs
   */
  async create(activityData: {
    deal_id: string;
    user_id: string;
    activity_type: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<DealActivity> {
    const insertData = {
      workspace_id: this.workspaceId,
      deal_id: activityData.deal_id,
      user_id: activityData.user_id,
      activity_type: activityData.activity_type,
      description: activityData.description,
      metadata: activityData.metadata || null,
    };

    const { data, error } = await this.supabase
      .from("deal_activities")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.handleError(error, "Failed to create activity");
    }

    if (!data) {
      throw new DatabaseError("Failed to create activity: no data returned");
    }

    return data as DealActivity;
  }
}
