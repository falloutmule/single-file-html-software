/* global Buffer, document, Image, indexedDB, localStorage, MouseEvent, PointerEvent, setTimeout, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const evidenceDirectory = resolve(projectRoot, 'test-results/world-foundation');
await mkdir(evidenceDirectory, { recursive: true });

const failures = [];
const runtimeRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 400, height: 844 }, deviceScaleFactor: 2,
  isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true
});
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  runtimeRequests.push(url); failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });

async function boot() {
  await page.goto(artifactUrl, { waitUntil: 'load' });
  await page.locator('#app[data-boot="ready"]').waitFor();
}

async function pointer(type, pointerId, x, y) {
  await page.evaluate(({ type, pointerId, x, y }) => {
    const surface = window.BlockFolkImaginarium.app.canvas.upperCanvasEl;
    const rect = surface.getBoundingClientRect();
    surface.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId, pointerType: 'touch', isPrimary: pointerId === 1,
      clientX: rect.left + x, clientY: rect.top + y, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1
    }));
  }, { type, pointerId, x, y });
}

const cameraState = () => page.evaluate(() => structuredClone(window.BlockFolkImaginarium.diagnostics().world));
const stickerState = () => page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
  return app.current.stickers.map(({ layerId, assetId, sourceEmoji, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, sourceEmoji, x, y, scaleX, scaleY, angle, flipX, zIndex }));
});

async function delayedCompatibilityTap(selector) {
  return page.evaluate(async (controlSelector) => {
    const app = window.BlockFolkImaginarium.app; const control = document.querySelector(controlSelector);
    const before = app.controls.activationCount; const cameraBefore = structuredClone(app.camera); const rect = control.getBoundingClientRect();
    const eventOptions = { bubbles: true, cancelable: true, pointerId: 91, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    control.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
    control.dispatchEvent(new PointerEvent('pointerup', { ...eventOptions, buttons: 0 }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 40));
    control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: eventOptions.clientX, clientY: eventOptions.clientY }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    const physicalActivations = app.controls.activationCount - before;
    const beforeAssistive = app.controls.activationCount;
    control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 0));
    const assistiveActivations = app.controls.activationCount - beforeAssistive;
    app.camera = cameraBefore; app.applyCamera(); app.syncCurrentFromCanvas();
    return { physicalActivations, assistiveActivations };
  }, selector);
}

await boot();

// Seed both the original product and the old BlockFolk selection vocabulary.
await page.evaluate(async () => {
  localStorage.setItem('the-imaginarium.preferences@1', JSON.stringify({ sound: false, sentinel: 'original-only' }));
  localStorage.setItem('blockfolk-imaginarium.preferences@1', JSON.stringify({ category: 'things', sentinel: 'blockfolk-only' }));
  await new Promise((resolvePromise, reject) => {
    const request = indexedDB.open('the-imaginarium-library-v1', 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['pictures', 'packs', 'puzzles']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result; const transaction = db.transaction('pictures', 'readwrite');
      transaction.objectStore('pictures').put({ id: 'original-sentinel', title: 'Original Imaginarium only', updatedAt: '2026-08-17T00:00:00.000Z' });
      transaction.oncomplete = () => { db.close(); resolvePromise(); }; transaction.onerror = () => reject(transaction.error);
    };
  });
});
await page.reload({ waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.storage.mode), 'indexeddb');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.category), 'building', 'old Things selection must migrate without touching the original namespace');
assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('blockfolk-imaginarium.preferences@1'))).category, 'building');

// A legacy pre-art picture migrates to the one square world without deleting its content.
await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app;
  await app.storage.putPicture({
    schema: 'blockfolk-imaginarium.page@1', id: 'legacy-pre-art', title: 'Legacy Pre-Art',
    createdAt: '2026-08-16T00:00:00.000Z', updatedAt: '2026-08-16T00:00:00.000Z',
    page: { width: 1080, height: 1440, backgroundAssetId: null }, ui: { category: 'silly' },
    stickers: [], embeddedAssets: [], promptId: null
  });
  await app.openPicture('legacy-pre-art');
});
assert.deepEqual(await page.evaluate(() => {
  const current = window.BlockFolkImaginarium.app.current;
  return { schema: current.schema, width: current.page.width, height: current.page.height, background: current.page.backgroundAssetId, category: current.ui.category };
}), { schema: 'blockfolk-imaginarium.page@2', width: 4096, height: 4096, background: 'blockfolk-valley', category: 'magic' });

await page.evaluate(() => window.BlockFolkImaginarium.app.startNewPicture(false));
await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await page.evaluate(() => {
  const diagnostic = window.BlockFolkImaginarium.diagnostics();
  return { background: diagnostic.background, stickers: diagnostic.stickers, world: diagnostic.world.size };
}), { background: 'blockfolk-valley', stickers: 0, world: 4096 });
assert.deepEqual(await page.evaluate(() => ({ innerWidth: window.innerWidth, editorWidth: document.querySelector('#editor-screen').getBoundingClientRect().width, canvasWidth: window.BlockFolkImaginarium.diagnostics().world.viewport.width })), { innerWidth: 400, editorWidth: 400, canvasWidth: 380 }, 'portrait world shell must stay inside the 400px viewport');
assert.deepEqual(await delayedCompatibilityTap('[data-action="camera-fit"]'), { physicalActivations: 1, assistiveActivations: 1 }, 'one physical tap must activate once while a genuine assistive click remains available');

const expectedCategories = [
  ['animals', 'Animals'], ['people', 'People'], ['building', 'Building'],
  ['nature', 'Nature'], ['magic', 'Magic'], ['emoji', 'Emoji']
];
assert.deepEqual(await page.locator('#category-tabs [data-category]').evaluateAll((buttons) => buttons.map((button) => [button.dataset.category, button.closest('.sfhs-cf-root')?.textContent.trim()])), expectedCategories);
for (const [id, title] of expectedCategories) {
  const button = page.locator(`#category-tabs [data-category="${id}"]`);
  await button.scrollIntoViewIfNeeded(); await button.click();
  assert.equal(await page.locator('#sticker-strip-title').textContent(), title);
  assert.equal(await page.locator('#sticker-strip-title').getAttribute('data-category'), id);
  assert.equal(await button.evaluate((element) => element.closest('.sfhs-cf-root')?.querySelectorAll('svg.lucide').length), 1, `${title} must use bundled Lucide data`);
  if (id === 'emoji') {
    await page.locator('#emoji-input').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Add Emoji' }).count(), 1);
  } else {
    assert.equal(await page.locator('#sticker-list [data-sticker-id]').count(), 0);
    assert.equal(await page.locator('#sticker-list .empty-strip-message').textContent(), 'BlockFolk are coming soon');
  }
}
assert.equal(await page.locator('[data-category="things"], [data-category="silly"], [data-category="words"]').count(), 0);
const categoryMetrics = await page.locator('#category-tabs [data-category]').evaluateAll((buttons) => ({
  minimumWidth: Math.min(...buttons.map((button) => button.closest('.sfhs-cf-root').getBoundingClientRect().width)),
  minimumHeight: Math.min(...buttons.map((button) => button.closest('.sfhs-cf-root').getBoundingClientRect().height))
}));
assert.ok(categoryMetrics.minimumWidth >= 48 && categoryMetrics.minimumHeight >= 48);

// Exact native Unicode input: reject words, retain full graphemes, and render color glyph pixels.
const emojiInput = page.locator('#emoji-input');
const addEmoji = page.getByRole('button', { name: 'Add Emoji' });
await emojiInput.fill('hello'); await addEmoji.click();
assert.match(await page.locator('#emoji-status').textContent(), /emoji.*not a written word/i);
assert.equal((await stickerState()).length, 0);
const emojiSequences = ['🙂', '❤️', '👍🏽', '👩🏽‍🚀', '🇺🇸', '👨‍👩‍👧‍👦'];
const exportBeforeEmoji = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl());
for (const emoji of emojiSequences) { await emojiInput.fill(emoji); await addEmoji.click(); }
assert.deepEqual((await stickerState()).map((sticker) => sticker.sourceEmoji), emojiSequences);
assert.deepEqual(await page.evaluate(() => window.BlockFolkImaginarium.app.current.embeddedAssets.filter((asset) => asset.kind === 'emoji').map((asset) => asset.glyph)), emojiSequences);
const nativeGlyphProof = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const object = app.canvas.getObjects()[0]; const canvas = object.toCanvasElement();
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; const colors = new Set(); let opaque = 0;
  for (let index = 0; index < pixels.length; index += 4) if (pixels[index + 3] > 32) { opaque += 1; colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`); }
  return { type: object.type, text: object.text, opaque, colors: colors.size, fontFamily: object.fontFamily };
});
assert.equal(nativeGlyphProof.type, 'text'); assert.equal(nativeGlyphProof.text, emojiSequences[0]);
assert.ok(nativeGlyphProof.opaque > 100 && nativeGlyphProof.colors > 3, 'native emoji must paint visible color pixels, not a blank glyph');
const exportAfterEmoji = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl());
assert.notEqual(exportAfterEmoji, exportBeforeEmoji, 'current-view PNG must visibly include native emoji');

// Sticker direct manipulation must not pan the camera.
await page.evaluate(() => { const app = window.BlockFolkImaginarium.app; app.canvas.setActiveObject(app.canvas.getObjects().at(-1)); app.updateSelection(); });
const dragStart = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const object = app.activeSticker(); const transform = app.canvas.viewportTransform;
  return { layerId: object.blockfolkLayerId, x: object.left * transform[0] + transform[4], y: object.top * transform[3] + transform[5] };
});
const cameraBeforeStickerDrag = await cameraState(); const stickersBeforeDrag = await stickerState();
await pointer('pointerdown', 1, dragStart.x, dragStart.y);
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.worldInteraction?.mode), 'sticker', 'pointer-down on a sticker must enter sticker movement immediately');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.worldInteraction?.target?.blockfolkLayerId), dragStart.layerId, 'the touched sticker must own the drag');
await pointer('pointermove', 1, dragStart.x + 42, dragStart.y + 28); await pointer('pointerup', 1, dragStart.x + 42, dragStart.y + 28);
const stickersAfterDrag = await stickerState(); const cameraAfterStickerDrag = await cameraState();
const draggedBefore = stickersBeforeDrag.find((sticker) => sticker.layerId === dragStart.layerId); const draggedAfter = stickersAfterDrag.find((sticker) => sticker.layerId === dragStart.layerId);
assert.notDeepEqual({ x: draggedAfter.x, y: draggedAfter.y }, { x: draggedBefore.x, y: draggedBefore.y });
assert.deepEqual(cameraAfterStickerDrag.camera, cameraBeforeStickerDrag.camera, 'sticker drag must not pan the world');

// Empty-space pan must leave world-space sticker coordinates fixed.
const cameraBeforePan = await cameraState(); const stickerWorldBeforePan = await stickerState();
await pointer('pointerdown', 1, 18, 18); await pointer('pointermove', 1, 68, 44); await pointer('pointerup', 1, 68, 44);
const cameraAfterPan = await cameraState();
assert.notDeepEqual(cameraAfterPan.camera, cameraBeforePan.camera);
assert.deepEqual(await stickerState(), stickerWorldBeforePan, 'camera pan must not rewrite sticker world coordinates');

// Pinch zooms around a stable midpoint and clears all pointer state.
const beforePinch = await cameraState();
const worldAt = (world, x, y) => {
  const fit = Math.min(world.viewport.width / 4096, world.viewport.height / 4096); const scale = fit * world.camera.zoom;
  return { x: world.camera.centerX + (x - world.viewport.width / 2) / scale, y: world.camera.centerY + (y - world.viewport.height / 2) / scale };
};
const pinchAnchorBefore = worldAt(beforePinch, 200, 74);
await pointer('pointerdown', 1, 100, 74); await pointer('pointerdown', 2, 300, 74);
await pointer('pointermove', 1, 60, 74); await pointer('pointermove', 2, 340, 74);
await pointer('pointerup', 1, 60, 74); await pointer('pointerup', 2, 340, 74);
const afterPinch = await cameraState(); const pinchAnchorAfter = worldAt(afterPinch, 200, 74);
assert.ok(afterPinch.camera.zoom > beforePinch.camera.zoom);
assert.ok(Math.abs(pinchAnchorBefore.x - pinchAnchorAfter.x) < 1 && Math.abs(pinchAnchorBefore.y - pinchAnchorAfter.y) < 1, 'pinch midpoint must remain registered to the same world point');
assert.equal(afterPinch.activePointers, 0);
const cameraBeforeCancel = await cameraState();
await pointer('pointerdown', 1, 18, 18); await pointer('pointermove', 1, 88, 68); await pointer('pointercancel', 1, 88, 68);
assert.deepEqual((await cameraState()).camera, cameraBeforeCancel.camera, 'pointer cancellation must restore camera state');
assert.equal((await cameraState()).activePointers, 0, 'pointer cancellation must clear ownership');
await pointer('pointerdown', 1, 18, 18); await pointer('pointermove', 1, 5018, 4018); await pointer('pointerup', 1, 5018, 4018);
const boundedCamera = await cameraState(); const boundedFit = Math.min(boundedCamera.viewport.width, boundedCamera.viewport.height) / 4096; const boundedScale = boundedFit * boundedCamera.camera.zoom;
const halfVisibleWidth = boundedCamera.viewport.width / (2 * boundedScale); const halfVisibleHeight = boundedCamera.viewport.height / (2 * boundedScale);
assert.ok(boundedCamera.camera.centerX >= Math.min(2048, halfVisibleWidth) && boundedCamera.camera.centerX <= Math.max(2048, 4096 - halfVisibleWidth));
assert.ok(boundedCamera.camera.centerY >= Math.min(2048, halfVisibleHeight) && boundedCamera.camera.centerY <= Math.max(2048, 4096 - halfVisibleHeight));

// Accessible camera controls and all five bookmarks operate on the same world.
await page.locator('[data-action="camera-fit"]').click();
assert.deepEqual((await cameraState()).camera, { centerX: 2048, centerY: 2048, zoom: 1 });
await page.locator('[data-action="camera-zoom-in"]').click(); assert.ok((await cameraState()).camera.zoom > 1);
await page.locator('[data-action="camera-zoom-out"]').click(); assert.equal((await cameraState()).camera.zoom, 1);
const locationTitles = ['Coast', 'Mountain Source', 'Forest River', 'Plains Bend', 'World Center'];
const locationIds = ['coast', 'mountain-source', 'forest-river', 'plains-bend', 'world-center'];
for (let locationIndex = 0; locationIndex < locationTitles.length; locationIndex += 1) {
  await page.locator('[data-action="show-world-locations"]').click();
  assert.deepEqual(await page.locator('#location-grid [data-location-id]').evaluateAll((buttons) => buttons.map((button) => button.closest('.sfhs-cf-root').textContent.trim())), locationTitles);
  assert.equal(await page.locator('#location-grid canvas').count(), 5, 'bookmarks must derive runtime previews from the one world');
  if (locationIndex === 0) assert.ok(await page.locator('#location-grid canvas').first().evaluate((canvas) => canvas.toDataURL().length) > 1000, 'runtime bookmark crop must contain pixels from the one world');
  await page.locator(`#location-grid [data-location-id="${locationIds[locationIndex]}"]`).click();
  assert.equal(await page.locator('#world-sheet').getAttribute('hidden'), '');
}
assert.deepEqual((await stickerState()).map((sticker) => sticker.sourceEmoji), emojiSequences, 'bookmarks must not move or delete stickers');

// Emoji stickers keep all applicable image-sticker tools, history, stack, copy, and deletion.
await page.evaluate(() => { const app = window.BlockFolkImaginarium.app; app.canvas.setActiveObject(app.canvas.getObjects()[2]); app.updateSelection(); });
const toolBefore = (await stickerState())[2];
await page.locator('[data-action="bigger"]').click(); await page.locator('[data-action="turn"]').click(); await page.locator('[data-action="flip"]').click();
let toolAfter = (await stickerState())[2];
assert.ok(toolAfter.scaleX > toolBefore.scaleX); assert.equal(toolAfter.angle, 15); assert.equal(toolAfter.flipX, true);
await page.locator('[data-action="undo"]').click(); toolAfter = (await stickerState())[2]; assert.equal(toolAfter.flipX, false);
await page.locator('[data-action="redo"]').click(); toolAfter = (await stickerState())[2]; assert.equal(toolAfter.flipX, true);
const orderBefore = (await stickerState()).map((sticker) => sticker.layerId);
await page.locator('[data-action="behind"]').click(); assert.notDeepEqual((await stickerState()).map((sticker) => sticker.layerId), orderBefore);
await page.locator('[data-action="in-front"]').click(); assert.deepEqual((await stickerState()).map((sticker) => sticker.layerId), orderBefore);
await page.locator('[data-action="copy"]').click(); const copiedCount = (await stickerState()).length; assert.equal(copiedCount, emojiSequences.length + 1);
await page.locator('[data-action="trash"]').click(); assert.equal((await stickerState()).length, copiedCount - 1);
await page.locator('[data-action="undo"]').click(); assert.equal((await stickerState()).length, copiedCount, 'deletion must participate in Undo');

// Local ZIP import and transparent-edge trimming remain operational.
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
await page.locator('#pack-input').setInputFiles({ name: 'local-proof.zip', mimeType: 'application/zip', buffer: Buffer.from(zipBytes) });
await page.waitForFunction(() => window.BlockFolkImaginarium.app.packs.length === 1);
assert.deepEqual(await page.evaluate(() => {
  const asset = window.BlockFolkImaginarium.app.packs[0].assets[0];
  return { category: asset.category, trimStatus: asset.trimStatus, width: asset.width, height: asset.height };
}), { category: 'animals', trimStatus: 'trimmed', width: 32, height: 32 });

// Save/reload restores camera and exact source strings. Puzzle/copy/export still flatten the current framed view.
await page.evaluate(() => window.BlockFolkImaginarium.app.showScreen('editor-screen'));
await page.waitForTimeout(100);
await page.evaluate(() => window.BlockFolkImaginarium.app.openStartingLocation('forest-river'));
await page.waitForTimeout(50);
const beforeSave = await stickerState(); const worldBeforeSave = await cameraState(); const cameraBeforeSave = worldBeforeSave.camera;
const persistenceProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.saveCurrent({ quiet: true }); const id = app.current.id;
  const exportDataUrl = app.exportDataUrl(); const puzzle = await app.flattenPictureForPuzzle(id);
  await app.goHome(); await app.openPicture(id); app.syncCurrentFromCanvas();
  const image = await new Promise((resolvePromise, reject) => { const item = new Image(); item.onload = () => resolvePromise({ width: item.width, height: item.height }); item.onerror = reject; item.src = exportDataUrl; });
  return { id, exportLength: exportDataUrl.length, puzzleLength: puzzle.dataUrl.length, image, camera: app.current.page.camera, runtimeWorld: app.diagnostics().world, emoji: app.current.stickers.map((sticker) => sticker.sourceEmoji).filter(Boolean) };
});
assert.deepEqual(await stickerState(), beforeSave);
assert.deepEqual({ saved: persistenceProof.camera, runtime: persistenceProof.runtimeWorld, before: worldBeforeSave }, { saved: cameraBeforeSave, runtime: worldBeforeSave, before: worldBeforeSave }, 'save/reload must restore the exact camera and viewport framing');
assert.deepEqual(persistenceProof.emoji.slice(0, emojiSequences.length), emojiSequences);
assert.ok(persistenceProof.exportLength > 10000 && persistenceProof.puzzleLength > 10000);
assert.deepEqual(persistenceProof.image, { width: (await cameraState()).viewport.width, height: (await cameraState()).viewport.height }, 'PNG must export the current framed view');

// Orientation changes preserve square-world state and focus, then safely resize the viewport.
const beforeLandscape = { stickers: await stickerState(), camera: (await cameraState()).camera };
await page.screenshot({ path: resolve(evidenceDirectory, 'portrait-400x844.png'), fullPage: true });
await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(150);
const landscape = await cameraState();
assert.equal(landscape.viewport.width > landscape.viewport.height, true);
assert.equal(await page.evaluate(() => document.querySelector('#editor-screen').getBoundingClientRect().width), 844);
assert.deepEqual(await stickerState(), beforeLandscape.stickers);
assert.deepEqual(landscape.camera, beforeLandscape.camera);
await page.screenshot({ path: resolve(evidenceDirectory, 'landscape-844x400.png'), fullPage: true });
await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(150);
assert.deepEqual(await stickerState(), beforeLandscape.stickers);
assert.deepEqual((await cameraState()).camera, beforeLandscape.camera);

const downloadPromise = page.waitForEvent('download');
await page.evaluate(() => window.BlockFolkImaginarium.app.downloadCurrent());
assert.match((await downloadPromise).suggestedFilename(), /^blockfolk-imaginarium-.*\.png$/);

const originalNamespace = await page.evaluate(async () => {
  const preference = localStorage.getItem('the-imaginarium.preferences@1');
  const picture = await new Promise((resolvePromise, reject) => {
    const request = indexedDB.open('the-imaginarium-library-v1', 2); request.onerror = () => reject(request.error);
    request.onsuccess = () => { const db = request.result; const get = db.transaction('pictures', 'readonly').objectStore('pictures').get('original-sentinel'); get.onsuccess = () => { db.close(); resolvePromise(get.result); }; get.onerror = () => reject(get.error); };
  });
  return { preference, picture };
});
assert.equal(JSON.parse(originalNamespace.preference).sentinel, 'original-only');
assert.equal(originalNamespace.picture.title, 'Original Imaginarium only');
assert.deepEqual(runtimeRequests, []);
assert.deepEqual(failures, []);
console.log('BLOCKFOLK_IMAGINARIUM_WORLD_FOUNDATION_BROWSER PASS', JSON.stringify({ categoryMetrics, nativeGlyphProof, persistenceProof, portrait: '400x844', landscape: '844x400', runtimeRequests: 0, evidenceDirectory }));
await browser.close();
