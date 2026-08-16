"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "hana:avatar";
const CACHE_MS = 60 * 60 * 1000;

type CachedAvatar = { provider: string | null; url: string | null; ts: number };

function readCache(): CachedAvatar | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedAvatar;
    if (Date.now() - data.ts > CACHE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(provider: string | null, url: string | null): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ provider, url, ts: Date.now() }),
    );
  } catch {}
}

export function useProviderAvatar(
  userId: string | null,
): { provider: string | null; url: string | null } | null {
  const [avatar, setAvatar] = useState<{
    provider: string | null;
    url: string | null;
  } | null>(() => {
    if (!userId) return null;
    const cached = readCache();
    return cached ? { provider: cached.provider, url: cached.url } : null;
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetch("/api/integrations/avatar")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setAvatar({ provider: null, url: null });
          writeCache(null, null);
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          provider?: string;
          url?: string;
        } | null;
        const provider = json?.provider ?? null;
        const url = json?.url ?? null;
        setAvatar({ provider, url });
        writeCache(provider, url);
      })
      .catch(() => {
        if (!cancelled) setAvatar({ provider: null, url: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return userId ? avatar : null;
}
