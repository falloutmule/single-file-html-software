/* global Buffer, document, getComputedStyle, indexedDB, localStorage, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const evidenceDirectory = resolve(projectRoot, 'test-results/blockfolk-pre-art');
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75,
  isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true
});
const failures = [];
const runtimeRequests = [];
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  runtimeRequests.push(url); failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });
await page.goto(artifactUrl, { waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();

// Seed the original product namespace, then prove BlockFolk neither reads nor mutates it.
await page.evaluate(async () => {
  localStorage.setItem('the-imaginarium.preferences@1', JSON.stringify({ sound: false, sentinel: 'original-only' }));
  await new Promise((resolvePromise, reject) => {
    const request = indexedDB.open('the-imaginarium-library-v1', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['pictures', 'packs', 'puzzles']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('pictures', 'readwrite');
      transaction.objectStore('pictures').put({ id: 'original-sentinel', title: 'Original Imaginarium only', updatedAt: '2026-08-17T00:00:00.000Z' });
      transaction.oncomplete = () => { db.close(); resolvePromise(); };
      transaction.onerror = () => reject(transaction.error);
    };
  });
});
await page.reload({ waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.storage.mode), 'indexeddb');
assert.equal(await page.evaluate(() => localStorage.getItem('blockfolk-imaginarium.preferences@1')), null);
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.storage.listPictures().then((items) => items.length)), 0);

await page.getByRole('button', { name: /Make a Picture/ }).click();
await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await page.evaluate(() => {
  const diagnostic = window.BlockFolkImaginarium.diagnostics();
  return { background: diagnostic.background, stickers: diagnostic.stickers };
}), { background: null, stickers: 0 });

const expectedCategories = [
  ['animals', 'Animals'], ['people', 'People'], ['things', 'Things'], ['nature', 'Nature'],
  ['silly', 'Silly'], ['words', 'Words'], ['emoji', 'Emoji']
];
assert.deepEqual(await page.locator('#category-tabs [data-category]').evaluateAll((buttons) => buttons.map((button) => [button.dataset.category, button.closest('.sfhs-cf-root')?.textContent.trim()])), expectedCategories);
for (const [id, title] of expectedCategories) {
  const button = page.locator(`#category-tabs [data-category="${id}"]`);
  await button.scrollIntoViewIfNeeded(); await button.click();
  assert.equal(await page.locator('#sticker-strip-title').textContent(), title);
  assert.equal(await page.locator('#sticker-strip-title').getAttribute('data-category'), id);
  assert.equal(await page.locator('#sticker-list [data-sticker-id]').count(), 0);
  assert.equal(await page.locator('#sticker-list .empty-strip-message').textContent(), 'BlockFolk are coming soon');
  assert.equal(await button.evaluate((element) => element.closest('.sfhs-cf-root')?.querySelectorAll('svg.lucide').length), 1, `${title} must use temporary Lucide icon data`);
}
const categoryMetrics = await page.locator('#category-tabs [data-category]').evaluateAll((buttons) => ({
  minimumWidth: Math.min(...buttons.map((button) => button.closest('.sfhs-cf-root').getBoundingClientRect().width)),
  minimumHeight: Math.min(...buttons.map((button) => button.closest('.sfhs-cf-root').getBoundingClientRect().height))
}));
assert.ok(categoryMetrics.minimumWidth >= 48 && categoryMetrics.minimumHeight >= 48, 'category targets must remain touch-sized');
assert.equal(await page.locator('#sticker-list').evaluate((element) => getComputedStyle(element).touchAction), 'pan-x');
await page.locator('#sticker-list').dispatchEvent('pointerdown', { pointerId: 2, clientX: 300, clientY: 700 });
await page.locator('#sticker-list').dispatchEvent('pointermove', { pointerId: 2, clientX: 80, clientY: 700 });
await page.locator('#sticker-list').dispatchEvent('pointerup', { pointerId: 2, clientX: 80, clientY: 700 });

// Empty boards remain first-class creations: save, reopen, export, reset, and surprise all work.
const emptyProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app;
  await app.saveCurrent({ quiet: true }); const id = app.current.id;
  const exportLength = app.exportDataUrl().length;
  await app.goHome(); await app.openPicture(id);
  return { id, exportLength, stickers: app.current.stickers.length, background: app.current.page.backgroundAssetId };
});
assert.ok(emptyProof.id.startsWith('blockfolk-picture-'));
assert.ok(emptyProof.exportLength > 10000);
assert.deepEqual({ stickers: emptyProof.stickers, background: emptyProof.background }, { stickers: 0, background: null });
await page.evaluate(() => window.BlockFolkImaginarium.app.goHome());
await page.getByRole('button', { name: /Surprise Me/ }).click();
await page.locator('#editor-screen:not([hidden])').waitFor();
assert.equal((await page.evaluate(() => window.BlockFolkImaginarium.diagnostics())).stickers, 0);

// Create a tiny technical-only import fixture with transparent padding. It is never added to source or the packed product.
const fixtureBase64 = await page.evaluate(() => {
  const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
  const context2d = canvas.getContext('2d'); context2d.fillStyle = '#2f7f63'; context2d.fillRect(8, 9, 15, 13);
  return canvas.toDataURL('image/png').split(',')[1];
});
const manifest = {
  schema: 'blockfolk-imaginarium.sticker-pack@1', id: 'local-proof', title: 'Local Proof', version: '1.0.0',
  stickers: [{ id: 'proof-piece', path: 'stickers/animals/proof.png', name: 'Local Proof Piece', category: 'animals', alt: 'Local proof piece' }], backgrounds: []
};
const zipBytes = zipSync({ 'pack.json': strToU8(JSON.stringify(manifest)), 'stickers/animals/proof.png': Buffer.from(fixtureBase64, 'base64') });
await page.evaluate(() => window.BlockFolkImaginarium.app.openParentTools());
await page.locator('#parent-tools-screen:not([hidden])').waitFor();
await page.locator('#pack-input').setInputFiles({ name: 'local-proof.zip', mimeType: 'application/zip', buffer: Buffer.from(zipBytes) });
await page.waitForFunction(() => window.BlockFolkImaginarium.app.packs.length === 1);
const importProof = await page.evaluate(() => {
  const asset = window.BlockFolkImaginarium.app.packs[0].assets[0];
  return { id: asset.id, category: asset.category, trimStatus: asset.trimStatus, width: asset.width, height: asset.height };
});
assert.deepEqual(importProof, { id: 'pack-local-proof-proof-piece', category: 'animals', trimStatus: 'trimmed', width: 32, height: 32 });
assert.match(await page.locator('#import-report').textContent(), /Transparent padding trimmed/);

await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); app.category = 'animals'; app.renderLibrary(); });
await page.locator('[data-sticker-id="pack-local-proof-proof-piece"]').waitFor();
for (let index = 0; index < 3; index += 1) await page.locator('[data-sticker-id="pack-local-proof-proof-piece"]').click();
await page.waitForFunction(() => window.BlockFolkImaginarium.diagnostics().stickers === 3);

const objectState = () => page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const active = app.activeSticker();
  return {
    activeId: active?.blockfolkLayerId || null,
    active: active ? { x: active.left, y: active.top, scaleX: active.scaleX, scaleY: active.scaleY, angle: active.angle, flipX: active.flipX } : null,
    order: app.canvas.getObjects().map((object) => object.blockfolkLayerId)
  };
});
await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const objects = app.canvas.getObjects();
  objects.forEach((object, index) => { object.set({ left: 360 + index * 160, top: 620 + index * 80 }); object.setCoords(); });
  app.canvas.setActiveObject(objects[1]); app.canvas.requestRenderAll(); app.updateSelection();
});
const beforeTools = await objectState();
await page.locator('[data-action="turn"]').click();
await page.locator('[data-action="flip"]').click();
let state = await objectState();
assert.deepEqual({ x: state.active.x, y: state.active.y, scaleX: state.active.scaleX, scaleY: state.active.scaleY }, { x: beforeTools.active.x, y: beforeTools.active.y, scaleX: beforeTools.active.scaleX, scaleY: beforeTools.active.scaleY });
assert.equal(state.active.angle, 15); assert.equal(state.active.flipX, true);
await page.locator('[data-action="behind"]').click();
assert.deepEqual((await objectState()).order, [beforeTools.order[1], beforeTools.order[0], beforeTools.order[2]]);
await page.locator('[data-action="undo"]').click(); assert.deepEqual((await objectState()).order, beforeTools.order);
await page.locator('[data-action="redo"]').click(); assert.deepEqual((await objectState()).order, [beforeTools.order[1], beforeTools.order[0], beforeTools.order[2]]);
await page.locator('[data-action="in-front"]').click(); assert.deepEqual((await objectState()).order, beforeTools.order);
await page.locator('[data-action="copy"]').click();
await page.waitForFunction(() => window.BlockFolkImaginarium.diagnostics().stickers === 4);
assert.equal((await objectState()).active.flipX, true, 'Copy must retain Flip state');

const beforeSave = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
  return app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }));
});
const savedProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.saveCurrent({ quiet: true }); const id = app.current.id;
  const exportLength = app.exportDataUrl().length; const puzzle = await app.flattenPictureForPuzzle(id);
  await app.goHome(); await app.openPicture(id); app.syncCurrentFromCanvas();
  return { id, exportLength, puzzleLength: puzzle.dataUrl.length, stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex })) };
});
assert.deepEqual(savedProof.stickers, beforeSave, 'save/reload must preserve imported assets, placement, transform, and stack');
assert.ok(savedProof.exportLength > 10000 && savedProof.puzzleLength > 10000);
const downloadPromise = page.waitForEvent('download');
await page.evaluate(() => window.BlockFolkImaginarium.app.downloadCurrent());
const download = await downloadPromise;
assert.match(download.suggestedFilename(), /^blockfolk-imaginarium-.*\.png$/);

await page.screenshot({ path: resolve(evidenceDirectory, 'blockfolk-pre-art-phone.png'), fullPage: true });
const originalNamespace = await page.evaluate(async () => {
  const preference = localStorage.getItem('the-imaginarium.preferences@1');
  const picture = await new Promise((resolvePromise, reject) => {
    const request = indexedDB.open('the-imaginarium-library-v1', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const transaction = db.transaction('pictures', 'readonly'); const get = transaction.objectStore('pictures').get('original-sentinel');
      get.onsuccess = () => { db.close(); resolvePromise(get.result); }; get.onerror = () => reject(get.error);
    };
  });
  return { preference, picture };
});
assert.equal(JSON.parse(originalNamespace.preference).sentinel, 'original-only');
assert.equal(originalNamespace.picture.title, 'Original Imaginarium only');
assert.deepEqual(runtimeRequests, []);
assert.deepEqual(failures, []);
console.log('BLOCKFOLK_IMAGINARIUM_PRE_ART_BROWSER PASS', JSON.stringify({ emptyProof, importProof, savedPictureId: savedProof.id, exportLength: savedProof.exportLength, categoryMetrics, runtimeRequests: runtimeRequests.length, evidenceDirectory }));
await browser.close();
