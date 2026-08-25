/* global document, indexedDB, MouseEvent, PointerEvent, setTimeout, structuredClone, window */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
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
const ACCEPTED_CANONICAL_EXTENT = 420 / (1.1 ** 10); const ACCEPTED_Z_TIER = 73.1; const ACCEPTED_Z_RATIO = ACCEPTED_Z_TIER / ACCEPTED_CANONICAL_EXTENT;

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

async function newBuildingPicture() {
  if (await page.locator('#home-screen:not([hidden])').count() === 0) {
    await page.locator('[data-action="go-home"]').first().click();
    await page.locator('#home-screen:not([hidden])').waitFor();
  }
  await page.locator('[data-action="new-picture"]').first().click();
  await page.locator('#editor-screen:not([hidden])').waitFor();
  await page.locator('#category-tabs [data-category="building"]').click();
  assert.equal(await page.locator('[data-sticker-id]').count(), 6, 'visible Building category retains its accepted six stickers');
}

function intendedOffset(source, target, direction, nudge = { x: 0, y: 0 }) {
  const width = (source.width + target.width) / 2; const height = (source.height + target.height) / 2;
  const vectors = {
    A: { x: -.4 * width, y: -.2 * height },
    B: { x: .4 * width, y: -.2 * height },
    Z: { x: 0, y: -ACCEPTED_Z_RATIO * height },
    Z_DOWN: { x: 0, y: ACCEPTED_Z_RATIO * height }
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

async function constructionOrderProof(layerIds) {
  return page.evaluate((ids) => {
    const app = window.BlockFolkImaginarium.app; const memberIds = new Set(ids); const grid = app.constructionGridFor(memberIds); const objects = app.canvas.getObjects();
    return {
      consistent: grid.consistent,
      rows: objects.filter((object) => memberIds.has(object.blockfolkLayerId)).map((object) => ({
        id: object.blockfolkLayerId, index: objects.indexOf(object), z: grid.origins.get(object.blockfolkLayerId)?.z,
        top: Number(object.top || 0), left: Number(object.left || 0)
      }))
    };
  }, layerIds);
}

function assertCanonicalConstructionOrder(proof, label) {
  assert.equal(proof.consistent, true, `${label}: construction grid must be valid`);
  assert.ok(proof.rows.every((row) => Number.isFinite(row.z)), `${label}: every member must have a logical Z coordinate`);
  const expected = [...proof.rows].sort((left, right) => left.z - right.z || left.top - right.top || left.left - right.left || left.id.localeCompare(right.id));
  assert.deepEqual([...proof.rows].sort((left, right) => left.index - right.index).map((row) => row.id), expected.map((row) => row.id), `${label}: canvas indices must follow logical Z then the accepted A/B painter order`);
  for (const lower of proof.rows) for (const upper of proof.rows) if (lower.z < upper.z) assert.ok(lower.index < upper.index, `${label}: logical Z${lower.z} must paint before logical Z${upper.z}`);
}

await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(() => new Promise((resolvePromise, reject) => {
  const request = indexedDB.deleteDatabase('blockfolk-imaginarium-library-v1'); request.onsuccess = () => resolvePromise(); request.onerror = () => reject(request.error); request.onblocked = () => resolvePromise();
}));
await page.reload({ waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await newBuildingPicture();

const publicZReleases = [
  { sourceAsset: LOG, targetAsset: BRICK, direction: 'Z', nudge: { x: -20, y: 0 } },
  { sourceAsset: LOG, targetAsset: BRICK, direction: 'Z', nudge: { x: 20, y: 0 } },
  { sourceAsset: BRICK, targetAsset: LOG, direction: 'Z_DOWN', nudge: { x: 0, y: -10 } },
  { sourceAsset: BRICK, targetAsset: LOG, direction: 'Z_DOWN', nudge: { x: 0, y: 10 } }
];
for (const zoomSteps of [0, 2]) for (const release of publicZReleases) {
  await newBuildingPicture();
  const target = await addVisible(release.targetAsset); const source = await addVisible(release.sourceAsset);
  for (let step = 0; step < zoomSteps; step += 1) await page.locator('[data-action="camera-zoom-in"]').click();
  const state = await metrics(); const sourceMetric = state.find((entry) => entry.id === source.id); const targetMetric = state.find((entry) => entry.id === target.id);
  await dragLayerTo(source.id, intendedOffset(sourceMetric, targetMetric, release.direction, release.nudge));
  const activationBefore = await page.evaluate(() => window.BlockFolkImaginarium.app.controls.activationCount); await touchControl();
  const result = await page.evaluate((before) => {
    const app = window.BlockFolkImaginarium.app; const edge = app.current.connections[0];
    return { activationDelta: app.controls.activationCount - before, edges: app.current.connections.length, aAnchorId: edge?.aAnchorId, bAnchorId: edge?.bAnchorId, toast: document.querySelector('#toast').textContent };
  }, activationBefore);
  assert.equal(result.activationDelta, 1); assert.equal(result.edges, 1); assert.equal(result.toast, 'Pieces connected.');
  assert.equal(['stackTop', 'stackBase'].includes(result.aAnchorId), true, `public ${release.direction} release at zoom step ${zoomSteps} must choose Z`);
  assert.equal(['stackTop', 'stackBase'].includes(result.bAnchorId), true, 'a Z edge must serialize reciprocal stack anchors');
  assertCanonicalConstructionOrder(await constructionOrderProof([source.id, target.id]), `public ${release.direction} release at zoom step ${zoomSteps}`);
}

for (const zoomSteps of [0, 2]) {
  await newBuildingPicture();
  const target = await addVisible(BRICK); const source = await addVisible(LOG);
  for (let step = 0; step < zoomSteps; step += 1) await page.locator('[data-action="camera-zoom-in"]').click();
  const state = await metrics(); const sourceMetric = state.find((entry) => entry.id === source.id); const targetMetric = state.find((entry) => entry.id === target.id);
  await dragLayerTo(source.id, intendedOffset(sourceMetric, targetMetric, 'Z', { x: 24, y: 0 }));
  const before = await normalizedPictureState(); await touchControl();
  assert.deepEqual(await normalizedPictureState(), before, 'cross-axis ambiguity must preserve every transform and connection');
  assert.equal(await page.locator('#toast').textContent(), 'Move closer to the spot you want.');
}

await newBuildingPicture();

const isolatedLog = await addVisible(LOG); const isolatedBrick = await addVisible(BRICK);
await connectByVisibleInteraction(isolatedBrick.id, isolatedLog.id, 'Z', true);
const verticalPair = await metrics(); const firstVertical = verticalPair.find((entry) => entry.id === isolatedLog.id); const secondVertical = verticalPair.find((entry) => entry.id === isolatedBrick.id);
assert.ok(Math.abs(Math.abs(secondVertical.y - firstVertical.y) - ACCEPTED_Z_RATIO * ((secondVertical.height + firstVertical.height) / 2)) < .1, 'the visible mixed-material pair must use the independent accepted Z calibration');
assertCanonicalConstructionOrder(await constructionOrderProof([isolatedLog.id, isolatedBrick.id]), 'mixed-material vertical pair');
await page.screenshot({ path: resolve(evidence, 'blocks-vertical-pair-400x844.png'), fullPage: true });

await newBuildingPicture();
const lowerRoot = await addVisible(LOG); await dragLayerTo(lowerRoot.id, { x: 115, y: 420 });
const lowerMate = await addVisible(BRICK); await connectByVisibleInteraction(lowerMate.id, lowerRoot.id, 'A');
const upperRoot = await addVisible(BRICK); await dragLayerTo(upperRoot.id, { x: 285, y: 420 });
const upperMate = await addVisible(LOG); await connectByVisibleInteraction(upperMate.id, upperRoot.id, 'A');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length), 2, 'the natural workflow begins as two independent horizontal pairs');
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Detach selected sticker from its assembly', 'a connected pair with no external intent remains Unsnap');

const separatedPairs = await metrics();
await dragLayerTo(upperRoot.id, intendedOffset(separatedPairs.find((entry) => entry.id === upperRoot.id), separatedPairs.find((entry) => entry.id === lowerRoot.id), 'Z'));
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Snap selected construction pieces', 'a connected pair near another component must become Snap');
const pairMergeBefore = await page.evaluate(() => ({ activations: window.BlockFolkImaginarium.app.controls.activationCount, edges: structuredClone(window.BlockFolkImaginarium.app.current.connections) }));
await touchControl();
const pairMergeAfter = await page.evaluate((before) => {
  const app = window.BlockFolkImaginarium.app; const added = app.current.connections.filter((edge) => !before.edges.some((prior) => prior.id === edge.id));
  return {
    activationDelta: app.controls.activationCount - before.activations,
    edges: app.current.connections.length, added,
    members: app.selectedMemberIds(app.activeSticker()).size,
    state: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root').dataset.contextState,
    toast: document.querySelector('#toast').textContent
  };
}, pairMergeBefore);
assert.equal(pairMergeAfter.activationDelta, 1); assert.equal(pairMergeAfter.edges, 3); assert.equal(pairMergeAfter.added.length, 1); assert.equal(pairMergeAfter.members, 4);
assert.equal(['stackTop', 'stackBase'].includes(pairMergeAfter.added[0].aAnchorId), true, 'the sole 2+2 bridge edge must be vertical');
assert.equal(pairMergeAfter.state, 'unsnap'); assert.equal(pairMergeAfter.toast, 'Pieces connected.');
const fourIds = [lowerRoot.id, lowerMate.id, upperRoot.id, upperMate.id];
const pairOrderBeforeFlip = await constructionOrderProof(fourIds); assertCanonicalConstructionOrder(pairOrderBeforeFlip, '2+2 wall');
await page.screenshot({ path: resolve(evidence, 'blocks-two-pairs-vertical-merge-400x844.png'), fullPage: true });

const pairConnectionsBeforeFlip = await page.evaluate(() => structuredClone(window.BlockFolkImaginarium.app.current.connections).sort((left, right) => left.id.localeCompare(right.id)));
await touchControl('#selection-toolbar [data-action="flip"]');
const pairOrderAfterFlip = await constructionOrderProof(fourIds); assertCanonicalConstructionOrder(pairOrderAfterFlip, 'flipped 2+2 wall');
assert.deepEqual(pairOrderAfterFlip.rows.map(({ id, z }) => ({ id, z })).sort((left, right) => left.id.localeCompare(right.id)), pairOrderBeforeFlip.rows.map(({ id, z }) => ({ id, z })).sort((left, right) => left.id.localeCompare(right.id)), 'Flip must preserve every logical Z tier');
assert.deepEqual(await page.evaluate(() => structuredClone(window.BlockFolkImaginarium.app.current.connections).sort((left, right) => left.id.localeCompare(right.id))), pairConnectionsBeforeFlip, 'Flip must preserve the complete construction graph');
await page.screenshot({ path: resolve(evidence, 'blocks-two-pairs-flipped-400x844.png'), fullPage: true });

await touchControl('[data-action="undo"]'); assertCanonicalConstructionOrder(await constructionOrderProof(fourIds), 'undo-restored 2+2 wall');
await touchControl('[data-action="redo"]'); assertCanonicalConstructionOrder(await constructionOrderProof(fourIds), 'redo-restored flipped 2+2 wall');

const fourBeforeMove = await normalizedPictureState(); const fourMoveMetric = (await metrics()).find((entry) => entry.id === lowerMate.id);
await nativeTouch(fourMoveMetric.x, fourMoveMetric.y, 'drag', { x: fourMoveMetric.x + 30, y: fourMoveMetric.y + 15 }); await page.waitForTimeout(80);
const fourAfterMove = await normalizedPictureState();
const fourDeltas = fourAfterMove.stickers.map((sticker) => {
  const prior = fourBeforeMove.stickers.find((entry) => entry.layerId === sticker.layerId); return { x: sticker.x - prior.x, y: sticker.y - prior.y };
});
assert.ok(fourDeltas.every((delta) => Math.abs(delta.x - fourDeltas[0].x) < .01 && Math.abs(delta.y - fourDeltas[0].y) < .01), 'dragging any member moves the merged four-block assembly once');

const fourPersisted = await normalizedPictureState(); await page.locator('[data-action="done-picture"]').click(); await page.locator('#gallery-screen:not([hidden])').waitFor();
await page.locator('[data-gallery-action="edit"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await normalizedPictureState(), fourPersisted, 'the exact 2+2 merge and movement survive save/reload');
assertCanonicalConstructionOrder(await constructionOrderProof(fourIds), 'saved and reloaded 2+2 wall');

const recoveryFixture = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas(); const fixture = structuredClone(app.current); const highest = fixture.stickers.length - 1;
  fixture.stickers = fixture.stickers.map((sticker) => ({ ...sticker, zIndex: highest - sticker.zIndex }));
  return { json: JSON.stringify(fixture), savedOrder: fixture.stickers.map(({ layerId, zIndex }) => ({ layerId, zIndex })).sort((left, right) => left.layerId.localeCompare(right.layerId)) };
});
await page.locator('#recovery-input').setInputFiles({ name: 'blockfolk-logical-z-recovery.json', mimeType: 'application/json', buffer: Buffer.from(recoveryFixture.json) });
await page.waitForFunction(() => document.querySelector('#toast').textContent === 'Picture recovery opened.');
assert.deepEqual(await page.evaluate(() => window.BlockFolkImaginarium.app.current.stickers.map(({ layerId, zIndex }) => ({ layerId, zIndex })).sort((left, right) => left.layerId.localeCompare(right.layerId))), recoveryFixture.savedOrder, 'recovery rendering must not force a save-state rewrite');
assertCanonicalConstructionOrder(await constructionOrderProof(fourIds), 'recovery-rendered 2+2 wall with reversed saved order');
assert.deepEqual(await normalizedPictureState(), fourPersisted, 'the next normal canvas sync may persist the corrected recovery order without changing geometry or topology');

const selectedForCopy = (await metrics()).find((entry) => entry.id === upperMate.id); await nativeTouch(selectedForCopy.x, selectedForCopy.y); await page.waitForTimeout(50);
await touchControl('#selection-toolbar [data-action="copy"]');
const copiedIds = await page.evaluate(() => [...window.BlockFolkImaginarium.app.selectedMemberIds(window.BlockFolkImaginarium.app.activeSticker())]);
assert.equal(copiedIds.length, 4, 'Copy must duplicate the complete 2+2 assembly'); assertCanonicalConstructionOrder(await constructionOrderProof(copiedIds), 'copied 2+2 wall');
const copiedSlotBeforeFlip = await constructionOrderProof(copiedIds); const originalSlotBeforeFlip = await constructionOrderProof(fourIds);
await touchControl('#selection-toolbar [data-action="behind"]'); assertCanonicalConstructionOrder(await constructionOrderProof(copiedIds), 'copied wall moved behind');
await touchControl('#selection-toolbar [data-action="flip"]');
const copiedSlotAfterFlip = await constructionOrderProof(copiedIds); const originalSlotAfterFlip = await constructionOrderProof(fourIds); assertCanonicalConstructionOrder(copiedSlotAfterFlip, 'copied wall flipped in its slot');
assert.deepEqual(copiedSlotAfterFlip.rows.map((row) => row.index).sort((a, b) => a - b), [0, 1, 2, 3], 'Flip must leave the copied assembly in its existing contiguous slot');
assert.deepEqual(originalSlotAfterFlip.rows.map((row) => row.index).sort((a, b) => a - b), [4, 5, 6, 7], 'Flip must not move the unrelated original assembly');
assert.notDeepEqual(copiedSlotBeforeFlip.rows.map((row) => row.index).sort((a, b) => a - b), copiedSlotAfterFlip.rows.map((row) => row.index).sort((a, b) => a - b), 'Behind must move only the complete selected assembly');
assert.deepEqual(originalSlotBeforeFlip.rows.map((row) => row.index).sort((a, b) => a - b), [0, 1, 2, 3], 'the original wall begins in its own contiguous slot');
const fourLeaf = (await metrics()).find((entry) => entry.id === upperMate.id); await nativeTouch(fourLeaf.x, fourLeaf.y); await page.waitForTimeout(50);
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Detach selected sticker from its assembly');
const fourUnsnapBefore = await normalizedPictureState(); const fourUnsnapActivation = await page.evaluate(() => window.BlockFolkImaginarium.app.controls.activationCount); await touchControl();
const fourUnsnapAfter = await normalizedPictureState();
assert.deepEqual(fourUnsnapAfter.stickers, fourUnsnapBefore.stickers, 'one Unsnap changes no member transform');
assert.deepEqual(fourUnsnapAfter.camera, fourUnsnapBefore.camera);
assert.ok(fourUnsnapAfter.connections.length < fourUnsnapBefore.connections.length, 'one Unsnap removes only the selected member links');
assert.equal(await page.evaluate((before) => window.BlockFolkImaginarium.app.controls.activationCount - before, fourUnsnapActivation), 1);
assert.equal(await page.locator('#toast').textContent(), 'Sticker detached.');

await page.locator('[data-action="go-home"]').first().click(); await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#category-tabs [data-category="building"]').click();
const first = await addVisible(LOG); const second = await addVisible(BRICK);
await page.evaluate(() => { const root = document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root'); window.__gridSnapRoot = root; window.__gridSnapControlId = root.dataset.sfhsControlId; });
await connectByVisibleInteraction(second.id, first.id, 'A', true);
const third = await addVisible(LOG); await connectByVisibleInteraction(third.id, first.id, 'B');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length), 2, 'third block joins the existing horizontal assembly');
await page.screenshot({ path: resolve(evidence, 'blocks-third-member-400x844.png'), fullPage: true });

const fourth = await addVisible(BRICK); await connectByVisibleInteraction(fourth.id, second.id, 'Z');
const fifth = await addVisible(LOG); await connectByVisibleInteraction(fifth.id, fourth.id, 'Z');
const construction = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const edges = app.current.connections;
  const directions = edges.map((edge) => edge.aAnchorId);
  return { edges: edges.length, members: app.selectedMemberIds(app.activeSticker()).size, directions, sameRoot: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root') === window.__gridSnapRoot, controlId: document.querySelector('#selection-toolbar [data-action="snap-context"]').closest('.sfhs-cf-root').dataset.sfhsControlId };
});
assert.equal(construction.edges, 4); assert.equal(construction.members, 5); assert.equal(construction.sameRoot, true); assert.equal(construction.controlId, await page.evaluate(() => window.__gridSnapControlId));
assert.equal(construction.directions.some((id) => ['northWest', 'southEast'].includes(id)), true, 'public lane creates an A connection');
assert.equal(construction.directions.some((id) => ['northEast', 'southWest'].includes(id)), true, 'public lane creates a B connection/corner');
assert.equal(construction.directions.filter((id) => ['stackTop', 'stackBase'].includes(id)).length, 2, 'public lane creates a three-tier Z stack');
assertCanonicalConstructionOrder(await constructionOrderProof([first.id, second.id, third.id, fourth.id, fifth.id]), 'three-tier A/B/Z construction');
const threeTierMetrics = await metrics(); const threeTier = [second.id, fourth.id, fifth.id].map((id) => threeTierMetrics.find((entry) => entry.id === id));
assert.ok(Math.abs(Math.abs(threeTier[1].y - threeTier[0].y) - ACCEPTED_Z_RATIO * ((threeTier[1].height + threeTier[0].height) / 2)) < .1);
assert.ok(Math.abs(Math.abs(threeTier[2].y - threeTier[1].y) - ACCEPTED_Z_RATIO * ((threeTier[2].height + threeTier[1].height) / 2)) < .1, 'the third tier must not accumulate Z drift');
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

