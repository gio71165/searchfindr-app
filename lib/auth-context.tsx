'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/app/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  session: Session | null;
  workspaceId: string | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

const defaultState: AuthState = {
  user: null,
  session: null,
  workspaceId: null,
  isAdmin: false,
  loading: true,
  error: null,
};

const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error: e } = await supabase
      .from('profiles')
      .select('workspace_id, is_admin')
      .eq('id', uid)
      .single();
    if (e) {
      setError(e.message);
      return;
    }
    setWorkspaceId(data?.workspace_id ?? null);
    setIsAdmin(data?.is_admin === true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) await fetchProfile(s.user.id);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : 'Auth error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setWorkspaceId(null);
          setIsAdmin(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      session,
      workspaceId,
      isAdmin,
      loading,
      error,
    }),
    [user, session, workspaceId, isAdmin, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
