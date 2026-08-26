/* global document, indexedDB, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(root, 'dist/index.html')).href;
const evidenceRoot = resolve(root, process.env.BLOCKFOLK_ALL_MATERIALS_EVIDENCE_DIRECTORY || 'test-results/blockfolk-all-materials-001');
const evidence = resolve(evidenceRoot, 'browser'); await mkdir(evidence, { recursive: true });
const failures = []; const requests = [];
const blocks = [
  { id: 'sticker-blockfolk-grass-dirt-block', category: 'nature' },
  { id: 'sticker-blockfolk-dirt-block', category: 'nature' },
  { id: 'sticker-blockfolk-stone-block', category: 'nature' },
  { id: 'sticker-blockfolk-sand-block', category: 'nature' },
  { id: 'sticker-blockfolk-snow-block', category: 'nature' },
  { id: 'sticker-blockfolk-water-block', category: 'nature' },
  { id: 'sticker-blockfolk-lava-block', category: 'nature' },
  { id: 'sticker-blockfolk-wood-log-block', category: 'building' },
  { id: 'sticker-blockfolk-leaf-block', category: 'nature' },
  { id: 'sticker-blockfolk-brick-stone-block', category: 'building' }
];
const byId = new Map(blocks.map((entry) => [entry.id, entry]));
const snapSelector = '#selection-toolbar [data-action="snap-context"]';
const acceptedExtent = 420 / (1.1 ** 10); const acceptedZ = 73.1; const acceptedZRatio = acceptedZ / acceptedExtent;

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

async function nativeTouch(x, y, type = 'tap', destination = null) {
  const rect = await page.locator('.upper-canvas').boundingBox(); assert.ok(rect);
  const start = { x: rect.x + x, y: rect.y + y }; const finish = destination ? { x: rect.x + destination.x, y: rect.y + destination.y } : start;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  if (type === 'drag') for (let step = 1; step <= 6; step += 1) {
    const progress = step / 6;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (finish.x - start.x) * progress, y: start.y + (finish.y - start.y) * progress, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(55);
}

async function touchControl(selector) {
  const box = await page.locator(selector).boundingBox(); assert.ok(box, `visible control required: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80);
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
  await nativeTouch(item.x, item.y, 'drag', destination);
}

async function selectCategory(category) {
  await page.locator(`#category-tabs [data-category="${category}"]`).click();
  const expectedCount = category === 'building' ? 6 : 12;
  assert.equal(await page.locator('[data-sticker-id]').count(), expectedCount, `${category} catalog count must remain unchanged`);
}

async function addVisible(assetId) {
  const descriptor = byId.get(assetId); assert.ok(descriptor); await selectCategory(descriptor.category);
  const before = (await metrics()).length; const button = page.locator(`[data-sticker-id="${assetId}"]`);
  await button.scrollIntoViewIfNeeded(); await button.click();
  await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 1, before);
  const activeId = await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker().blockfolkLayerId);
  const result = (await metrics()).find((entry) => entry.id === activeId); assert.equal(result.assetId, assetId); return result;
}

async function newPicture() {
  if (await page.locator('#home-screen:not([hidden])').count() === 0) {
    await page.locator('[data-action="go-home"]').first().click(); await page.locator('#home-screen:not([hidden])').waitFor();
  }
  await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
}

function intendedOffset(source, target, direction) {
  const width = (source.width + target.width) / 2; const height = (source.height + target.height) / 2;
  const vector = {
    A: { x: -.4 * width, y: -.2 * height }, B: { x: .4 * width, y: -.2 * height },
    Z: { x: 0, y: -acceptedZRatio * height }
  }[direction];
  return { x: target.x + vector.x, y: target.y + vector.y };
}

async function connect(sourceId, targetId, direction) {
  const state = await metrics(); const source = state.find((entry) => entry.id === sourceId); const target = state.find((entry) => entry.id === targetId);
  await dragLayerTo(sourceId, intendedOffset(source, target, direction));
  const before = await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length);
  await touchControl(snapSelector);
  const result = await page.evaluate(() => ({ edges: window.BlockFolkImaginarium.app.current.connections.length, toast: document.querySelector('#toast').textContent }));
  assert.equal(result.edges, before + 1, `${direction} must create exactly one edge`); assert.equal(result.toast, 'Pieces connected.');
}

function normalizedState() {
  return page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
    return {
      stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex })).sort((a, b) => a.layerId.localeCompare(b.layerId)),
      connections: structuredClone(app.current.connections).sort((a, b) => a.id.localeCompare(b.id)), camera: structuredClone(app.current.page.camera)
    };
  });
}

async function constructionProof(layerIds) {
  return page.evaluate((ids) => {
    const app = window.BlockFolkImaginarium.app; const memberIds = new Set(ids); const grid = app.constructionGridFor(memberIds); const objects = app.canvas.getObjects();
    return {
      consistent: grid.consistent,
      rows: objects.filter((object) => memberIds.has(object.blockfolkLayerId)).map((object) => ({
        id: object.blockfolkLayerId, assetId: object.blockfolkAssetId, index: objects.indexOf(object), z: grid.origins.get(object.blockfolkLayerId)?.z,
        a: grid.origins.get(object.blockfolkLayerId)?.a, b: grid.origins.get(object.blockfolkLayerId)?.b, top: Number(object.top || 0), left: Number(object.left || 0)
      }))
    };
  }, layerIds);
}

function assertCanonicalOrder(proof, label) {
  assert.equal(proof.consistent, true, `${label} must have a consistent grid`);
  const expected = [...proof.rows].sort((left, right) => left.z - right.z || left.top - right.top || left.left - right.left || left.id.localeCompare(right.id));
  assert.deepEqual([...proof.rows].sort((left, right) => left.index - right.index).map((row) => row.id), expected.map((row) => row.id), `${label} canvas order must follow logical Z and accepted same-tier A/B order`);
  for (const lower of proof.rows) for (const upper of proof.rows) if (lower.z < upper.z) assert.ok(lower.index < upper.index, `${label}: lower logical Z must paint first`);
}

await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(() => new Promise((resolvePromise, reject) => {
  const request = indexedDB.deleteDatabase('blockfolk-imaginarium-library-v1'); request.onsuccess = () => resolvePromise(); request.onerror = () => reject(request.error); request.onblocked = () => resolvePromise();
}));
await page.reload({ waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();

// All ten existing catalog assets coexist without category relocation, new media,
// or hidden creation paths. Native drags arrange the phone-scale art overview.
await newPicture();
const overviewDestinations = [
  { x: 55, y: 220 }, { x: 125, y: 220 }, { x: 195, y: 220 }, { x: 265, y: 220 }, { x: 335, y: 220 },
  { x: 55, y: 335 }, { x: 125, y: 335 }, { x: 195, y: 335 }, { x: 265, y: 335 }, { x: 335, y: 335 }
];
const overviewIds = [];
for (const [index, descriptor] of blocks.entries()) {
  const added = await addVisible(descriptor.id); overviewIds.push(added.id); await dragLayerTo(added.id, overviewDestinations[index]);
}
assert.deepEqual((await metrics()).map((item) => item.assetId).sort(), blocks.map((item) => item.id).sort());
await page.screenshot({ path: resolve(evidence, 'all-ten-materials-overview-400x844.png'), fullPage: true });
const overviewBeforeSave = await normalizedState();
await page.locator('[data-action="done-picture"]').click(); await page.locator('#gallery-screen:not([hidden])').waitFor();
await page.locator('[data-gallery-action="edit"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await normalizedState(), overviewBeforeSave, 'all ten materials must survive the public save/reload path exactly');
await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(100);
await page.screenshot({ path: resolve(evidence, 'all-ten-materials-overview-844x400.png'), fullPage: true });
await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(100);

// One public ten-material construction proves arbitrary mixed growth without an
// 8x6 browser matrix; the model lane owns exhaustive per-material directions.
await newPicture();
for (let step = 0; step < 3; step += 1) await page.locator('[data-action="camera-zoom-out"]').click();
const rowIds = []; let previous = null;
for (const descriptor of blocks) {
  const added = await addVisible(descriptor.id); rowIds.push(added.id);
  if (previous) await connect(added.id, previous, 'A');
  previous = added.id;
}
const rowProof = await constructionProof(rowIds); assertCanonicalOrder(rowProof, 'ten-material row');
assert.equal(new Set(rowProof.rows.map((row) => row.assetId)).size, 10); assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length), 9);
assert.ok(rowProof.rows.every((row) => row.z === rowProof.rows[0].z), 'the ten-material row stays on one logical tier');
for (let step = 0; step < 2; step += 1) await page.locator('[data-action="camera-zoom-in"]').click();
await page.screenshot({ path: resolve(evidence, 'mixed-ten-material-horizontal-400x844.png'), fullPage: true });

// Mixed corner and tower exercise both horizontal bases and repeated Z with
// different art while keeping the shared 73.1 projection exact.
await newPicture();
const cornerRoot = await addVisible(blocks[0].id); const cornerA = await addVisible(blocks[1].id); await connect(cornerA.id, cornerRoot.id, 'A');
const cornerB = await addVisible(blocks[2].id); await connect(cornerB.id, cornerRoot.id, 'B');
const tower1 = await addVisible(blocks[3].id); await connect(tower1.id, cornerA.id, 'Z');
const tower2 = await addVisible(blocks[4].id); await connect(tower2.id, tower1.id, 'Z');
const mixedIds = [cornerRoot.id, cornerA.id, cornerB.id, tower1.id, tower2.id]; const mixedProof = await constructionProof(mixedIds); assertCanonicalOrder(mixedProof, 'mixed corner tower');
assert.equal(new Set(mixedProof.rows.map((row) => row.z)).size, 3); assert.ok(mixedProof.rows.some((row) => row.a !== 0)); assert.ok(mixedProof.rows.some((row) => row.b !== 0));
const towerMetrics = await metrics(); const towerRows = [cornerA.id, tower1.id, tower2.id].map((id) => towerMetrics.find((entry) => entry.id === id));
for (let index = 1; index < towerRows.length; index += 1) assert.ok(Math.abs(Math.abs(towerRows[index].y - towerRows[index - 1].y) - acceptedZRatio * ((towerRows[index].height + towerRows[index - 1].height) / 2)) < .1, 'mixed-material tower must retain exact 73.1 separation without drift');
await page.screenshot({ path: resolve(evidence, 'mixed-corner-tower-400x844.png'), fullPage: true });

// Four distinct materials form two independent horizontal pairs and then one
// supported vertical pose. The public resolver must see both agreeing contacts.
await newPicture(); await selectCategory('nature');
const lowerRoot = await addVisible(blocks[0].id); await dragLayerTo(lowerRoot.id, { x: 115, y: 420 });
const lowerMate = await addVisible(blocks[1].id); await connect(lowerMate.id, lowerRoot.id, 'A');
const upperRoot = await addVisible(blocks[5].id); await dragLayerTo(upperRoot.id, { x: 285, y: 420 });
const upperMate = await addVisible(blocks[6].id); await connect(upperMate.id, upperRoot.id, 'A');
const separated = await metrics(); await dragLayerTo(upperRoot.id, intendedOffset(separated.find((entry) => entry.id === upperRoot.id), separated.find((entry) => entry.id === lowerRoot.id), 'Z'));
const mergeIntent = await page.evaluate(() => {
  const resolution = window.BlockFolkImaginarium.app.resolveSnapContext();
  return { action: resolution.action, status: resolution.candidate.status, axisFamily: resolution.candidate.pose?.axisFamily, support: resolution.candidate.pose?.support };
});
assert.deepEqual(mergeIntent, { action: 'snap', status: 'ok', axisFamily: 'z', support: 2 }, 'four-material 2+2 closure must be one two-contact Z pose');
await touchControl(snapSelector);
const wallIds = [lowerRoot.id, lowerMate.id, upperRoot.id, upperMate.id]; const wallProof = await constructionProof(wallIds); assertCanonicalOrder(wallProof, 'four-material 2+2 wall');
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.current.connections.length), 3, '2+2 closure adds one bridge edge');
assert.equal(new Set(wallProof.rows.map((row) => row.assetId)).size, 4); assert.equal(wallProof.rows.filter((row) => row.z === Math.min(...wallProof.rows.map((item) => item.z))).length, 2); assert.equal(wallProof.rows.filter((row) => row.z === Math.max(...wallProof.rows.map((item) => item.z))).length, 2);
await page.screenshot({ path: resolve(evidence, 'four-material-two-plus-two-wall-400x844.png'), fullPage: true });

const connectionsBeforeFlip = await page.evaluate(() => structuredClone(window.BlockFolkImaginarium.app.current.connections).sort((a, b) => a.id.localeCompare(b.id)));
await touchControl('#selection-toolbar [data-action="flip"]'); assertCanonicalOrder(await constructionProof(wallIds), 'flipped four-material wall');
assert.deepEqual(await page.evaluate(() => structuredClone(window.BlockFolkImaginarium.app.current.connections).sort((a, b) => a.id.localeCompare(b.id))), connectionsBeforeFlip, 'Flip keeps all material-neutral connections');
const beforeDrag = await normalizedState(); const dragMember = (await metrics()).find((entry) => entry.id === lowerMate.id);
await nativeTouch(dragMember.x, dragMember.y, 'drag', { x: dragMember.x + 25, y: dragMember.y + 12 }); const afterDrag = await normalizedState();
const deltas = afterDrag.stickers.map((sticker) => { const prior = beforeDrag.stickers.find((entry) => entry.layerId === sticker.layerId); return { x: sticker.x - prior.x, y: sticker.y - prior.y }; });
assert.ok(deltas.every((delta) => Math.abs(delta.x - deltas[0].x) < .01 && Math.abs(delta.y - deltas[0].y) < .01), 'dragging one material moves the complete mixed assembly');
const wallBeforeSave = await normalizedState(); await page.locator('[data-action="done-picture"]').click(); await page.locator('#gallery-screen:not([hidden])').waitFor();
await page.locator('[data-gallery-action="edit"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor(); assert.deepEqual(await normalizedState(), wallBeforeSave, 'mixed 2+2 wall persists exactly');
const selected = (await metrics()).find((entry) => entry.id === upperMate.id); await nativeTouch(selected.x, selected.y); const beforeUnsnap = await normalizedState(); await touchControl(snapSelector); const afterUnsnap = await normalizedState();
assert.ok(afterUnsnap.connections.length < beforeUnsnap.connections.length, 'Unsnap removes the selected material links');
assert.deepEqual(afterUnsnap.stickers, beforeUnsnap.stickers, 'Unsnap does not visually rearrange any material');

assert.deepEqual(failures, [], failures.join('\n')); assert.deepEqual(requests, []); await browser.close();
console.log('BLOCKFOLK_ALL_BLOCK_MATERIALS_BROWSER PASS', JSON.stringify({ materials: 10, rowEdges: 9, mixedCornerTowerMembers: 5, closureSupport: mergeIntent.support, closureMembers: 4, portrait: '400x844', landscape: '844x400', requests: requests.length, evidence }));
