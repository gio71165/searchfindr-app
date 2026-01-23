import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository, DatabaseError } from './base';
import type { SearchCriteria, CreateSearchCriteriaData } from '@/lib/types/search-criteria';

/**
 * Repository for managing search criteria in the database.
 * All queries are automatically scoped to the workspace and user.
 */
export class SearchCriteriaRepository extends BaseRepository {
  protected readonly userId: string;

  constructor(supabase: SupabaseClient, workspaceId: string, userId: string) {
    super(supabase, workspaceId);
    this.userId = userId;
  }

  /**
   * Gets all search criteria for the current user.
   * @returns Array of search criteria
   * @throws DatabaseError if database error occurs
   */
  async getAll(): Promise<SearchCriteria[]> {
    const { data, error } = await this.supabase
      .from('search_criteria')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Failed to get search criteria');
    }

    return (data || []) as SearchCriteria[];
  }

  /**
   * Gets active search criteria for the current user.
   * @returns Array of active search criteria
   * @throws DatabaseError if database error occurs
   */
  async getActive(): Promise<SearchCriteria[]> {
    const { data, error } = await this.supabase
      .from('search_criteria')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      this.handleError(error, 'Failed to get active search criteria');
    }

    return (data || []) as SearchCriteria[];
  }

  /**
   * Gets a search criteria by ID.
   * @param criteriaId - The criteria ID
   * @returns The search criteria
   * @throws DatabaseError if database error occurs
   */
  async getById(criteriaId: string): Promise<SearchCriteria> {
    const { data, error } = await this.supabase
      .from('search_criteria')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.userId)
      .eq('id', criteriaId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new DatabaseError(`Search criteria with id ${criteriaId} not found`, 404);
      }
      this.handleError(error, 'Failed to get search criteria');
    }

    if (!data) {
      throw new DatabaseError(`Search criteria with id ${criteriaId} not found`, 404);
    }

    return data as SearchCriteria;
  }

  /**
   * Creates a new search criteria.
   * @param criteriaData - The criteria data
   * @returns The created search criteria
   * @throws DatabaseError if database error occurs
   */
  async create(criteriaData: CreateSearchCriteriaData): Promise<SearchCriteria> {
    const insertData = {
      ...criteriaData,
      workspace_id: this.workspaceId,
      user_id: this.userId,
    };

    const { data, error } = await this.supabase
      .from('search_criteria')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      this.handleError(error, 'Failed to create search criteria');
    }

    if (!data) {
      throw new DatabaseError('Failed to create search criteria: no data returned');
    }

    return data as SearchCriteria;
  }

  /**
   * Updates a search criteria.
   * @param criteriaId - The criteria ID
   * @param updates - The fields to update
   * @returns The updated search criteria
   * @throws DatabaseError if database error occurs
   */
  async update(criteriaId: string, updates: Partial<CreateSearchCriteriaData>): Promise<SearchCriteria> {
    const { data, error } = await this.supabase
      .from('search_criteria')
      .update(updates)
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.userId)
      .eq('id', criteriaId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new DatabaseError(`Search criteria with id ${criteriaId} not found`, 404);
      }
      this.handleError(error, 'Failed to update search criteria');
    }

    if (!data) {
      throw new DatabaseError(`Search criteria with id ${criteriaId} not found`, 404);
    }

    return data as SearchCriteria;
  }

  /**
   * Deletes a search criteria.
   * @param criteriaId - The criteria ID
   * @throws DatabaseError if database error occurs
   */
  async delete(criteriaId: string): Promise<void> {
    const { error } = await this.supabase
      .from('search_criteria')
      .delete()
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.userId)
      .eq('id', criteriaId);

    if (error) {
      this.handleError(error, 'Failed to delete search criteria');
    }
  }
}
