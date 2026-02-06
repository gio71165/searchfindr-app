'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';

/**
 * Fetches broker display name by broker id and workspace.
 * Used across CIM, OnMarket, OffMarket, and Financials deal views.
 */
export function useBrokerName(
  brokerId: string | null | undefined,
  workspaceId: string | null | undefined
): string | null {
  const [brokerName, setBrokerName] = useState<string | null>(null);

  useEffect(() => {
    const wid = workspaceId ?? undefined;
    if (!brokerId || !wid) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('brokers')
          .select('name')
          .eq('id', brokerId)
          .eq('workspace_id', wid)
          .single();
        if (!cancelled) setBrokerName(data?.name ?? null);
      } catch {
        if (!cancelled) setBrokerName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [brokerId, workspaceId ?? undefined]);

  return brokerName;
}