const leaf = (await metrics()).find((entry) => entry.id === fifth.id); await nativeTouch(leaf.x, leaf.y); await page.waitForTimeout(60);
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
const occupiedTarget = await addVisible(LOG); const occupiedNeighbor = await addVisible(BRICK); await connectByVisibleInteraction(occupiedNeighbor.id, occupiedTarget.id, 'Z');
await dragLayerTo(occupiedTarget.id, { x: 115, y: 420 });
const occupiedMoving = await addVisible(LOG); await dragLayerTo(occupiedMoving.id, { x: 285, y: 420 });
const occupiedMovingMate = await addVisible(BRICK); await connectByVisibleInteraction(occupiedMovingMate.id, occupiedMoving.id, 'A');
const occupiedNeighborPosition = (await metrics()).find((entry) => entry.id === occupiedNeighbor.id);
await dragLayerTo(occupiedMoving.id, { x: occupiedNeighborPosition.x, y: occupiedNeighborPosition.y });
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Snap selected construction pieces', 'an occupied external attempt must remain Snap for a connected component');
const occupiedBefore = await normalizedPictureState(); await touchControl();
assert.deepEqual(await normalizedPictureState(), occupiedBefore); assert.equal(await page.locator('#toast').textContent(), 'That spot is full.');

await page.locator('[data-action="go-home"]').first().click(); await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#category-tabs [data-category="building"]').click();
const tiedMoving = await addVisible(LOG); await dragLayerTo(tiedMoving.id, { x: 200, y: 250 });
const tiedMovingMate = await addVisible(BRICK); await connectByVisibleInteraction(tiedMovingMate.id, tiedMoving.id, 'A');
const ambiguousTarget = await addVisible(LOG); await dragLayerTo(ambiguousTarget.id, { x: 200, y: 420 });
const tiedMetrics = await metrics(); const movingMetric = tiedMetrics.find((entry) => entry.id === tiedMoving.id); const targetMetric = tiedMetrics.find((entry) => entry.id === ambiguousTarget.id);
await dragLayerTo(tiedMoving.id, intendedOffset(movingMetric, targetMetric, 'Z', { x: 48, y: 0 }));
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Snap selected construction pieces', 'an ambiguous external attempt must remain Snap for a connected component');
const ambiguousBefore = await normalizedPictureState(); await touchControl();
assert.deepEqual(await normalizedPictureState(), ambiguousBefore); assert.equal(await page.locator('#toast').textContent(), 'Move closer to the spot you want.');

assert.deepEqual(failures, [], failures.join('\n')); assert.deepEqual(requests, []);
await browser.close();
console.log('BLOCKFOLK_GRID_BROWSER_SCENARIO PASS', JSON.stringify({ members: 5, edges: 4, zTiers: 3, persistence: 'exact', occupied: 'atomic-z', ambiguous: 'atomic', requests: requests.length, evidence }));
