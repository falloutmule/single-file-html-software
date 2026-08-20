/* global document, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../../../packages/browser-runner/node_modules/playwright/index.mjs';

const productRoot = resolve(import.meta.dirname, '../..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(productRoot, 'dist/index.html')).href;
const evidenceRoot = resolve(productRoot, process.env.BLOCKFOLK_DOORWAY_EVIDENCE || 'test-results/snapping-doorway-final');
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
  for (let step = 1; step <= 6; step += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + dx * step / 6, y: start.y + dy * step / 6, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function objectScreenPoint(layerId) {
  return page.evaluate((id) => {
    const app = window.BlockFolkImaginarium.app; const object = app.canvas.getObjects().find((item) => item.blockfolkLayerId === id); const transform = app.canvas.viewportTransform;
    const bounds = app.canvas.upperCanvasEl.getBoundingClientRect();
    return { x: bounds.left + object.left * transform[0] + object.top * transform[2] + transform[4], y: bounds.top + object.left * transform[1] + object.top * transform[3] + transform[5] };
  }, layerId);
}

async function dragLayerToOffset(layerId, anchorLayerId, offset) {
  const start = await objectScreenPoint(layerId); const anchor = await objectScreenPoint(anchorLayerId);
  await dragPoint(start, anchor.x + offset.x - start.x, anchor.y + offset.y - start.y);
}

const state = () => page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
  return {
    stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex })),
    connections: structuredClone(app.current.connections), formations: structuredClone(app.currentFormationStates()),
    toast: document.querySelector('#toast').textContent,
    controller: (() => { const control = document.querySelector('[data-action="snap-context"]'); const root = control.closest('.sfhs-cf-root'); return { id: root.dataset.sfhsControlId, state: root.dataset.contextState }; })(),
    activationCount: app.controls.activationCount
  };
});

async function beginBuilding() {
  await tap('[data-action="new-picture"]'); await page.locator('#editor-screen:not([hidden])').waitFor(); await tap('[data-category="building"]');
}

async function addVisible(assetId) {
  const before = await state(); const beforeIds = new Set(before.stickers.map(({ layerId }) => layerId));
  await tap(`[data-sticker-id="${assetId}"]`);
  await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 1, before.stickers.length);
  const after = await state(); return after.stickers.find(({ layerId }) => !beforeIds.has(layerId)).layerId;
}

async function snapSelected(expectedProgress) {
  const before = await state(); const proposal = await page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; const active = app.activeSticker(); const members = app.objectsForMemberIds(app.selectedMemberIds(active));
    const result = app.proposeTypedSnap(members);
    return result ? { rejectionReason: result.rejectionReason, candidate: result.candidate && { movingLayerId: result.candidate.movingLayerId, movingPortId: result.candidate.movingPortId, targetLayerId: result.candidate.targetLayerId, targetPortId: result.candidate.targetPortId, screenDistance: result.candidate.screenDistance }, poses: result.poses?.slice(0, 5).map((pose) => ({ movingLayerId: pose.movingLayerId, movingPortId: pose.movingPortId, targetLayerId: pose.targetLayerId, targetPortId: pose.targetPortId, screenDistance: pose.screenDistance })) } : null;
  }); await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); const after = await state();
  assert.equal(after.connections.length, before.connections.length + 1, `one deliberate Snap must add exactly one edge; proposal=${JSON.stringify(proposal)}; beforeConnections=${JSON.stringify(before.connections)}; toast=${after.toast}; stickers=${JSON.stringify(after.stickers)}`);
  assert.equal(after.activationCount - before.activationCount, 1, 'one physical touch must activate exactly once');
  assert.equal(after.controller.id, before.controller.id, 'the contextual controller ID must remain stable');
  assert.equal(after.controller.state, 'unsnap');
  assert.equal(after.formations[0]?.occupiedRequiredSlots.length, expectedProgress);
  return after;
}

// Manually reviewed CSS-pixel placement fixture. It is intentionally independent
// of production pitch/rise exports and drives only real touch movement.
const FRAME_OFFSETS = Object.freeze({
  lowerLeft: Object.freeze({ x: -12, y: 9 }), lowerRight: Object.freeze({ x: 12, y: 23 }),
  upperLeft: Object.freeze({ x: -12, y: -7 }), upperRight: Object.freeze({ x: 12, y: 7 }),
  lintel: Object.freeze({ x: 0, y: -16 })
});

async function startFreshBuilding() {
  await tap('[data-action="go-home"]'); await page.locator('#home-screen:not([hidden])').waitFor(); await beginBuilding();
  await page.locator('#toast').waitFor({ state: 'hidden' });
}

async function screenshotBoth(baseName) {
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(120);
  await page.screenshot({ path: resolve(evidenceRoot, `${baseName}-400x844.png`), fullPage: true });
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(120);
  await page.screenshot({ path: resolve(evidenceRoot, `${baseName}-844x400.png`), fullPage: true });
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(120);
}

async function buildPlacedDoorway(blockAssetId, doorAssetId, { wallFirst = false } = {}) {
  const lowerLeft = await addVisible(blockAssetId); const members = { lowerLeft };
  if (wallFirst) {
    for (const [name, offset] of Object.entries({
      lowerRight: { x: 24, y: 14 }, upperLeft: { x: 0, y: -16 }, upperRight: { x: 24, y: -2 }, lintel: { x: 12, y: -25 }
    })) {
      members[name] = await addVisible(blockAssetId); await dragLayerToOffset(members[name], lowerLeft, offset);
    }
  }
  const door = await addVisible(doorAssetId); members.door = door;
  await dragLayerToOffset(door, lowerLeft, { x: -FRAME_OFFSETS.lowerLeft.x, y: -FRAME_OFFSETS.lowerLeft.y });
  await snapSelected(1);
  if (wallFirst) {
    let progress = 1;
    const selectionOffsets = { lowerLeft: { x: -8, y: 8 }, lowerRight: { x: 8, y: 8 }, upperLeft: { x: -8, y: -8 }, upperRight: { x: 8, y: -8 }, lintel: { x: 0, y: -8 } };
    while (progress < 5) {
      const current = await state();
      const connected = new Set(current.formations[0]?.componentLayerIds || []);
      const nextName = ['lowerLeft', 'lowerRight', 'upperLeft', 'upperRight', 'lintel'].find((name) => !connected.has(members[name]));
      assert.ok(nextName, 'wall-first doorway must retain a free visible frame member until all five slots are connected');
      const point = await objectScreenPoint(members[nextName]); const offset = selectionOffsets[nextName];
      await dragPoint({ x: point.x + offset.x, y: point.y + offset.y }, 0, 0);
      assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker()?.blockfolkLayerId), members[nextName], `wall-first ${nextName} must be selected through visible artwork`);
      await snapSelected(++progress);
    }
  } else {
    for (const [name, offset] of Object.entries({ lowerRight: FRAME_OFFSETS.lowerRight, upperLeft: FRAME_OFFSETS.upperLeft, upperRight: FRAME_OFFSETS.upperRight, lintel: FRAME_OFFSETS.lintel })) {
      members[name] = await addVisible(blockAssetId); await dragLayerToOffset(members[name], door, offset);
      await snapSelected(Object.keys(members).length - 1);
    }
  }
  return members;
}

try {
  await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor(); await beginBuilding();
  const lowerLeft = await addVisible('sticker-blockfolk-brick-stone-block');
  const door = await addVisible('sticker-blockfolk-stone-door');
  await dragLayerToOffset(door, lowerLeft, { x: -FRAME_OFFSETS.lowerLeft.x, y: -FRAME_OFFSETS.lowerLeft.y });
  let proof = await state(); assert.equal(proof.connections.length, 0, 'door movement must never auto-connect');
  await screenshotBoth('01-unsnapped-door-near-block');
  const doorScale = (73.1 * 2) / (398 - 25);
  assert.ok(Math.abs(proof.stickers.find(({ layerId }) => layerId === door).scaleX - doorScale) < 1e-12, 'Stone Door must insert at its authored one-by-two scale');
  proof = await snapSelected(1); assert.equal(proof.toast, 'Doorway 1 of 5');
  await page.screenshot({ path: resolve(evidenceRoot, 'stone-doorway-partial-1-brick-400x844.png'), fullPage: true });

  const lowerRight = await addVisible('sticker-blockfolk-brick-stone-block');
  await dragLayerToOffset(lowerRight, door, FRAME_OFFSETS.lowerRight); proof = await snapSelected(2);
  assert.equal(proof.toast, 'Doorway 2 of 5');
  await page.screenshot({ path: resolve(evidenceRoot, 'stone-doorway-partial-2-brick-400x844.png'), fullPage: true });

  const upperLeft = await addVisible('sticker-blockfolk-brick-stone-block');
  await dragLayerToOffset(upperLeft, door, FRAME_OFFSETS.upperLeft); await snapSelected(3);
  const upperRight = await addVisible('sticker-blockfolk-brick-stone-block');
  await dragLayerToOffset(upperRight, door, FRAME_OFFSETS.upperRight); await snapSelected(4);
  await page.screenshot({ path: resolve(evidenceRoot, 'stone-doorway-partial-4-brick-400x844.png'), fullPage: true });

  const lintel = await addVisible('sticker-blockfolk-brick-stone-block');
  await dragLayerToOffset(lintel, door, FRAME_OFFSETS.lintel); proof = await snapSelected(5);
  assert.equal(proof.formations[0].status, 'complete'); assert.equal(proof.toast, 'Doorway complete'); assert.equal(proof.connections.length, 5);
  assert.equal(new Set(proof.connections.map(({ id }) => id)).size, 5); assert.equal(proof.formations[0].reservedViolations.length, 0);
  await screenshotBoth('02-completed-brick-doorway');

  const beforeDoorMove = new Map(proof.stickers.map(({ layerId, x, y }) => [layerId, { x, y }]));
  await dragPoint(await objectScreenPoint(door), 22, -18); proof = await state();
  const deltas = proof.stickers.map((sticker) => ({ x: sticker.x - beforeDoorMove.get(sticker.layerId).x, y: sticker.y - beforeDoorMove.get(sticker.layerId).y }));
  assert.ok(deltas.every((delta) => Math.abs(delta.x - deltas[0].x) < .01 && Math.abs(delta.y - deltas[0].y) < .01), 'dragging the door must move all six members rigidly');
  await screenshotBoth('04-assembly-moved-by-door');
  const beforeBlockMove = new Map(proof.stickers.map(({ layerId, x, y }) => [layerId, { x, y }]));
  await dragPoint(await objectScreenPoint(lowerRight), -20, 12); proof = await state();
  const blockDeltas = proof.stickers.map((sticker) => ({ x: sticker.x - beforeBlockMove.get(sticker.layerId).x, y: sticker.y - beforeBlockMove.get(sticker.layerId).y }));
  assert.ok(blockDeltas.every((delta) => Math.abs(delta.x - blockDeltas[0].x) < .01 && Math.abs(delta.y - blockDeltas[0].y) < .01), 'dragging a jamb must move all six members rigidly');
  await screenshotBoth('05-assembly-moved-by-block');

  await tap('[data-action="flip"]'); proof = await state(); assert.equal(proof.formations[0].status, 'complete');
  assert.equal(proof.connections.every(({ plane }) => plane === 'wall-iso-b'), true);
  await page.screenshot({ path: resolve(evidenceRoot, 'stone-doorway-flipped-400x844.png'), fullPage: true });

  const pictureId = await page.evaluate(() => window.BlockFolkImaginarium.app.current.id);
  await tap('[data-action="done-picture"]'); await page.locator('#gallery-screen:not([hidden])').waitFor();
  await tap(`[data-gallery-action="edit"][data-picture-id="${pictureId}"]`); await page.locator('#editor-screen:not([hidden])').waitFor();
  proof = await state(); assert.equal(proof.connections.length, 5); assert.equal(proof.formations[0].status, 'complete');
  const exportProof = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl());
  assert.ok(exportProof.startsWith('data:image/png;base64,') && exportProof.length > 100000, 'PNG export must include the production world and doorway');
  const puzzleProof = await page.evaluate(async (id) => window.BlockFolkImaginarium.app.flattenPictureForPuzzle(id), pictureId);
  assert.ok(puzzleProof.dataUrl.startsWith('data:image/png;base64,') && puzzleProof.dataUrl.length > 100000, 'the connected doorway must remain valid puzzle input');
  proof = await state(); assert.equal(proof.connections.length, 5); assert.equal(proof.formations[0].status, 'complete');
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(120);
  const landscape = await state(); assert.deepEqual(landscape.connections, proof.connections); assert.deepEqual(landscape.formations, proof.formations);
  await page.screenshot({ path: resolve(evidenceRoot, 'stone-doorway-complete-brick-844x400.png'), fullPage: true });
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(120);

  await dragPoint(await objectScreenPoint(lowerLeft), 0, 0); const beforeUnsnap = await state();
  await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); proof = await state();
  assert.equal(beforeUnsnap.connections.length - proof.connections.length, 1); assert.equal(proof.toast, 'Sticker detached.');
  assert.equal(proof.formations[0].occupiedRequiredSlots.length, 4); assert.equal(proof.controller.id, beforeUnsnap.controller.id);
  await screenshotBoth('06-deliberately-unsnapped-member');
  await tap('[data-action="undo"]'); await page.waitForFunction(() => window.BlockFolkImaginarium.app.current?.connections?.length === 5 && window.BlockFolkImaginarium.app.currentFormationStates().length === 1);
  proof = await state(); assert.equal(proof.connections.length, 5); assert.equal(proof.formations[0].status, 'complete');
  await tap('[data-action="redo"]'); await page.waitForFunction(() => window.BlockFolkImaginarium.app.current?.connections?.length === 4);
  proof = await state(); assert.equal(proof.connections.length, 4);

  await tap('[data-action="undo"]'); await page.waitForFunction(() => window.BlockFolkImaginarium.app.current?.connections?.length === 5 && window.BlockFolkImaginarium.app.currentFormationStates()[0]?.status === 'complete');
  await dragPoint(await objectScreenPoint(door), 0, 0); proof = await state();
  const componentIds = new Set(proof.formations[0].componentLayerIds); const order = proof.stickers.map(({ layerId }) => layerId);
  const componentIndices = order.map((layerId, index) => componentIds.has(layerId) ? index : -1).filter((index) => index >= 0);
  assert.equal(componentIndices.every((index, position) => position === 0 || index === componentIndices[position - 1] + 1), true, 'doorway must remain a contiguous layer group');
  const beforeCopyCount = proof.stickers.length; await tap('[data-action="copy"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 6, beforeCopyCount);
  proof = await state(); assert.equal(proof.connections.length, 10); assert.equal(new Set(proof.connections.map(({ id }) => id)).size, 10);
  await tap('[data-action="trash"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count, beforeCopyCount);
  proof = await state(); assert.equal(proof.connections.length, 5);
  await tap('[data-action="undo"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 6, beforeCopyCount);
  assert.equal((await state()).connections.length, 10);
  await tap('[data-action="redo"]'); await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count, beforeCopyCount);

  await startFreshBuilding();
  const logDoorway = await buildPlacedDoorway('sticker-blockfolk-wood-log-block', 'sticker-blockfolk-stone-door');
  proof = await state(); assert.equal(proof.formations[0].status, 'complete'); assert.equal(proof.connections.length, 5);
  await screenshotBoth('03-completed-log-doorway');
  assert.ok(logDoorway.door && logDoorway.lintel);

  await startFreshBuilding();
  const wallFirst = await buildPlacedDoorway('sticker-blockfolk-brick-stone-block', 'sticker-blockfolk-wood-door', { wallFirst: true });
  proof = await state(); assert.equal(proof.formations[0].status, 'complete'); assert.equal(proof.connections.length, 5, 'wall-first placement must still record one deliberate edge per press');
  await page.screenshot({ path: resolve(evidenceRoot, 'wood-doorway-wall-first-brick-400x844.png'), fullPage: true });
  assert.ok(wallFirst.door && wallFirst.lintel);

  await startFreshBuilding();
  const host = await addVisible('sticker-blockfolk-brick-stone-block'); const squareWindow = await addVisible('sticker-blockfolk-square-window');
  await dragLayerToOffset(squareWindow, host, { x: 6, y: 4 });
  const windowBefore = await state(); await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); proof = await state();
  assert.equal(proof.connections.length, windowBefore.connections.length + 1); assert.deepEqual([proof.connections[0].aPortId, proof.connections[0].bPortId], ['wallMount', 'wallFace']);
  assert.equal(proof.formations.length, 0); assert.ok(proof.stickers.find(({ layerId }) => layerId === squareWindow).zIndex > proof.stickers.find(({ layerId }) => layerId === host).zIndex, 'window must render in front of its host block');
  await page.screenshot({ path: resolve(evidenceRoot, 'square-window-mounted-400x844.png'), fullPage: true });

  await startFreshBuilding();
  const roundHost = await addVisible('sticker-blockfolk-wood-log-block'); const roundWindow = await addVisible('sticker-blockfolk-round-window');
  await dragLayerToOffset(roundWindow, roundHost, { x: 6, y: 4 });
  const roundBefore = await state(); await tap('[data-action="snap-context"]'); await page.waitForTimeout(900); proof = await state();
  assert.equal(proof.connections.length, roundBefore.connections.length + 1);
  assert.deepEqual([proof.connections[0].aPortId, proof.connections[0].bPortId], ['wallMount', 'wallFace']);
  assert.ok(proof.stickers.find(({ layerId }) => layerId === roundWindow).zIndex > proof.stickers.find(({ layerId }) => layerId === roundHost).zIndex, 'Round Window must render in front of its Log host');
} finally {
  await context.close(); await browser.close();
}

assert.deepEqual(failures, [], 'doorway browser run must have zero page/console errors');
assert.deepEqual(unexpectedRequests, [], 'doorway browser run must have zero unexpected network requests');
console.log('BLOCKFOLK_DOORWAY_BROWSER PASS', JSON.stringify({ artifactUrl, requiredVisualScreenshots: 12, additionalScreenshots: 7, windows: ['square', 'round'], pngExport: true, puzzleInput: true, unexpectedRequests: 0, errors: 0 }));
