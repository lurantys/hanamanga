"use client";

import { useEffect, useState } from "react";

export function useProviderAvatar(
  userId: string | null,
): { provider: string | null; url: string | null } | null {
  const [avatar, setAvatar] = useState<{
    provider: string | null;
    url: string | null;
  } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetch("/api/integrations/avatar")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setAvatar({ provider: null, url: null });
          return;
        }
        const json = (await res.json().catch(() => null)) as {
          provider?: string;
          url?: string;
        } | null;
        setAvatar({
          provider: json?.provider ?? null,
          url: json?.url ?? null,
        });
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
