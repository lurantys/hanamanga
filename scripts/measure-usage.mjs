#!/usr/bin/env node
// Universal usage-measurement scenario for hanamanga.
//
// Simulates one reading session (home -> manga -> chapter A -> prefetch B ->
// preload + search + recommend + manga + feed APIs) and reports Vercel's
// `x-vercel-cache` status per request. Any MISS on a dynamic route is one
// function execution (Fluid Active CPU); HITs cost no compute.
//
// Usage:
//   node scripts/measure-usage.mjs [baseUrl] [mangaId] [chapterA] [chapterB]
//
// Example:
//   node scripts/measure-usage.mjs https://www.hanamanga.online
//
// Protocol for every future change:
//   1. Run against production BEFORE the change, save the warm-pass output.
//   2. Deploy, wait ~2 min, run again AFTER.
//   3. Compare warm MISS counts. Goal: drive warm MISS toward 0.
// Run at a similar traffic hour; the script itself is 18 requests (negligible).

const [
  baseUrl = "https://www.hanamanga.online",
  mangaId = "al:86310",
  chapterA = "b6JiMhI1",
  chapterB = "q2tjHu2U",
] = process.argv.slice(2);
const base = baseUrl.replace(/\/$/, "");

const steps = [
  ["home", "/"],
  ["manga page", `/manga/${mangaId}`],
  ["chapter A (read)", `/read/${mangaId}/${chapterA}`],
  ["chapter B (next-chapter prefetch)", `/read/${mangaId}/${chapterB}`],
  [
    "preload API",
    `/api/preload-chapter?mangaId=${encodeURIComponent(mangaId)}&chapterId=${encodeURIComponent(chapterB)}`,
  ],
  ["search API", `/api/search?q=${encodeURIComponent("fire force")}`],
  [
    "recommend API",
    `/api/recommend?tags=${encodeURIComponent("Action:1,Adventure:1")}&limit=18&seed=42`,
  ],
  ["manga API", `/api/manga?ids=${encodeURIComponent(mangaId)}`],
  ["feed API", `/api/feed?ids=${encodeURIComponent(mangaId)}&limit=3`],
];

async function hit(label, path) {
  const started = Date.now();
  try {
    const res = await fetch(base + path, { redirect: "manual" });
    const buf = await res.arrayBuffer().catch(() => null);
    return {
      label,
      path,
      status: res.status,
      cache: res.headers.get("x-vercel-cache") ?? "n/a",
      ms: Date.now() - started,
      bytes: buf?.byteLength ?? 0,
    };
  } catch (err) {
    return {
      label,
      path,
      status: "ERR",
      cache: "n/a",
      ms: Date.now() - started,
      bytes: 0,
      error: String(err),
    };
  }
}

async function pass(name) {
  console.log(`\n--- ${name} ---`);
  const rows = [];
  for (const [label, path] of steps) {
    const row = await hit(label, path);
    rows.push(row);
    console.log(
      `${row.status}  ${String(row.cache).padEnd(12)}  ${String(row.ms).padStart(5)}ms  ${String(row.bytes).padStart(8)}b  ${row.label}`,
    );
  }
  return rows;
}

function summarize(rows, name) {
  const miss = rows.filter((r) => !String(r.cache).startsWith("HIT"));
  console.log(
    `\n${name}: ${rows.length} requests, ${rows.length - miss.length} edge HIT, ${miss.length} MISS/other (= function executions)`,
  );
  for (const r of miss) console.log(`  MISS  ${r.status}  ${r.path}`);
  return miss.length;
}

const cold = await pass("pass 1 (cold-ish: worst case)");
await new Promise((r) => setTimeout(r, 2000));
const warm = await pass("pass 2 (warm: steady state)");
summarize(cold, "pass 1");
const warmMiss = summarize(warm, "pass 2");
console.log(
  `\nVerdict: steady-state cost of one scripted session = ${warm.length} edge requests, ~${warmMiss} function executions.`,
);
