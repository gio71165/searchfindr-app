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
  isCoalitionLeader: boolean;
  isCoalitionMember: boolean;
  role: string | null;
  /** True when subscription_status is 'active' or 'trialing'. Used to gate app access. */
  hasValidSubscription: boolean;
  loading: boolean;
  error: string | null;
  /** Re-fetch profile (e.g. after checkout so webhook may have run). */
  refetchProfile: () => Promise<void>;
};

const defaultState: AuthState = {
  user: null,
  session: null,
  workspaceId: null,
  isAdmin: false,
  isCoalitionLeader: false,
  isCoalitionMember: false,
  role: null,
  hasValidSubscription: false,
  loading: true,
  error: null,
  refetchProfile: async () => {},
};

const AuthContext = createContext<AuthState>(defaultState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoalitionLeader, setIsCoalitionLeader] = useState(false);
  const [isCoalitionMember, setIsCoalitionMember] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (uid: string) => {
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
    );
    
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('workspace_id, is_admin, is_coalition_leader, is_coalition_member, onboarding_completed, role, subscription_status')
          .eq('id', uid)
          .single(),
        timeoutPromise
      ]) as { data: any; error: any };
      
      if (result.error) {
        setError(result.error.message);
        return;
      }
      const data = result.data;
      setWorkspaceId(data?.workspace_id ?? null);
      setIsAdmin(data?.is_admin === true);
      setIsCoalitionLeader(data?.is_coalition_leader === true || data?.is_admin === true);
      setIsCoalitionMember(data?.is_coalition_member === true);
      setRole(data?.role ?? null);
      const status = data?.subscription_status ?? 'inactive';
      setHasValidSubscription(status === 'active' || status === 'trialing');
    } catch (e) {
      console.error('Profile fetch failed:', e);
      // Don't block app, just log error
    }
  }, []);

  const refetchProfile = useCallback(async () => {
    if (user?.id) await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

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
        let sessionResult: { data: { session: Session | null } };
        try {
          const sessionPromise = supabase.auth.getSession();
          sessionResult = await Promise.race([
            sessionPromise,
            timeoutPromise,
          ]) as { data: { session: Session | null } };
        } catch (networkErr) {
          const msg = networkErr instanceof TypeError && networkErr.message === 'Failed to fetch'
            ? 'Network error. Check your connection or try again.'
            : networkErr instanceof Error ? networkErr.message : 'Auth error';
          if (mounted) {
            setError(msg);
            setLoading(false);
          }
          return;
        }
        const { data: { session: s } } = sessionResult;

        // Clear timeout if session promise won
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (!mounted) return;
        
        // Clear state if no valid session
        if (!s || !s.user) {
          setSession(null);
          setUser(null);
          setWorkspaceId(null);
          setIsAdmin(false);
          setIsCoalitionLeader(false);
          setIsCoalitionMember(false);
          setRole(null);
          setHasValidSubscription(false);
          if (mounted) {
            if (timeoutId) clearTimeout(timeoutId);
            setLoading(false);
          }
          return;
        }
        
        // Only set user/session if we have a valid session
        setSession(s);
        setUser(s.user);
        
        // Wait for profile fetch before setting loading=false
        try {
          await fetchProfile(s.user.id);
        } catch (e) {
          console.error('Profile fetch error:', e);
        }

        if (mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          const msg = e instanceof TypeError && e.message === 'Failed to fetch'
            ? 'Network error. Check your connection or try again.'
            : e instanceof Error ? e.message : 'Auth error';
          setError(msg);
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
          // Fetch profile in background, don't block UI
          fetchProfile(s.user.id).catch(e => {
            console.error('Profile fetch error in auth state change:', e);
          });
        } else {
          setWorkspaceId(null);
          setIsAdmin(false);
          setIsCoalitionLeader(false);
          setIsCoalitionMember(false);
          setRole(null);
          setHasValidSubscription(false);
        }
        
        // Don't set loading here - let the profile fetch complete naturally
        // The UI will update when workspaceId is set
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
      isCoalitionLeader,
      isCoalitionMember,
      role,
      hasValidSubscription,
      loading,
      error,
      refetchProfile,
    }),
    [user, session, workspaceId, isAdmin, isCoalitionLeader, isCoalitionMember, role, hasValidSubscription, loading, error, refetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
