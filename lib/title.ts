export function normalizeTitleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^the\s+/, "")
    .trim();
}

type WorkTitles = {
  title: string;
  altTitles?: readonly (string | null | undefined)[] | null;
};

/** Whether two manga are the same work by title, tolerating variant titles. */
export function sameWorkByTitle(
  a: WorkTitles | null | undefined,
  b: WorkTitles | null | undefined,
): boolean {
  const titles = (m: WorkTitles | null | undefined): string[] =>
    [m?.title, ...(m?.altTitles ?? [])].filter((v): v is string => Boolean(v));
  const at = titles(a);
  const bt = titles(b);
  for (const x of at) {
    for (const y of bt) {
      const kx = normalizeTitleKey(x);
      const ky = normalizeTitleKey(y);
      if (!kx || !ky) continue;
      if (kx === ky) return true;
      const tx = kx.split(" ").filter((token) => token.length > 2);
      const ty = ky.split(" ").filter((token) => token.length > 2);
      if (tx.length < 2 || ty.length < 2) continue;
      if (titleHits(x, [y])) return true;
    }
  }
  return false;
}

export function titleHits(
  query: string,
  targets: readonly (string | null | undefined)[],
): boolean {
  const q = normalizeTitleKey(query);
  if (!q) return false;

  const normalized = targets
    .filter((value): value is string => Boolean(value))
    .map(normalizeTitleKey)
    .filter(Boolean);

  if (normalized.some((target) => target === q)) return true;

  const qTokens = new Set(q.split(" ").filter((token) => token.length > 2));
  if (!qTokens.size) return false;

  for (const target of normalized) {
    const tTokens = new Set(target.split(" ").filter((token) => token.length > 2));
    if ([...qTokens].every((token) => tTokens.has(token))) return true;
    if ([...tTokens].every((token) => qTokens.has(token))) return true;
  }
  return false;
}
