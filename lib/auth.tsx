"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { handleAuthStateChange } from "@/lib/sync";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncedForRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;

    void supabase.auth.getSession().then(
      ({ data }: { data: { session: Session | null } }) => {
        if (disposed) return;
        setSession(data.session);
        setLoading(false);
      },
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, currentSession: Session | null) => {
        if (disposed) return;
        setSession(currentSession);
        setLoading(false);
      },
    );

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const userId = session?.user?.id ?? null;
    if (userId === syncedForRef.current) return;
    syncedForRef.current = userId;
    void handleAuthStateChange(userId).catch(() => {});
  }, [session]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}