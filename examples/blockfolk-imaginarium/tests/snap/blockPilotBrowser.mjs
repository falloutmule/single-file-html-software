/* global document, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../../../packages/browser-runner/node_modules/playwright/index.mjs';

const productRoot = resolve(import.meta.dirname, '../..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(productRoot, 'dist/index.html')).href;
const evidenceRoot = resolve(productRoot, process.env.BLOCKFOLK_BLOCK_PILOT_EVIDENCE || 'test-results/snapping-block-pilot-phase3');
await mkdir(evidenceRoot, { recursive: true });
const failures = []; const unexpectedRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/u.test(url)) return route.continue();
  unexpectedRequests.push(url); return route.abort('blockedbyclient');
});
const page = await context.newPage(); const cdp = await context.newCDPSession(page);
page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

async function tap(selector) {
  const locator = page.locator(selector).first(); await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox();
  assert.ok(box, `visible touch target required: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function dragPoint(start, dx, dy) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  for (let step = 1; step <= 5; step += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + dx * step / 5, y: start.y + dy * step / 5, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function objectScreenPoint(index) {
  return page.evaluate((objectIndex) => {
    const app = window.BlockFolkImaginarium.app; const object = app.canvas.getObjects()[objectIndex]; const transform = app.canvas.viewportTransform;
    const bounds = app.canvas.upperCanvasEl.getBoundingClientRect();
    return { x: bounds.left + object.left * transform[0] + object.top * transform[2] + transform[4], y: bounds.top + object.left * transform[1] + object.top * transform[3] + transform[5] };
  }, index);
}

const state = () => page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
  return {
    stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex })),
    connections: structuredClone(app.current.connections),
    controller: (() => { const control = document.querySelector('[data-action="snap-context"]'); const root = control.closest('.sfhs-cf-root'); return { node: root, id: root.dataset.sfhsControlId, state: root.dataset.contextState, label: control.getAttribute('aria-label') }; })(),
    activationCount: app.controls.activationCount,
    toast: document.querySelector('#toast').textContent
  };
});

async function beginBuilding() {
  await tap('[data-action="new-picture"]'); await page.locator('#editor-screen:not([hidden])').waitFor();
  await tap('[data-category="building"]');
}

async function addVisible(assetId) {
  const before = await page.evaluate(() => window.BlockFolkImaginarium.app.canvas.getObjects().length);
  await tap(`[data-sticker-id="${assetId}"]`);
  await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 1, before);
}

try {
  await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
  await beginBuilding();
  await addVisible('sticker-blockfolk-brick-stone-block'); await addVisible('sticker-blockfolk-brick-stone-block');
  let proof = await state();
  assert.equal(proof.connections.length, 0, 'catalog insertion must never auto-connect blocks');
  const expectedBrickScale = (420 / (1.1 ** 10)) / 325;
  assert.equal(proof.stickers.every((sticker) => Math.abs(sticker.scaleX - expectedBrickScale) < 1e-12), true, 'Brick must insert at reviewed canonical construction scale');
  await page.locator('[data-action="snap-context"]').evaluate((control) => { window.__phase3SnapRoot = control.closest('.sfhs-cf-root'); });
  const controllerId = proof.controller.id; const activationBefore = proof.activationCount;

  const freeStart = await objectScreenPoint(1); await dragPoint(freeStart, 3, 0);
  proof = await state(); assert.equal(proof.connections.length, 0, 'ordinary touch drag must remain free with no automatic snap');
  await tap('[data-action="snap-context"]'); await page.waitForTimeout(900);
  proof = await state();
  assert.equal(proof.connections.length, 1, 'one deliberate touch must create one edge');
  assert.equal(proof.connections[0].schemaVersion, 1); assert.deepEqual([proof.connections[0].aPortId, proof.connections[0].bPortId], ['wallLeft', 'wallRight']);
  assert.equal(proof.activationCount - activationBefore, 1, 'delayed browser click must not activate the stable controller twice');
  assert.equal(proof.controller.id, controllerId); assert.equal(proof.controller.state, 'unsnap');
  assert.equal(await page.locator('[data-action="snap-context"]').evaluate((control) => control.closest('.sfhs-cf-root') === window.__phase3SnapRoot), true, 'Snap/Unsnap must retain one DOM node');
  assert.equal(proof.toast, 'Blocks connected');
  await page.screenshot({ path: resolve(evidenceRoot, 'brick-horizontal-connected-400x844.png'), fullPage: true });

  const beforeMove = proof.stickers.map(({ x, y }) => ({ x, y }));
  await dragPoint(await objectScreenPoint(0), 30, 16); proof = await state();
  const firstDeltas = proof.stickers.map((sticker, index) => ({ x: sticker.x - beforeMove[index].x, y: sticker.y - beforeMove[index].y }));
  assert.ok(Math.hypot(firstDeltas[0].x, firstDeltas[0].y) > 1); assert.ok(Math.abs(firstDeltas[0].x - firstDeltas[1].x) < .01 && Math.abs(firstDeltas[0].y - firstDeltas[1].y) < .01, 'dragging either member must move the complete component');
  const beforeSecondMove = proof.stickers.map(({ x, y }) => ({ x, y }));
  await dragPoint(await objectScreenPoint(1), -18, 12); proof = await state();
  const secondDeltas = proof.stickers.map((sticker, index) => ({ x: sticker.x - beforeSecondMove[index].x, y: sticker.y - beforeSecondMove[index].y }));
  assert.ok(Math.abs(secondDeltas[0].x - secondDeltas[1].x) < .01 && Math.abs(secondDeltas[0].y - secondDeltas[1].y) < .01);
  await page.screenshot({ path: resolve(evidenceRoot, 'brick-component-moved-400x844.png'), fullPage: true });

  const scaleBefore = proof.stickers.map(({ scaleX }) => scaleX);
  await tap('[data-action="show-selection-more"]'); assert.equal(await page.locator('#selection-more-sheet [data-action="turn"]').isDisabled(), true, 'free rotation is unavailable for the typed wall component');
  await tap('#selection-more-sheet [data-action="bigger"]'); await tap('[data-action="close-selection-more"]');
  proof = await state(); assert.equal(proof.stickers.every((sticker, index) => sticker.scaleX > scaleBefore[index]), true);
  await tap('[data-action="flip"]'); proof = await state();
  assert.equal(proof.connections.length, 1); assert.equal(proof.connections[0].plane, 'wall-iso-b');
  assert.equal(proof.stickers.every(({ flipX, angle }) => flipX && angle === 0), true, 'Flip must mirror the complete component without changing rotation');
  await page.screenshot({ path: resolve(evidenceRoot, 'brick-component-flipped-400x844.png'), fullPage: true });

  await page.locator('#toast').waitFor({ state: 'hidden' });
  await addVisible('sticker-blockfolk-stone-door');
  await dragPoint(await objectScreenPoint(0), 0, 0);
  const depthBeforeState = await state(); const orderBeforeDepth = depthBeforeState.stickers.map(({ layerId }) => layerId);
  const componentIds = new Set([depthBeforeState.connections[0].aLayerId, depthBeforeState.connections[0].bLayerId]);
  const internalOrder = orderBeforeDepth.filter((layerId) => componentIds.has(layerId));
  await tap('[data-action="behind"]'); proof = await state();
  const behindOrder = proof.stickers.map(({ layerId }) => layerId); const behindIndices = behindOrder.map((layerId, index) => componentIds.has(layerId) ? index : -1).filter((index) => index >= 0);
  assert.notDeepEqual(behindOrder, orderBeforeDepth, 'Behind must observably move the typed component one group layer');
  assert.equal(behindIndices[1] - behindIndices[0], 1, 'Behind must keep the typed component contiguous');
  assert.deepEqual(behindOrder.filter((layerId) => componentIds.has(layerId)), internalOrder, 'Behind must preserve internal component order');
  await tap('[data-action="in-front"]'); proof = await state(); assert.deepEqual(proof.stickers.map(({ layerId }) => layerId), orderBeforeDepth, 'In Front must restore the exact component order');
  await dragPoint(await objectScreenPoint(0), 0, 0); await tap('[data-action="trash"]'); await page.waitForFunction(() => window.BlockFolkImaginarium.app.canvas.getObjects().length === 2);
  await dragPoint(await objectScreenPoint(0), 0, 0);

  const pictureId = await page.evaluate(() => window.BlockFolkImaginarium.app.current.id);
  await tap('[data-action="done-picture"]'); await page.locator('#gallery-screen:not([hidden])').waitFor();
  await tap(`[data-gallery-action="edit"][data-picture-id="${pictureId}"]`); await page.locator('#editor-screen:not([hidden])').waitFor();
  proof = await state(); assert.equal(proof.connections.length, 1); assert.equal(proof.connections[0].plane, 'wall-iso-b');
  assert.equal(proof.stickers.length, 2, 'save/reload must preserve every pilot member');
  await dragPoint(await objectScreenPoint(0), 0, 0);

  const countBeforeCopy = proof.stickers.length; await tap('[data-action="copy"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count * 2, countBeforeCopy); proof = await state();
  assert.equal(proof.stickers.length, countBeforeCopy * 2); assert.equal(proof.connections.length, 2); assert.equal(new Set(proof.connections.map(({ id }) => id)).size, 2);
  await tap('[data-action="trash"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count, countBeforeCopy); proof = await state(); assert.equal(proof.stickers.length, countBeforeCopy); assert.equal(proof.connections.length, 1);
  await tap('[data-action="undo"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count * 2, countBeforeCopy); proof = await state(); assert.equal(proof.stickers.length, countBeforeCopy * 2); assert.equal(proof.connections.length, 2);
  await tap('[data-action="redo"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count, countBeforeCopy); proof = await state(); assert.equal(proof.stickers.length, countBeforeCopy); assert.equal(proof.connections.length, 1);

  await dragPoint(await objectScreenPoint(0), 0, 0); proof = await state();
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(100); const landscapeProof = await state();
  assert.deepEqual(landscapeProof.stickers, proof.stickers, 'orientation change must not alter world-space sticker state');
  assert.deepEqual(landscapeProof.connections, proof.connections, 'orientation change must not alter typed graph state');
  await page.screenshot({ path: resolve(evidenceRoot, 'brick-component-persisted-844x400.png'), fullPage: true });
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(100);

  await dragPoint(await objectScreenPoint(0), 0, 0);
  const unsnapBefore = await state(); await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); proof = await state();
  assert.equal(proof.connections.length, 0); assert.equal(proof.controller.id, controllerId); assert.equal(proof.controller.state, 'snap');
  assert.equal(proof.activationCount - unsnapBefore.activationCount, 1); assert.equal(proof.toast, 'Sticker detached.');
  await page.screenshot({ path: resolve(evidenceRoot, 'brick-deliberately-detached-400x844.png'), fullPage: true });
  await tap('[data-action="undo"]'); assert.equal((await state()).connections.length, 1); await tap('[data-action="redo"]'); assert.equal((await state()).connections.length, 0);

  await tap('[data-action="go-home"]'); await page.locator('#home-screen:not([hidden])').waitFor(); await beginBuilding();
  await page.locator('#toast').waitFor({ state: 'hidden' });
  await addVisible('sticker-blockfolk-wood-log-block'); await addVisible('sticker-blockfolk-wood-log-block');
  const logScale = (420 / (1.1 ** 10)) / 326; proof = await state();
  assert.equal(proof.stickers.every((sticker) => Math.abs(sticker.scaleX - logScale) < 1e-12), true, 'Log must insert at canonical construction scale');
  await dragPoint(await objectScreenPoint(1), -10, 0); assert.equal((await state()).connections.length, 0);
  await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); proof = await state();
  assert.equal(proof.connections.length, 1); assert.deepEqual([proof.connections[0].aPortId, proof.connections[0].bPortId], ['stackTop', 'stackBase']);
  await page.screenshot({ path: resolve(evidenceRoot, 'log-vertical-connected-400x844.png'), fullPage: true });
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(100);
  await page.screenshot({ path: resolve(evidenceRoot, 'log-vertical-connected-844x400.png'), fullPage: true });
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(100);
  const logPictureId = await page.evaluate(() => window.BlockFolkImaginarium.app.current.id);
  await tap('[data-action="done-picture"]'); await page.locator('#gallery-screen:not([hidden])').waitFor(); await page.locator('#toast').waitFor({ state: 'hidden' });
  const downloadPromise = page.waitForEvent('download'); await tap(`[data-gallery-action="download"][data-picture-id="${logPictureId}"]`); const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^blockfolk-imaginarium-.*\.png$/u); assert.equal(await download.failure(), null, 'visible PNG export must complete for a typed assembly');
  await page.locator('#toast').waitFor({ state: 'hidden' }); await tap(`[data-gallery-action="puzzle"][data-picture-id="${logPictureId}"]`);
  await page.locator('#puzzle-frame-screen:not([hidden])').waitFor(); assert.equal(await page.locator('#puzzle-frame-canvas').isVisible(), true, 'typed assembly picture must remain valid puzzle input');
} finally {
  await context.close(); await browser.close();
}

assert.deepEqual(failures, [], 'pilot browser run must have zero page/console errors');
assert.deepEqual(unexpectedRequests, [], 'pilot browser run must have zero unexpected network requests');
console.log('BLOCKFOLK_BLOCK_PILOT_BROWSER PASS', JSON.stringify({ artifactUrl, screenshots: 7, unexpectedRequests: 0, errors: 0 }));
