#!/usr/bin/env node
// Simulated human reader: drives real Chromium (mobile viewport) through a
// realistic session — home -> manga -> chapter B -> scroll ~90% -> Next ->
// chapter A -> scroll — logging every request with its x-vercel-cache status.
//
// Usage:
//   node scripts/simulate-reader.mjs [baseUrl] [mangaId] [chapterB]
// Any same-origin path hit >5 times signals a client-side refetch loop.

import { chromium } from "playwright-core";

const [baseUrl = "https://www.hanamanga.online", mangaId = "al:86310", chapterB = "q2tjHu2U"] =
  process.argv.slice(2);
const base = baseUrl.replace(/\/$/, "");
const HOST = new URL(base).host;

const log = []; // {t, method, url, type, status, cache}
const errors = [];

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.36 Mobile/15E148 Safari/604.1",
});
const page = await ctx.newPage();
const t0 = Date.now();
const stamp = () => ((Date.now() - t0) / 1000).toFixed(1) + "s";

page.on("request", (req) => {
  try {
    const url = new URL(req.url());
    if (url.host !== HOST) {
      log.push({ t: stamp(), external: true, type: req.resourceType() });
      return;
    }
    log.push({
      t: stamp(),
      method: req.method(),
      url: url.pathname + url.search,
      type: req.resourceType(),
      status: null,
      cache: null,
    });
  } catch {}
});
page.on("response", (res) => {
  try {
    const url = new URL(res.url());
    if (url.host !== HOST) return;
    const key = url.pathname + url.search;
    for (let i = log.length - 1; i >= 0; i--) {
      if (!log[i].external && log[i].url === key && log[i].cache === null) {
        log[i].status = res.status();
        log[i].cache = res.headers()["x-vercel-cache"] ?? "n/a";
        break;
      }
    }
  } catch {}
});
page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));

async function scrollFraction() {
  return page.evaluate(
    () =>
      window.scrollY /
      Math.max(1, document.documentElement.scrollHeight - window.innerHeight),
  );
}

console.log("home...");
await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(600);
}

console.log("manga page...");
await page.goto(`${base}/manga/${mangaId}`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(2500);

console.log("chapter B, reading to ~90%...");
await page.goto(`${base}/read/${mangaId}/${chapterB}`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(2500);
for (let i = 0; i < 40; i++) {
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(650);
  if ((await scrollFraction()) >= 0.9) break;
}
console.log("reached fraction:", await scrollFraction());
await page.waitForTimeout(3000); // let preload + progress saves fire

console.log("clicking Next...");
const before = page.url();
// Mobile chrome auto-hides after scrolling: tap once to reveal controls.
await page.touchscreen.tap(195, 400);
await page.waitForTimeout(800);
await page.getByRole("link", { name: "Next" }).first().click({ timeout: 8000 });
await page.waitForFunction((u) => window.location.href !== u, before, {
  timeout: 30000,
});
console.log("landed on:", page.url());
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i++) {
  await page.mouse.wheel(0, 1400);
  await page.waitForTimeout(600);
}
await page.waitForTimeout(2000);

await browser.close();

// ---- report ----
import { writeFileSync } from "node:fs";
writeFileSync("/tmp/reader-sim.json", JSON.stringify(log, null, 1));
const same = log.filter((e) => !e.external);
const ext = log.filter((e) => e.external);
const byPath = {};
for (const e of same) {
  const k = `${e.method} ${e.url}`;
  byPath[k] = byPath[k] || { count: 0, caches: {} };
  byPath[k].count++;
  const c = e.cache ?? "pending";
  byPath[k].caches[c] = (byPath[k].caches[c] || 0) + 1;
}
console.log(`\n--- same-origin: ${same.length} reqs | external (images/cdns): ${ext.length} ---`);
for (const [k, v] of Object.entries(byPath).sort((a, b) => b[1].count - a[1].count)) {
  const flag = v.count > 5 ? "  <-- LOOP SUSPECT" : "";
  console.log(`${String(v.count).padStart(3)}x  ${k}  ${JSON.stringify(v.caches)}${flag}`);
}
const miss = same.filter((e) => e.cache && !e.cache.startsWith("HIT")).length;
console.log(`\nfunction executions (non-HIT same-origin): ${miss}`);
if (errors.length) console.log("PAGE ERRORS:", errors);
