'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';

export function useReminderCount() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCount(0);
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single();

        if (!profile?.workspace_id) {
          setCount(0);
          setLoading(false);
          return;
        }

        const today = new Date().toISOString().split('T')[0];

        // Count reminders due today or overdue that haven't been reminded
        let query = supabase
          .from('companies')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', profile.workspace_id)
          .lte('next_action_date', today)
          .is('reminded_at', null)
          .not('next_action_date', 'is', null)
          .not('stage', 'eq', 'passed');

        // Try with archived_at filter first
        query = query.is('archived_at', null) as typeof query;

        const { count, error } = await query;

        if (error && (error.message?.includes('archived_at') || error.code === '42703')) {
          // Fallback without archived_at
          const { count: fallbackCount } = await supabase
            .from('companies')
            .select('id', { count: 'exact', head: true })
            .eq('workspace_id', profile.workspace_id)
            .lte('next_action_date', today)
            .is('reminded_at', null)
            .not('next_action_date', 'is', null)
            .not('stage', 'eq', 'passed');

          setCount(fallbackCount || 0);
        } else {
          setCount(count || 0);
        }
      } catch (error) {
        console.error('Error fetching reminder count:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    const interval = setInterval(fetchCount, 60000);

    return () => clearInterval(interval);
  }, []);

  return { count: count ?? 0, loading };
}
