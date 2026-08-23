/* global document, IDBDatabase, structuredClone, window */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const evidenceDirectory = resolve(projectRoot, process.env.BLOCKFOLK_EVIDENCE_DIRECTORY || 'test-results/grid-snap-recovery-phase0/page4-read-only');
const fixture = JSON.parse(await readFile(resolve(projectRoot, 'tests/fixtures/historical/page4-499636e.json'), 'utf8'));
await mkdir(evidenceDirectory, { recursive: true });

const failures = []; const unexpectedRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
await context.route('**/*', async (route) => {
  const url = route.request().url(); if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  unexpectedRequests.push(url); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });
await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();

await page.evaluate(async (historical) => {
  const app = window.BlockFolkImaginarium.app; await app.storage.putPicture(historical);
  const prototype = IDBDatabase.prototype; const original = prototype.transaction;
  window.__page4WriteTransactions = 0;
  prototype.transaction = function transaction(...args) { if (args[1] === 'readwrite') window.__page4WriteTransactions += 1; return original.apply(this, args); };
}, fixture);

const before = await page.evaluate(async (id) => {
  const app = window.BlockFolkImaginarium.app; const value = await app.storage.getPicture(id);
  return { value, databaseVersion: app.storage.db.version, writes: window.__page4WriteTransactions };
}, fixture.id);
assert.equal(before.writes, 0);

await page.evaluate(() => window.BlockFolkImaginarium.app.showGallery());
const galleryBoundary = await page.evaluate((id) => {
  const card = document.querySelector(`[data-picture-id="${id}"]`)?.closest('.gallery-card-item');
  const action = (name) => card.querySelector(`[data-gallery-action="${name}"]`);
  return { writes: window.__page4WriteTransactions, titleDisabled: card.querySelector('[data-picture-title]').disabled, puzzleDisabled: action('puzzle').disabled, duplicateDisabled: action('duplicate').disabled, deleteDisabled: action('delete').disabled, downloadDisabled: action('download').disabled };
}, fixture.id);
assert.deepEqual(galleryBoundary, { writes: 0, titleDisabled: true, puzzleDisabled: true, duplicateDisabled: true, deleteDisabled: true, downloadDisabled: false });

await page.evaluate((id) => window.BlockFolkImaginarium.app.openPicture(id), fixture.id);
const opened = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const snap = document.querySelector('[data-action="snap-context"]');
  return { writes: window.__page4WriteTransactions, stickers: structuredClone(app.current.stickers), renderedConnections: app.current.connections.length, quarantinedConnections: structuredClone(app.legacySession.quarantinedConnections), identity: app.legacySession.originalIdentity, hash: app.legacySession.canonicalHash, capabilities: app.legacySession.capabilities, notice: document.querySelector('#toast').textContent, snapDisabled: snap.disabled, saveStatus: document.querySelector('#save-status').textContent };
});
assert.equal(opened.writes, 0); assert.deepEqual(opened.stickers, fixture.stickers); assert.equal(opened.renderedConnections, 0); assert.deepEqual(opened.quarantinedConnections, fixture.connections); assert.equal(opened.identity.id, fixture.id); assert.equal(opened.notice, 'This older picture is open read-only. Your stickers are safe, but its snap links are inactive.'); assert.equal(opened.snapDisabled, true); assert.equal(opened.saveStatus, 'Read-only');
assert.equal(opened.hash, 'c265065b580daebeddb353bbe45ee50090a775620bcae067bbc4ff20c33a798f');
for (const capability of ['contentMutation', 'stickerEdit', 'snap', 'undoRedo', 'save', 'rename', 'duplicate', 'delete', 'recoveryExport', 'puzzle']) assert.equal(opened.capabilities[capability], false);

const pngBefore = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl());
await page.locator('[data-action="camera-zoom-in"]').click(); await page.locator('[data-action="camera-fit"]').click();
const pngAfter = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl()); assert.match(pngBefore, /^data:image\/png;base64,/); assert.match(pngAfter, /^data:image\/png;base64,/);
assert.deepEqual(await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; const result = await app.saveCurrent({ quiet: true }); return { result, writes: window.__page4WriteTransactions }; }), { result: false, writes: 0 });
assert.equal(await page.evaluate(() => window.__page4WriteTransactions), 0);
await page.screenshot({ path: resolve(evidenceDirectory, 'page4-read-only-400x844.png'), fullPage: true });
await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(100); await page.screenshot({ path: resolve(evidenceDirectory, 'page4-read-only-844x400.png'), fullPage: true });

await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; await app.donePicture(); document.querySelector('#toast').textContent = 'notice-sentinel'; await app.openPicture(app.current.id); });
assert.deepEqual(await page.evaluate(() => ({ writes: window.__page4WriteTransactions, notice: document.querySelector('#toast').textContent })), { writes: 0, notice: 'notice-sentinel' }, 'notice dismissal must remain session-only and reopening in the same session must not persist or repeat it');

const after = await page.evaluate(async (id) => { const app = window.BlockFolkImaginarium.app; return { value: await app.storage.getPicture(id), databaseVersion: app.storage.db.version, writes: window.__page4WriteTransactions }; }, fixture.id);
assert.equal(after.writes, 0); assert.equal(after.databaseVersion, before.databaseVersion); assert.deepEqual(after.value, before.value); assert.equal(after.value.schema, fixture.schema); assert.equal(after.value.updatedAt, fixture.updatedAt);

const malformed = { ...fixture, id: 'fixture-page4-malformed', stickers: [{ ...fixture.stickers[0], x: 'not-a-number' }] };
await page.evaluate(async (value) => { const app = window.BlockFolkImaginarium.app; await app.storage.putPicture(value); window.__page4WriteTransactions = 0; }, malformed);
const malformedProof = await page.evaluate(async (id) => { const app = window.BlockFolkImaginarium.app; let rejected = false; try { await app.openPicture(id); } catch { rejected = true; } return { rejected, writes: window.__page4WriteTransactions, stored: await app.storage.getPicture(id) }; }, malformed.id);
assert.equal(malformedProof.rejected, true); assert.equal(malformedProof.writes, 0); assert.deepEqual(malformedProof.stored, malformed);

assert.deepEqual(failures, []); assert.deepEqual(unexpectedRequests, []);
await browser.close();
console.log('BLOCKFOLK_PAGE4_READ_ONLY_BROWSER PASS', JSON.stringify({ hash: opened.hash, databaseVersion: after.databaseVersion, writeTransactions: after.writes, screenshots: ['400x844', '844x400'] }));
