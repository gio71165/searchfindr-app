import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError } from "./base";

export interface Broker {
  id: string;
  workspace_id: string;
  name: string;
  firm: string | null;
  email: string | null;
  phone: string | null;
  quality_rating: 'excellent' | 'good' | 'average' | 'poor' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New CRM fields
  deals_received?: number;
  deals_proceeded?: number;
  deals_won?: number;
  avg_deal_quality?: number | null;
  last_contact_date?: string | null;
  preferred_contact_method?: string | null;
  tags?: string[];
  rating?: number | null;
}

export interface CreateBrokerData {
  name: string;
  firm?: string | null;
  email?: string | null;
  phone?: string | null;
  quality_rating?: 'excellent' | 'good' | 'average' | 'poor' | null;
  notes?: string | null;
}

/**
 * Repository for managing brokers in the database.
 * All queries are automatically scoped to the workspace.
 */
export class BrokersRepository extends BaseRepository {
  /**
   * Gets all brokers in the workspace.
   * @returns Array of brokers
   * @throws DatabaseError if database error occurs
   */
  async getAll(): Promise<Broker[]> {
    const { data, error } = await this.supabase
      .from("brokers")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .order("name", { ascending: true });

    if (error) {
      this.handleError(error, "Failed to get brokers");
    }

    return (data || []) as Broker[];
  }

  /**
   * Gets a broker by ID.
   * @param brokerId - The broker ID
   * @returns The broker
   * @throws DatabaseError if database error occurs
   */
  async getById(brokerId: string): Promise<Broker> {
    const { data, error } = await this.supabase
      .from("brokers")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("id", brokerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new DatabaseError(`Broker with id ${brokerId} not found`, 404);
      }
      this.handleError(error, "Failed to get broker");
    }

    if (!data) {
      throw new DatabaseError(`Broker with id ${brokerId} not found`, 404);
    }

    return data as Broker;
  }

  /**
   * Creates a new broker.
   * @param brokerData - The broker data
   * @returns The created broker
   * @throws DatabaseError if database error occurs
   */
  async create(brokerData: CreateBrokerData): Promise<Broker> {
    const insertData = {
      ...brokerData,
      workspace_id: this.workspaceId,
    };

    const { data, error } = await this.supabase
      .from("brokers")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.handleError(error, "Failed to create broker");
    }

    if (!data) {
      throw new DatabaseError("Failed to create broker: no data returned");
    }

    return data as Broker;
  }

  /**
   * Updates a broker.
   * @param brokerId - The broker ID
   * @param updates - The fields to update
   * @returns The updated broker
   * @throws DatabaseError if database error occurs
   */
  async update(brokerId: string, updates: Partial<CreateBrokerData>): Promise<Broker> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from("brokers")
      .update(updateData)
      .eq("workspace_id", this.workspaceId)
      .eq("id", brokerId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new DatabaseError(`Broker with id ${brokerId} not found`, 404);
      }
      this.handleError(error, "Failed to update broker");
    }

    if (!data) {
      throw new DatabaseError(`Broker with id ${brokerId} not found`, 404);
    }

    return data as Broker;
  }

  /**
   * Deletes a broker.
   * @param brokerId - The broker ID
   * @throws DatabaseError if database error occurs
   */
  async delete(brokerId: string): Promise<void> {
    const { error } = await this.supabase
      .from("brokers")
      .delete()
      .eq("workspace_id", this.workspaceId)
      .eq("id", brokerId);

    if (error) {
      this.handleError(error, "Failed to delete broker");
    }
  }

  /**
   * Gets deals associated with a broker.
   * @param brokerId - The broker ID
   * @returns Count of deals
   * @throws DatabaseError if database error occurs
   */
  async getDealCount(brokerId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("companies")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", this.workspaceId)
      .eq("broker_id", brokerId);

    if (error) {
      this.handleError(error, "Failed to get deal count");
    }

    return count || 0;
  }

  /**
   * Updates broker statistics based on associated deals.
   * @param brokerId - The broker ID
   * @throws DatabaseError if database error occurs
   */
  async updateBrokerStats(brokerId: string): Promise<void> {
    const { data: deals, error: dealsError } = await this.supabase
      .from("companies")
      .select("verdict, final_tier")
      .eq("workspace_id", this.workspaceId)
      .eq("broker_id", brokerId);

    if (dealsError) {
      this.handleError(dealsError, "Failed to get deals for stats");
    }

    if (!deals || deals.length === 0) {
      // Reset stats if no deals
      await this.update(brokerId, {
        deals_received: 0,
        deals_proceeded: 0,
        deals_won: 0,
        avg_deal_quality: null,
      } as any);
      return;
    }

    const dealsReceived = deals.length;
    const dealsProceeded = deals.filter(d => d.verdict === 'proceed').length;
    const dealsWon = deals.filter(d => d.verdict === 'closed_won' || d.verdict === 'won').length;

    // Calculate average quality (tier: A=5, B=3, C=1)
    const tierScores: Record<string, number> = { 'A': 5, 'B': 3, 'C': 1 };
    const avgQuality = deals.length > 0
      ? deals.reduce((sum, d) => {
          const tier = d.final_tier as string | null;
          return sum + (tier && tier in tierScores ? tierScores[tier] : 0);
        }, 0) / deals.length
      : 0;

    await this.update(brokerId, {
      deals_received: dealsReceived,
      deals_proceeded: dealsProceeded,
      deals_won: dealsWon,
      avg_deal_quality: parseFloat(avgQuality.toFixed(2)),
    } as any);
  }

  /**
   * Logs a broker interaction.
   * @param brokerId - The broker ID
   * @param interactionType - Type of interaction
   * @param notes - Notes about the interaction
   * @param interactionDate - Optional date (defaults to now)
   * @throws DatabaseError if database error occurs
   */
  async logInteraction(
    brokerId: string,
    interactionType: 'email' | 'phone' | 'meeting' | 'deal_received' | 'feedback' | 'other',
    notes?: string | null,
    interactionDate?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("broker_interactions")
      .insert({
        workspace_id: this.workspaceId,
        broker_id: brokerId,
        interaction_type: interactionType,
        interaction_date: interactionDate || new Date().toISOString(),
        notes: notes || null,
      });

    if (error) {
      this.handleError(error, "Failed to log interaction");
    }

    // Update last_contact_date on broker
    await this.update(brokerId, {
      last_contact_date: new Date().toISOString(),
    } as any);
  }

  /**
   * Gets all interactions for a broker.
   * @param brokerId - The broker ID
   * @returns Array of interactions
   * @throws DatabaseError if database error occurs
   */
  async getInteractions(brokerId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("broker_interactions")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("broker_id", brokerId)
      .order("interaction_date", { ascending: false });

    if (error) {
      this.handleError(error, "Failed to get interactions");
    }

    return data || [];
  }

  /**
   * Gets all deals for a broker.
   * @param brokerId - The broker ID
   * @returns Array of deals
   * @throws DatabaseError if database error occurs
   */
  async getDeals(brokerId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", this.workspaceId)
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });

    if (error) {
      this.handleError(error, "Failed to get deals");
    }

    return data || [];
  }
}
