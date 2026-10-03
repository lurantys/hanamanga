/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const fixture = path.join(root, 'app/loading-regression-fixture');
const port = process.env.TEST_PORT || '3107';
const base = process.env.TEST_BASE_URL || `http://localhost:${port}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let server, browser, page, createdFixture = false;
let output = '';
async function visible(page, selector) { await page.locator(selector).waitFor({ state: 'visible' }); }
(async () => {
  // Never overwrite a real application route. The fixture is removed on exit.
  fs.mkdirSync(fixture);
  createdFixture = true;
  fs.copyFileSync(path.join(__dirname, 'fixtures/loading.tsx'), path.join(fixture, 'page.tsx'));
  if (!process.env.TEST_BASE_URL) {
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', port], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', (data) => { output += data; });
    server.stderr.on('data', (data) => { output += data; });
    for (let attempt = 0; attempt < 120; attempt++) {
      if (output.includes('Ready in')) break;
      if (server.exitCode !== null) throw new Error(output);
      await delay(250);
    }
  }
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/broken-cover.png', (route) => route.abort());
  await page.route('**/test-page.svg?*', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#555"/></svg>' }));
  await page.goto(`${base}/loading-regression-fixture`);
  await visible(page, 'main[aria-label="Loading browse page"]');
  for (const width of [390, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const kind of ['home', 'browse', 'search', 'manga', 'library', 'account', 'characters', 'login', 'about', 'reader']) {
      await page.getByRole('button', { name: kind, exact: true }).click();
      await visible(page, 'main[aria-busy="true"]');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${kind} overflows at ${width}px`);
      if (process.env.TEST_SCREENSHOT_DIR && ['browse', 'manga', 'account', 'reader'].includes(kind)) {
        fs.mkdirSync(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
        await page.locator('nav').evaluate((el) => { el.style.visibility = 'hidden'; });
        await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, `${kind}-${width}.png`) });
        await page.locator('nav').evaluate((el) => { el.style.visibility = ''; });
      }
      if (kind === 'browse' || kind === 'search') {
        const cols = await page.locator('main .grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        assert.equal(cols, width === 390 ? 2 : width === 1024 ? 5 : 6);
      }
      if (kind === 'characters') {
        const cols = await page.locator('main .grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        assert.equal(cols, width === 390 ? 2 : 5);
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  let releaseSearch;
  await page.route('**/api/search?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === 'second') await new Promise((resolve) => { releaseSearch = resolve; });
    await route.fulfill({ json: { data: [{ id: 'al:1', title: 'Result title', genres: [], availableLanguages: [] }], authors: [] } });
  });
  await page.getByRole('button', { name: 'live-search', exact: true }).click();
  await visible(page, 'a[aria-label="Result title. Open detail page."]');
  await page.getByRole('button', { name: 'Change query', exact: true }).click();
  await page.locator('a[aria-label="Result title. Open detail page."]').waitFor({ state: 'hidden' });
  assert.ok(await page.locator('.animate-pulse').count(), 'new query must show its list skeleton');
  for (let attempt = 0; attempt < 100 && !releaseSearch; attempt++) await delay(20);
  assert.ok(releaseSearch, 'second search should start');
  releaseSearch();
  await visible(page, 'a[aria-label="Result title. Open detail page."]');
  await page.getByRole('button', { name: 'cover', exact: true }).click();
  await page.locator('.manga-card-surface img').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('.manga-card-surface .animate-pulse').count(), 0, 'failed covers must stop pulsing');
  let requests = 0, releasePage;
  await page.route('**/api/browse?*', async (route) => {
    requests++;
    await new Promise((resolve) => { releasePage = resolve; });
    await route.fulfill({ json: { data: [], total: 100 } });
  });
  await page.getByRole('button', { name: 'pagination', exact: true }).click();
  for (let attempt = 0; attempt < 100 && !releasePage; attempt++) await delay(20);
  assert.ok(releasePage, 'pagination should start');
  const gridWidths = await page.locator('.grid').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width));
  assert.equal(gridWidths.length, 2);
  assert.equal(gridWidths[0], gridWidths[1], 'load-more skeleton must fill the content width');
  releasePage();
  await page.getByText('You’ve reached the end.').waitFor();
  await delay(250);
  assert.equal(requests, 1, 'an empty page must stop infinite loading');
  let releasePreload, preloadRequests = 0;
  await page.route('**/api/preload-chapter?*', async (route) => {
    preloadRequests++;
    await new Promise((resolve) => { releasePreload = resolve; });
    await route.fulfill({ json: { pages: ['/next-page.svg'] } });
  });
  await page.getByRole('button', { name: 'reader-content', exact: true }).click();
  await page.locator('img[src="/test-page.svg?index=0"]').waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  for (let attempt = 0; attempt < 100 && !releasePreload; attempt++) await delay(50);
  assert.ok(releasePreload, 'near-end reading should preload the next chapter');
  for (let i = 0; i < 4; i++) {
    await page.evaluate((offset) => window.scrollTo(0, document.documentElement.scrollHeight - innerHeight - offset), 20 + i * 10);
    await delay(100);
  }
  releasePreload();
  await page.locator('link[rel="preload"][href="/next-page.svg"]').waitFor({ state: 'attached' });
  assert.equal(preloadRequests, 1, 'scroll ticks must not abort/restart preloading');
  assert.deepEqual(errors, []);
  console.log('Loading UI checks passed: 10 routes at 3 widths, query changes, failed covers, pagination, reader preloading');
})().catch(async (error) => { if (page) await page.screenshot({ path: '/tmp/hana-loading-failure.png' }); console.error(error); console.error(output.slice(-2500)); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
  if (createdFixture) fs.rmSync(fixture, { recursive: true, force: true });
});
