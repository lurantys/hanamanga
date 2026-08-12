export function normalizeTitleKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/^the\s+/, "")
    .trim();
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
