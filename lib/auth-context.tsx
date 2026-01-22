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
    let timeoutId: NodeJS.Timeout | undefined;

    async function init() {
      try {
        // Set a timeout to prevent hanging forever
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => {
          timeoutId = setTimeout(() => {
            resolve({ data: { session: null } });
          }, 5000); // 5 second max wait
        });

        // Use Promise.race to add a timeout for the session check
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session: s } } = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);

        // Clear timeout if session promise won
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (!mounted) return;
        setSession(s);
        setUser(s?.user ?? null);
        
        // Set loading to false immediately if no user (don't wait for profile)
        if (!s?.user) {
          if (mounted) {
            if (timeoutId) clearTimeout(timeoutId);
            setLoading(false);
          }
          return;
        }
        
        // Fetch profile but don't block - set loading false immediately
        // Profile will update when it loads
        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false); // Don't wait for profile fetch
        }
        
        // Fetch profile in background
        fetchProfile(s.user.id).catch((e) => {
          if (mounted) {
            console.error('Profile fetch error:', e);
          }
        });
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Auth error');
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
        }
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
      if (timeoutId) clearTimeout(timeoutId);
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
