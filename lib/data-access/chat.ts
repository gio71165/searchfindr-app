import { SupabaseClient } from "@supabase/supabase-js";
import { BaseRepository, DatabaseError } from "./base";

/**
 * Chat message role type
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * Chat message entity type
 */
export type ChatMessage = {
  id?: string;
  workspace_id: string;
  deal_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  meta?: any;
  created_at?: string;
};

/**
 * Input type for adding a single message
 */
export type AddMessageInput = {
  dealId: string;
  userId: string;
  role: ChatRole;
  content: string;
  meta?: any;
};

/**
 * Input type for bulk adding messages
 */
export type AddMessagesInput = Array<AddMessageInput>;

/**
 * Return type for getMessages
 */
export type ChatMessageResult = {
  role: ChatRole;
  content: string;
  created_at: string;
};

/**
 * Repository for managing deal chat messages in the database.
 * All queries are automatically scoped to the workspace.
 */
export class ChatRepository extends BaseRepository {
  /**
   * Gets chat message history for a deal and user, workspace-scoped.
   * @param dealId - The deal ID
   * @param userId - The user ID
   * @param limit - Maximum number of messages to return (default: 40)
   * @returns Array of chat messages
   * @throws DatabaseError if database error occurs
   */
  async getMessages(dealId: string, userId: string, limit: number = 40): Promise<ChatMessageResult[]> {
    const { data, error } = await this.supabase
      .from("deal_chat_messages")
      .select("role, content, created_at")
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      this.handleError(error, "Failed to get chat messages");
    }

    return (data || []) as ChatMessageResult[];
  }

  /**
   * Adds a single chat message.
   * @param dealId - The deal ID
   * @param userId - The user ID
   * @param role - The message role ('user' | 'assistant' | 'system')
   * @param content - The message content
   * @param meta - Optional metadata object
   * @returns The created message
   * @throws DatabaseError if database error occurs
   */
  async addMessage(
    dealId: string,
    userId: string,
    role: ChatRole,
    content: string,
    meta?: any
  ): Promise<ChatMessage> {
    const messageData: ChatMessage = {
      workspace_id: this.workspaceId,
      deal_id: dealId,
      user_id: userId,
      role,
      content,
      meta: meta || null,
    };

    const { data, error } = await this.supabase
      .from("deal_chat_messages")
      .insert(messageData)
      .select()
      .single();

    if (error) {
      this.handleError(error, "Failed to add chat message");
    }

    if (!data) {
      throw new DatabaseError("Failed to add chat message: no data returned");
    }

    return data as ChatMessage;
  }

  /**
   * Bulk inserts multiple chat messages (e.g., user + assistant pair).
   * @param messages - Array of message inputs to insert
   * @returns Array of created messages
   * @throws DatabaseError if database error occurs
   */
  async addMessages(messages: AddMessagesInput): Promise<ChatMessage[]> {
    if (messages.length === 0) {
      return [];
    }

    const insertData: ChatMessage[] = messages.map((msg) => ({
      workspace_id: this.workspaceId,
      deal_id: msg.dealId,
      user_id: msg.userId,
      role: msg.role,
      content: msg.content,
      meta: msg.meta || null,
    }));

    const { data, error } = await this.supabase
      .from("deal_chat_messages")
      .insert(insertData)
      .select();

    if (error) {
      this.handleError(error, "Failed to add chat messages");
    }

    return (data || []) as ChatMessage[];
  }

  /**
   * Clears all chat messages for a specific deal and user, workspace-scoped.
   * @param dealId - The deal ID
   * @param userId - The user ID
   * @throws DatabaseError if database error occurs
   */
  async clearMessages(dealId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("deal_chat_messages")
      .delete()
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId)
      .eq("user_id", userId);

    if (error) {
      this.handleError(error, "Failed to clear chat messages");
    }
  }

  /**
   * Gets the count of recent user messages within a time window (for rate limiting).
   * @param userId - The user ID
   * @param windowSeconds - Time window in seconds (default: 60)
   * @returns Count of recent user messages
   * @throws DatabaseError if database error occurs
   */
  async getRecentMessageCount(userId: string, windowSeconds: number = 60): Promise<number> {
    const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString();

    const { count, error } = await this.supabase
      .from("deal_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", this.workspaceId)
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", sinceIso);

    if (error) {
      this.handleError(error, "Failed to get recent message count");
    }

    return count || 0;
  }

  /**
   * Gets the total count of messages for a deal and user (for rate limiting per deal).
   * @param dealId - The deal ID
   * @param userId - The user ID
   * @returns Count of messages for the deal/user
   * @throws DatabaseError if database error occurs
   */
  async getMessageCount(dealId: string, userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from("deal_chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", this.workspaceId)
      .eq("deal_id", dealId)
      .eq("user_id", userId);

    if (error) {
      this.handleError(error, "Failed to get message count");
    }

    return count || 0;
  }
}
