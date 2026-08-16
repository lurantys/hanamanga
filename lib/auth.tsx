"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { handleAuthStateChange } from "@/lib/sync";
import { invalidateLibrary } from "@/lib/library";
import { invalidateProgressCache, invalidateContinueHero } from "@/lib/progress";
import { invalidateReadState } from "@/lib/read-state";
import { invalidateReaderSettings } from "@/lib/reader-settings";
import { invalidateScanlatorPreference } from "@/lib/scanlator-preference";

export function clearLocalData(): void {
  if (typeof window === "undefined") return;
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("hana:")) window.localStorage.removeItem(key);
  }
  invalidateLibrary();
  invalidateProgressCache();
  invalidateContinueHero();
  invalidateReadState();
  invalidateReaderSettings();
  invalidateScanlatorPreference();
}

export function getDisplayName(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return (meta.display_name as string) || (meta.full_name as string) || null;
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: (next?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<{ error: string | null }>;
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
    signUp: async (email, password, displayName) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          ...(displayName ? { data: { display_name: displayName } } : {}),
        },
      });
      return { error: error?.message ?? null };
    },
    signInWithGoogle: async (next) => {
      const target = next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/";
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
        },
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      clearLocalData();
    },
    updateDisplayName: async (name) => {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name },
      });
      return { error: error?.message ?? null };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}