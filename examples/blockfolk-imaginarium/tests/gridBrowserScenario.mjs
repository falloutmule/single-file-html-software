/* global document, indexedDB, MouseEvent, PointerEvent, setTimeout, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(root, 'dist/index.html')).href;
const evidence = resolve(root, process.env.BLOCKFOLK_GRID_EVIDENCE_DIRECTORY || 'test-results/blockfolk-grid-snap-completion-001/browser');
await mkdir(evidence, { recursive: true });
const failures = []; const requests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  requests.push(url); failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage(); const cdp = await context.newCDPSession(page);
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });

const snapSelector = '#selection-toolbar [data-action="snap-context"]';
const LOG = 'sticker-blockfolk-wood-log-block'; const BRICK = 'sticker-blockfolk-brick-stone-block';

async function nativeTouch(x, y, type = 'tap', destination = null) {
  const rect = await page.locator('.upper-canvas').boundingBox(); assert.ok(rect);
  const start = { x: rect.x + x, y: rect.y + y };
  const finish = destination ? { x: rect.x + destination.x, y: rect.y + destination.y } : start;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  if (type === 'drag') for (let step = 1; step <= 5; step += 1) {
    const progress = step / 5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (finish.x - start.x) * progress, y: start.y + (finish.y - start.y) * progress, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function touchControl(selector = snapSelector) {
  const box = await page.locator(selector).boundingBox(); assert.ok(box, `visible control required: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(80);
}

async function physicalTapWithDelayedCompatibilityClick() {
  return page.evaluate(async (selector) => {
    const app = window.BlockFolkImaginarium.app; const control = document.querySelector(selector); const rect = control.getBoundingClientRect();
    const before = app.controls.activationCount;
    const options = { bubbles: true, cancelable: true, pointerId: 77, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    control.dispatchEvent(new PointerEvent('pointerdown', options)); control.dispatchEvent(new PointerEvent('pointerup', { ...options, buttons: 0 }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 60));
    document.elementFromPoint(options.clientX, options.clientY).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: options.clientX, clientY: options.clientY }));
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 30));
    return app.controls.activationCount - before;
  }, snapSelector);
}

async function metrics() {
  return page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; const transform = app.canvas.viewportTransform;
    return app.canvas.getObjects().map((object) => ({
      id: object.blockfolkLayerId, assetId: object.blockfolkAssetId,
      x: Number(object.left || 0) * transform[0] + transform[4], y: Number(object.top || 0) * transform[3] + transform[5],
      width: object.getScaledWidth() * transform[0], height: object.getScaledHeight() * transform[3]
    }));
  });
}

async function dragLayerTo(layerId, destination) {
  const item = (await metrics()).find((entry) => entry.id === layerId); assert.ok(item, `layer required: ${layerId}`);
  await nativeTouch(item.x, item.y, 'drag', destination); await page.waitForTimeout(50);
}

async function addVisible(assetId) {
  const before = (await metrics()).length;
  const button = page.locator(`[data-sticker-id="${assetId}"]`); await button.scrollIntoViewIfNeeded(); await button.click();
  await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 1, before);
  return (await metrics()).at(-1);
}

function intendedOffset(source, target, direction, nudge = { x: 0, y: 0 }) {
  const width = (source.width + target.width) / 2; const height = (source.height + target.height) / 2;
  const vectors = {
    A: { x: -.4 * width, y: -.2 * height },
    B: { x: .4 * width, y: -.2 * height },
    Z: { x: 0, y: -.85 * height }
  };
  return { x: target.x + vectors[direction].x + nudge.x, y: target.y + vectors[direction].y + nudge.y };
}

async function connectByVisibleInteraction(sourceId, targetId, direction, delayedClick = false) {
  const attempts = [{ x: 0, y: 0 }, { x: 3, y: 1 }, { x: -3, y: -1 }, { x: 0, y: 4 }];
  for (const nudge of attempts) {
    const state = await metrics(); const source = state.find((entry) => entry.id === sourceId); const target = state.find((entry) => entry.id === targetId);
    await dragLayerTo(sourceId, intendedOffset(source, target, direction, nudge));
    const before = await page.evaluate(() => ({ edges: window.BlockFolkImaginarium.app.current.connections.length, activations: window.BlockFolkImaginarium.app.controls.activationCount }));
    const activationDelta = delayedClick ? await physicalTapWithDelayedCompatibilityClick() : (await touchControl(), await page.evaluate((value) => window.BlockFolkImaginarium.app.controls.activationCount - value, before.activations));
    const after = await page.evaluate(() => ({ edges: window.BlockFolkImaginarium.app.current.connections.length, toast: document.querySelector('#toast').textContent }));
    if (after.edges === before.edges + 1) { assert.equal(activationDelta, 1, 'one physical-style touch and delayed click create one activation'); assert.equal(after.toast, 'Pieces connected.'); return; }
  }
  assert.fail(`public ${direction} connection failed: ${await page.locator('#toast').textContent()}`);
}

function normalizedPictureState() {
  return page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
    return {
      camera: structuredClone(app.current.page.camera),
      stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex, sourceEmoji }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex, sourceEmoji })).sort((a, b) => a.layerId.localeCompare(b.layerId)),
      connections: structuredClone(app.current.connections).sort((a, b) => a.id.localeCompare(b.id))
    };
  });
}

await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(() => new Promise((resolvePromise, reject) => {
  const request = indexedDB.deleteDatabase('blockfolk-imaginarium-library-v1'); request.onsuccess = () => resolvePromise(); request.onerror = () => reject(request.error); request.onblocked = () => resolvePromise();
}));
await page.reload({ waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
await page.locator('#category-tabs [data-category="building"]').click();
assert.equal(await page.locator('[data-sticker-id]').count(), 6, 'visible Building category retains its accepted six stickers');

const first = await addVisible(LOG); const second = await addVisible(BRICK);
await page.evaluate(() => { const root = document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root'); window.__gridSnapRoot = root; window.__gridSnapControlId = root.dataset.sfhsControlId; });
await connectByVisibleInteraction(second.id, first.id, 'A', true);
const third = await addVisible(LOG); await connectByVisibleInteraction(third.id, first.id, 'B');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length), 2, 'third block joins the existing assembly');
await page.screenshot({ path: resolve(evidence, 'blocks-third-member-400x844.png'), fullPage: true });

const fourth = await addVisible(BRICK); await connectByVisibleInteraction(fourth.id, second.id, 'Z');
const construction = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const edges = app.current.connections;
  const directions = edges.map((edge) => edge.aAnchorId);
  return { edges: edges.length, members: app.selectedMemberIds(app.activeSticker()).size, directions, sameRoot: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root') === window.__gridSnapRoot, controlId: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root').dataset.sfhsControlId };
});
assert.equal(construction.edges, 3); assert.equal(construction.members, 4); assert.equal(construction.sameRoot, true); assert.equal(construction.controlId, await page.evaluate(() => window.__gridSnapControlId));
assert.equal(construction.directions.some((id) => ['northWest', 'southEast'].includes(id)), true, 'public lane creates an A connection');
assert.equal(construction.directions.some((id) => ['northEast', 'southWest'].includes(id)), true, 'public lane creates a B connection/corner');
assert.equal(construction.directions.some((id) => ['stackTop', 'stackBase'].includes(id)), true, 'public lane creates a Z stack');
await page.screenshot({ path: resolve(evidence, 'blocks-corner-stack-400x844.png'), fullPage: true });

await page.locator('[data-action="show-selection-more"]').click();
assert.equal(await page.locator('#selection-more-sheet [data-action="turn"]').isDisabled(), true, 'connected Turn is disabled');
await page.locator('#selection-more-sheet [data-action="close-selection-more"]').click();

const beforeMove = await normalizedPictureState();
const moveMember = (await metrics()).find((entry) => entry.id === third.id); await nativeTouch(moveMember.x, moveMember.y, 'drag', { x: moveMember.x + 28, y: moveMember.y + 14 }); await page.waitForTimeout(80);
const afterMove = await normalizedPictureState();
const deltas = afterMove.stickers.map((sticker) => {
  const before = beforeMove.stickers.find((item) => item.layerId === sticker.layerId); return { x: sticker.x - before.x, y: sticker.y - before.y };
});
assert.ok(deltas.every((delta) => Math.abs(delta.x - deltas[0].x) < .01 && Math.abs(delta.y - deltas[0].y) < .01), 'dragging a non-root member translates the complete assembly once');
await page.screenshot({ path: resolve(evidence, 'blocks-assembly-moved-844x400.png'), fullPage: true });

const persistedBefore = await normalizedPictureState(); await page.locator('[data-action="done-picture"]').click(); await page.locator('#gallery-screen:not([hidden])').waitFor();
await page.locator('[data-gallery-action="edit"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await normalizedPictureState(), persistedBefore, 'public Done, gallery, and Edit restore exact geometry, topology, and camera without re-snapping');
await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(120);
await page.screenshot({ path: resolve(evidence, 'blocks-persisted-844x400.png'), fullPage: true });
await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(120);

const leaf = (await metrics()).find((entry) => entry.id === fourth.id); await nativeTouch(leaf.x, leaf.y); await page.waitForTimeout(60);
const unsnapBefore = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const active = app.activeSticker();
  const immediate = app.current.connections.filter((edge) => edge.aLayerId === active.blockfolkLayerId || edge.bLayerId === active.blockfolkLayerId).length;
  return { edges: app.current.connections.length, immediate, x: active.left, y: active.top, activations: app.controls.activationCount, root: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root') === window.__gridSnapRoot };
});
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Detach selected sticker from its assembly');
await touchControl();
const unsnapAfter = await page.evaluate((before) => {
  const app = window.BlockFolkImaginarium.app; const active = app.activeSticker(); const root = document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root');
  return { edges: app.current.connections.length, x: active.left, y: active.top, activationDelta: app.controls.activationCount - before, toast: document.querySelector('#toast').textContent, sameRoot: root === window.__gridSnapRoot, state: root.dataset.contextState };
}, unsnapBefore.activations);
assert.equal(unsnapAfter.edges, unsnapBefore.edges - unsnapBefore.immediate); assert.ok(unsnapBefore.immediate >= 1); assert.equal(unsnapAfter.x, unsnapBefore.x); assert.equal(unsnapAfter.y, unsnapBefore.y); assert.equal(unsnapAfter.activationDelta, 1); assert.equal(unsnapAfter.toast, 'Sticker detached.'); assert.equal(unsnapAfter.sameRoot, true); assert.equal(unsnapAfter.state, 'snap');
await page.screenshot({ path: resolve(evidence, 'blocks-unsnapped-400x844.png'), fullPage: true });

// Occupied and ambiguous failures use only visible additions, real drags, and
// the public Snap control. The assertions inspect state but never inject poses.
await page.locator('[data-action="go-home"]').first().click(); await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#category-tabs [data-category="building"]').click();
const occupiedTarget = await addVisible(LOG); const occupiedNeighbor = await addVisible(BRICK); await connectByVisibleInteraction(occupiedNeighbor.id, occupiedTarget.id, 'A');
const occupiedMoving = await addVisible(LOG); const occupiedNeighborPosition = (await metrics()).find((entry) => entry.id === occupiedNeighbor.id);
await dragLayerTo(occupiedMoving.id, { x: occupiedNeighborPosition.x, y: occupiedNeighborPosition.y });
const occupiedBefore = await normalizedPictureState(); await touchControl();
assert.deepEqual(await normalizedPictureState(), occupiedBefore); assert.equal(await page.locator('#toast').textContent(), 'That spot is full.');

await page.locator('[data-action="go-home"]').first().click(); await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#category-tabs [data-category="building"]').click();
const rightTarget = await addVisible(LOG); await dragLayerTo(rightTarget.id, { x: 120, y: 420 });
const leftTarget = await addVisible(BRICK); await dragLayerTo(leftTarget.id, { x: 280, y: 420 });
const tiedMoving = await addVisible(LOG); await dragLayerTo(tiedMoving.id, { x: 200, y: 360 });
const tiedMetrics = await metrics(); const movingMetric = tiedMetrics.find((entry) => entry.id === tiedMoving.id); const rightMetric = tiedMetrics.find((entry) => entry.id === rightTarget.id);
const horizontal = .4 * ((movingMetric.width + rightMetric.width) / 2); const vertical = .2 * ((movingMetric.height + rightMetric.height) / 2);
await dragLayerTo(rightTarget.id, { x: movingMetric.x + horizontal + 10, y: movingMetric.y + vertical });
await dragLayerTo(leftTarget.id, { x: movingMetric.x - horizontal - 10, y: movingMetric.y + vertical });
await nativeTouch(movingMetric.x, movingMetric.y); await page.waitForTimeout(40);
const ambiguousBefore = await normalizedPictureState(); await touchControl();
assert.deepEqual(await normalizedPictureState(), ambiguousBefore); assert.equal(await page.locator('#toast').textContent(), 'Move closer to the spot you want.');

assert.deepEqual(failures, [], failures.join('\n')); assert.deepEqual(requests, []);
await browser.close();
console.log('BLOCKFOLK_GRID_BROWSER_SCENARIO PASS', JSON.stringify({ members: 4, edges: 3, persistence: 'exact', occupied: 'atomic', ambiguous: 'atomic', requests: requests.length, evidence }));
