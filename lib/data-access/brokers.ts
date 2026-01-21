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
}
