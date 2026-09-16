import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!cached) {
    if (!url || !key) {
      // No Supabase env vars (e.g. `next build` on a host where they aren't
      // set). Fall back to inert placeholders so constructing the client
      // never throws: no network call happens until a method is used, and
      // the effects that use it don't run during prerender. The app then
      // behaves as signed-out instead of crashing the build (or the page).
      // With env present, behavior is unchanged.
      cached = createBrowserClient("https://localhost:54321", "missing-env-placeholder", {
        isSingleton: true,
      });
    } else {
      cached = createBrowserClient(url, key, { isSingleton: true });
    }
  }
  return cached;
}