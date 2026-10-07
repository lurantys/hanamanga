/* eslint-disable @typescript-eslint/no-require-imports -- Standalone browser regression runner. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const fixture = path.join(root, 'app/mobile-scroll-regression-fixture');
const port = process.env.TEST_PORT || '3108';
const base = process.env.TEST_BASE_URL || `http://localhost:${port}`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let server, browser, page, createdFixture = false, output = '';
(async () => {
  fs.mkdirSync(fixture);
  createdFixture = true;
  fs.copyFileSync(path.join(__dirname, 'fixtures/mobile-scroll.tsx'), path.join(fixture, 'page.tsx'));
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
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/scroll-test-page.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1600"><rect width="600" height="1600" fill="#555"/></svg>' }));
  const cdp = await page.context().newCDPSession(page);
  const loader = page.locator('main[aria-label="Loading chapter"]');
  async function swipe(x, y, dy) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await delay(100);
    assert.equal(await loader.count(), 0, 'touching a chapter must not show the navigation loader');
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + dy * i / 10 }] });
      await delay(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await delay(250);
    assert.equal(await loader.count(), 0, 'swiping must not show a chapter navigation loader');
    assert.ok(page.url().includes('/mobile-scroll-regression-fixture'), 'swiping must not navigate');
  }
  for (const view of ['atsu', 'mangadex']) {
    await page.goto(`${base}/mobile-scroll-regression-fixture`);
    await page.getByRole('button', { name: view, exact: true }).click();
    const link = page.locator('a[href^="/read/"]').nth(3);
    const box = await link.boundingBox();
    assert.ok(box);
    await swipe(box.x + box.width / 2, box.y + box.height / 2, -150);
    assert.ok(await page.evaluate(() => scrollY > 50), `${view} should scroll naturally`);
  }
  await page.goto(`${base}/mobile-scroll-regression-fixture`);
  await page.getByRole('button', { name: 'reader', exact: true }).click();
  await page.locator('img[src="/scroll-test-page.svg"]').tap({ position: { x: 195, y: 200 } });
  const beforeOpen = await page.evaluate(() => scrollY);
  await page.locator('[aria-controls="reader-chapter-list"]').click();
  const menu = page.locator('#reader-chapter-list');
  await menu.waitFor();
  assert.equal(await page.evaluate(() => scrollY), beforeOpen, 'opening the menu must not move the reader');
  assert.equal(await menu.evaluate((el) => getComputedStyle(el).overscrollBehaviorY), 'contain');
  const initial = await menu.evaluate((el) => el.scrollTop);
  const box = await menu.boundingBox();
  await swipe(box.x + box.width / 2, box.y + box.height - 45, -150);
  assert.ok(await menu.evaluate((el) => el.scrollTop) > initial + 50, 'reader chapter menu should scroll');
  await menu.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await swipe(box.x + box.width / 2, box.y + box.height - 45, -150);
  assert.equal(await page.evaluate(() => scrollY), beforeOpen, 'menu edge must not scroll the reader behind it');
  // Hold navigation requests so feedback can be inspected before the route commits.
  await page.route('**/read/**', () => {});
  await menu.locator('a').last().tap();
  await loader.waitFor({ state: 'visible' });
  await page.goto(`${base}/mobile-scroll-regression-fixture`);
  await page.getByRole('link', { name: 'Navigate', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/mobile-scroll-regression-fixture?destination=1');
  assert.deepEqual(errors, []);
  console.log('Mobile scrolling checks passed: both chapter lists, nested reader scrolling, menu boundaries, taps and keyboard navigation');
})().catch(async (error) => {
  if (page) await page.screenshot({ path: '/tmp/hana-mobile-scroll-failure.png' });
  console.error(error); console.error(output.slice(-2500)); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server) server.kill('SIGTERM');
  if (createdFixture) fs.rmSync(fixture, { recursive: true, force: true });
});
