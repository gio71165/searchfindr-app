'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/app/supabaseClient';
import { logger } from '@/lib/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseInvestorRealtimeOptions {
  workspaceIds: string[];
  onUpdate: () => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime updates for investor dashboard
 * Listens for changes in companies table for linked searcher workspaces
 */
export function useInvestorRealtime({
  workspaceIds,
  onUpdate,
  enabled = true,
}: UseInvestorRealtimeOptions) {
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const onUpdateRef = useRef(onUpdate);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep the callback ref up to date
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled || workspaceIds.length === 0) {
      return;
    }

    // Clean up existing channels
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Clear any pending debounce timeouts
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Create a channel for each workspace to listen for deal changes
    workspaceIds.forEach((workspaceId) => {
      const channel = supabase
        .channel(`investor-deals-${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'companies',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (payload) => {
            const dealId = (payload.new as any)?.id || (payload.old as any)?.id;
            console.log('[Investor Realtime] Deal change detected:', {
              event: payload.eventType,
              workspaceId,
              dealId,
            });
            // Debounce: clear existing timeout and set a new one
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
              onUpdateRef.current();
              debounceTimeoutRef.current = null;
            }, 1000); // Increased debounce to 1 second
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'deal_activities',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (payload) => {
            console.log('[Investor Realtime] Activity change detected:', {
              event: payload.eventType,
              workspaceId,
            });
            // Debounce: clear existing timeout and set a new one
            if (debounceTimeoutRef.current) {
              clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
              onUpdateRef.current();
              debounceTimeoutRef.current = null;
            }, 1000); // Increased debounce to 1 second
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Investor Realtime] Subscribed to workspace ${workspaceId}`);
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`[Investor Realtime] Error subscribing to workspace ${workspaceId}`);
          }
        });

      channelsRef.current.push(channel);
    });

    // Cleanup function
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      // Clear debounce timeout on cleanup
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [workspaceIds, enabled]);

  return {
    isSubscribed: channelsRef.current.length > 0,
  };
}
