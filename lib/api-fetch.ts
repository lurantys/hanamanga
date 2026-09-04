// Session-scoped GET JSON cache for internal /api calls.
//
// Identical in-flight requests share one promise, and repeat reads within the
// TTL are served from memory — so component remounts and progress/library
// events don't re-hit Vercel functions. The edge (s-maxage) cache remains the
// cross-user layer; this only cuts redundant same-session requests.
const memory = new Map<string, { expires: number; data: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export function fetchJsonCached<T>(
  url: string,
  ttlMs = 120_000,
): Promise<T | null> {
  const hit = memory.get(url);
  if (hit && hit.expires > Date.now()) {
    return Promise.resolve(hit.data as T);
  }
  const ongoing = inflight.get(url);
  if (ongoing) return ongoing as Promise<T | null>;

  const task = fetch(url)
    .then((res) => (res.ok ? res.json() : null) as Promise<T | null>)
    .then((json) => {
      if (json !== null && json !== undefined) {
        memory.set(url, { expires: Date.now() + ttlMs, data: json });
        if (memory.size > 200) {
          const oldest = memory.keys().next();
          if (!oldest.done) memory.delete(oldest.value);
        }
      }
      return json;
    })
    .catch(() => null);

  inflight.set(url, task);
  const cleanup = () => {
    if (inflight.get(url) === task) inflight.delete(url);
  };
  task.then(cleanup, cleanup);
  return task;
}
