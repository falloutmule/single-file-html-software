/* global document, window */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { chromium } from '../../../../packages/browser-runner/node_modules/playwright/index.mjs';

const productRoot = resolve(import.meta.dirname, '../..');
const evidenceRoot = resolve(productRoot, process.env.BLOCKFOLK_CALIBRATION_EVIDENCE || 'test-results/snapping-calibration-phase2');
await mkdir(evidenceRoot, { recursive: true });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = resolve(productRoot, `.${pathname === '/' ? '/tools/snap-authoring/index.html' : pathname}`);
    if (!candidate.startsWith(`${productRoot}${sep}`)) throw new Error('outside product root');
    const body = await readFile(candidate);
    response.writeHead(200, { 'content-type': mime[extname(candidate)] || 'application/octet-stream', 'cache-control': 'no-store' }); response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
const harnessUrl = `http://127.0.0.1:${address.port}/tools/snap-authoring/index.html`;
const failures = []; const requests = [];
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [{ width: 400, height: 844, name: 'portrait' }, { width: 844, height: 400, name: 'landscape' }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', (error) => failures.push(`${viewport.name} pageerror: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') failures.push(`${viewport.name} console: ${message.text()}`); });
    page.on('request', (request) => requests.push(request.url()));
    await page.goto(harnessUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__blockfolkCalibration?.allBoundsMatch === true);
    const initial = await page.evaluate(() => ({
      node: document.querySelector('#authorCanvas')?.nodeName,
      status: document.querySelector('#status')?.textContent,
      state: window.__blockfolkCalibration,
      json: document.querySelector('#jsonEditor')?.value
    }));
    assert.equal(initial.node, 'CANVAS');
    assert.match(initial.status, /pixels verified/u);
    assert.equal(initial.state.profile.productionEnabled, false);
    assert.deepEqual(initial.state.profile.ports.map(({ id }) => id), ['cellMount', 'wallLeft', 'wallRight', 'stackTop', 'stackBase', 'wallFace']);

    await page.locator('#exportButton').click();
    const exported = await page.locator('#jsonEditor').inputValue();
    assert.equal(exported, initial.json);
    await page.locator('#importButton').click();
    assert.equal(await page.locator('#jsonEditor').inputValue(), exported);

    await page.locator('#flipButton').click();
    assert.equal(await page.locator('#flipButton').getAttribute('aria-pressed'), 'true');
    assert.equal((await page.evaluate(() => window.__blockfolkCalibration)).flipped, true);
    await page.screenshot({ path: resolve(evidenceRoot, `brick-block-calibration-${viewport.name}.png`), fullPage: true });

    await page.locator('#assetSelect').selectOption('sticker-blockfolk-wood-log-block');
    await page.screenshot({ path: resolve(evidenceRoot, `log-block-calibration-${viewport.name}.png`), fullPage: true });

    const beforeOrigin = await page.evaluate(() => window.__blockfolkCalibration.profile.constructionOrigin);
    const canvas = page.locator('#authorCanvas'); const box = await canvas.boundingBox();
    const originScreen = await canvas.evaluate((node) => ({ x: Number(node.dataset.originScreenX), y: Number(node.dataset.originScreenY) }));
    await page.mouse.move(box.x + originScreen.x, box.y + originScreen.y);
    await page.mouse.down(); await page.mouse.move(box.x + originScreen.x + 12, box.y + originScreen.y + 8, { steps: 3 }); await page.mouse.up();
    const afterOrigin = await page.evaluate(() => window.__blockfolkCalibration.profile.constructionOrigin);
    assert.notDeepEqual(afterOrigin, beforeOrigin, 'authoring origin must be draggable');
    await page.locator('#resetButton').click();
    assert.deepEqual(await page.evaluate(() => window.__blockfolkCalibration.profile.constructionOrigin), beforeOrigin);
    await context.close();
  }
} finally {
  await browser.close(); await new Promise((resolveClose) => server.close(resolveClose));
}

const unexpected = requests.filter((url) => !url.startsWith(`http://127.0.0.1:${address.port}/`));
assert.deepEqual(unexpected, [], 'harness must make no external requests');
assert.deepEqual(failures, [], 'harness must have zero page and console errors');
console.log(JSON.stringify({ viewports: ['400x844', '844x400'], screenshots: 4, requests: requests.length, unexpected: unexpected.length, failures: failures.length }));
