/* global document, indexedDB, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(root, 'dist/index.html')).href;
const evidence = resolve(root, process.env.BLOCKFOLK_WINDOW_EVIDENCE_DIRECTORY || 'test-results/blockfolk-windows-001/browser');
await mkdir(evidence, { recursive: true });
const failures = []; const requests = [];
const BRICK = 'sticker-blockfolk-brick-stone-block'; const LOG = 'sticker-blockfolk-wood-log-block';
const SQUARE = 'sticker-blockfolk-square-window'; const ROUND = 'sticker-blockfolk-round-window';
const snapSelector = '#selection-toolbar [data-action="snap-context"]';

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
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(65);
}

async function touchControl(selector) {
  const box = await page.locator(selector).boundingBox(); assert.ok(box, `visible control required: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(90);
}

async function metrics() {
  return page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; const transform = app.canvas.viewportTransform;
    return app.canvas.getObjects().map((object) => ({
      id: object.blockfolkLayerId, assetId: object.blockfolkAssetId,
      x: Number(object.left || 0) * transform[0] + transform[4], y: Number(object.top || 0) * transform[3] + transform[5],
      worldX: Number(object.left || 0), worldY: Number(object.top || 0), width: object.getScaledWidth() * transform[0], height: object.getScaledHeight() * transform[3],
      angle: Number(object.angle || 0), flipX: !!object.flipX
    }));
  });
}

async function dragLayerTo(layerId, destination) {
  const item = (await metrics()).find((entry) => entry.id === layerId); assert.ok(item, `layer required: ${layerId}`);
  await nativeTouch(item.x, item.y, 'drag', destination);
}

async function selectVisibleLayer(layerId) {
  const item = (await metrics()).find((entry) => entry.id === layerId); assert.ok(item);
  for (const yFactor of [-.35, -.18, 0, .18, .35]) for (const xFactor of [-.4, -.22, 0, .22, .4]) {
    await nativeTouch(item.x + item.width * xFactor, item.y + item.height * yFactor);
    if (await page.evaluate((id) => window.BlockFolkImaginarium.app.activeSticker()?.blockfolkLayerId === id, layerId)) return;
  }
  assert.fail(`visible layer could not be selected through native touch: ${layerId}`);
}

async function addVisible(assetId) {
  const before = (await metrics()).length; const button = page.locator(`[data-sticker-id="${assetId}"]`);
  await button.scrollIntoViewIfNeeded(); await button.click();
  await page.waitForFunction((count) => window.BlockFolkImaginarium.app.canvas.getObjects().length === count + 1, before);
  const activeId = await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker().blockfolkLayerId);
  return (await metrics()).find((entry) => entry.id === activeId);
}

async function newBuildingPicture() {
  if (await page.locator('#home-screen:not([hidden])').count() === 0) {
    await page.locator('[data-action="go-home"]').first().click(); await page.locator('#home-screen:not([hidden])').waitFor();
  }
  await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
  await page.locator('#category-tabs [data-category="building"]').click(); assert.equal(await page.locator('[data-sticker-id]').count(), 6);
}

async function connectBroad(sourceId, targetId, placement) {
  const target = (await metrics()).find((entry) => entry.id === targetId); assert.ok(target);
  const offsets = placement === 'Z' ? [{ x: 0, y: -18 }, { x: 0, y: -15 }, { x: 0, y: -22 }] : [{ x: 22, y: 7 }, { x: 24, y: 8 }, { x: 21, y: 6 }];
  for (const offset of offsets) {
    await dragLayerTo(sourceId, { x: target.x + offset.x, y: target.y + offset.y });
    const before = await page.evaluate(() => ({ edges: window.BlockFolkImaginarium.app.current.connections.length, activations: window.BlockFolkImaginarium.app.controls.activationCount }));
    await touchControl(snapSelector);
    const after = await page.evaluate((prior) => {
      const app = window.BlockFolkImaginarium.app; const added = app.current.connections.slice(prior.edges);
      return { edges: app.current.connections.length, activationDelta: app.controls.activationCount - prior.activations, added, toast: document.querySelector('#toast').textContent };
    }, before);
    if (after.edges === before.edges + 1) {
      assert.equal(after.activationDelta, 1); assert.equal(after.added.length, 1); assert.equal(after.toast, 'Pieces connected.'); return after.added[0];
    }
  }
  assert.fail(`public ${placement} window connection failed: ${await page.locator('#toast').textContent()}`);
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
      consistent: grid.consistent, occupiedCells: grid.occupiedCells.size,
      rows: objects.filter((object) => memberIds.has(object.blockfolkLayerId)).map((object) => ({
        id: object.blockfolkLayerId, assetId: object.blockfolkAssetId, index: objects.indexOf(object), origin: grid.origins.get(object.blockfolkLayerId),
        top: Number(object.top || 0), left: Number(object.left || 0), angle: Number(object.angle || 0), flipX: !!object.flipX
      }))
    };
  }, layerIds);
}

function assertCanonicalOrder(proof, label) {
  assert.equal(proof.consistent, true); assert.equal(proof.occupiedCells, proof.rows.length, `${label} must have exactly one occupied cell per visible member`);
  const expected = [...proof.rows].sort((left, right) => left.origin.z - right.origin.z || left.top - right.top || left.left - right.left || left.id.localeCompare(right.id));
  assert.deepEqual([...proof.rows].sort((left, right) => left.index - right.index).map((row) => row.id), expected.map((row) => row.id), `${label} must use generic logical-Z/A-B draw order`);
}

await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(() => new Promise((resolvePromise, reject) => {
  const request = indexedDB.deleteDatabase('blockfolk-imaginarium-library-v1'); request.onsuccess = () => resolvePromise(); request.onerror = () => reject(request.error); request.onblocked = () => resolvePromise();
}));
await page.reload({ waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();

// Representative Square Window: two public Snap presses make a three-cell wall
// with no hidden host block or formation state.
await newBuildingPicture();
const controllerId = await page.locator(snapSelector).evaluate((element) => element.closest('.sfhs-cf-root').dataset.sfhsControlId);
const squareLeft = await addVisible(BRICK); await dragLayerTo(squareLeft.id, { x: 145, y: 360 });
const square = await addVisible(SQUARE); const squareEdgeA = await connectBroad(square.id, squareLeft.id, 'A');
assert.deepEqual([squareEdgeA.aAnchorId, squareEdgeA.bAnchorId], ['northWest', 'southEast']);
const squareRight = await addVisible(BRICK); const squareEdgeB = await connectBroad(squareRight.id, square.id, 'A');
assert.deepEqual([squareEdgeB.aAnchorId, squareEdgeB.bAnchorId], ['northWest', 'southEast']);
const squareIds = [squareLeft.id, square.id, squareRight.id]; const squareProof = await constructionProof(squareIds); assertCanonicalOrder(squareProof, 'Square Window wall');
assert.equal(squareProof.rows.length, 3); assert.equal(squareProof.occupiedCells, 3); assert.equal(squareProof.rows.filter((row) => row.assetId === SQUARE).length, 1);
const squareA = squareProof.rows.map((row) => row.origin.a).sort((a, b) => a - b);
assert.deepEqual([squareA[1] - squareA[0], squareA[2] - squareA[1]], [1, 1]);
assert.equal(squareProof.rows.find((row) => row.assetId === SQUARE).origin.a, squareA[1], 'Square Window must occupy the middle wall cell');
assert.equal(await page.locator(snapSelector).evaluate((element) => element.closest('.sfhs-cf-root').dataset.sfhsControlId), controllerId);
await page.screenshot({ path: resolve(evidence, 'window-representative-400x844.png'), fullPage: true });

const squareBeforeFlip = await normalizedState(); await touchControl('#selection-toolbar [data-action="flip"]'); const flippedSquareProof = await constructionProof(squareIds); assertCanonicalOrder(flippedSquareProof, 'flipped Square Window wall');
assert.ok(flippedSquareProof.rows.every((row) => row.flipX && row.angle === 180), 'whole Square Window assembly must switch to the mirrored authored plane');
assert.deepEqual((await normalizedState()).connections, squareBeforeFlip.connections, 'Flip preserves window topology');
const movingWindow = (await metrics()).find((entry) => entry.id === square.id); const beforeMove = await normalizedState();
await nativeTouch(movingWindow.x, movingWindow.y, 'drag', { x: movingWindow.x + 28, y: movingWindow.y + 14 }); const afterMove = await normalizedState();
const deltas = afterMove.stickers.map((sticker) => { const before = beforeMove.stickers.find((entry) => entry.layerId === sticker.layerId); return { x: sticker.x - before.x, y: sticker.y - before.y }; });
assert.ok(deltas.every((delta) => Math.abs(delta.x - deltas[0].x) < .01 && Math.abs(delta.y - deltas[0].y) < .01), 'dragging the window moves the complete wall');
const squarePersisted = await normalizedState(); const squarePictureId = await page.evaluate(() => window.BlockFolkImaginarium.app.current.id);
await page.locator('[data-action="done-picture"]').click(); await page.locator('#gallery-screen:not([hidden])').waitFor();
await page.locator(`[data-gallery-action="edit"][data-picture-id="${squarePictureId}"]`).click(); await page.locator('#editor-screen:not([hidden])').waitFor();
assert.deepEqual(await normalizedState(), squarePersisted, 'Square Window wall must save and reopen exactly');
const exportProof = await page.evaluate(() => window.BlockFolkImaginarium.app.exportDataUrl()); assert.ok(exportProof.startsWith('data:image/png;base64,') && exportProof.length > 100000);
const puzzleProof = await page.evaluate(async (id) => window.BlockFolkImaginarium.app.flattenPictureForPuzzle(id), squarePictureId); assert.ok(puzzleProof.dataUrl.startsWith('data:image/png;base64,') && puzzleProof.dataUrl.length > 100000);

// Select the representative middle window and detach both immediate edges once,
// without moving any of the three visible occupants.
await selectVisibleLayer(square.id);
assert.equal(await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker()?.blockfolkLayerId), square.id, 'the visible Square Window must remain directly selectable between blocks');
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Detach selected sticker from its assembly');
const squareBeforeUnsnap = await normalizedState(); await touchControl(snapSelector); const squareAfterUnsnap = await normalizedState();
assert.equal(squareBeforeUnsnap.connections.length, 2); assert.equal(squareAfterUnsnap.connections.length, 0); assert.deepEqual(squareAfterUnsnap.stickers, squareBeforeUnsnap.stickers);

// Round Window automatically proves the same middle-cell rule, vertical growth,
// and mirrored plane without another physical-device matrix.
await newBuildingPicture();
const roundLeft = await addVisible(LOG); await dragLayerTo(roundLeft.id, { x: 145, y: 370 });
const round = await addVisible(ROUND); await connectBroad(round.id, roundLeft.id, 'A');
const roundRight = await addVisible(LOG); await connectBroad(roundRight.id, round.id, 'A');
const roundRowProof = await constructionProof([roundLeft.id, round.id, roundRight.id]); assertCanonicalOrder(roundRowProof, 'Round Window wall');
assert.equal(roundRowProof.rows.find((row) => row.assetId === ROUND).origin.a, [...roundRowProof.rows.map((row) => row.origin.a)].sort((a, b) => a - b)[1]);
await page.screenshot({ path: resolve(evidence, 'window-profile-contact-sheet-400x844.png'), fullPage: true });
const roundTop = await addVisible(BRICK); const roundZEdge = await connectBroad(roundTop.id, round.id, 'Z');
assert.ok(['stackTop', 'stackBase'].includes(roundZEdge.aAnchorId)); assert.ok(['stackTop', 'stackBase'].includes(roundZEdge.bAnchorId));
const roundIds = [roundLeft.id, round.id, roundRight.id, roundTop.id]; const roundProof = await constructionProof(roundIds); assertCanonicalOrder(roundProof, 'Round Window wall and tier');
assert.equal(roundProof.rows.length, 4); assert.equal(roundProof.occupiedCells, 4); assert.equal(new Set(roundProof.rows.map((row) => `${row.origin.a},${row.origin.b},${row.origin.z}`)).size, 4);
await touchControl('#selection-toolbar [data-action="flip"]'); const flippedRoundProof = await constructionProof(roundIds); assertCanonicalOrder(flippedRoundProof, 'mirrored Round Window wall and tier');
assert.ok(flippedRoundProof.rows.every((row) => row.flipX && row.angle === 180));
await page.screenshot({ path: resolve(evidence, 'window-mirrored-plane-400x844.png'), fullPage: true });
await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(120);
await page.screenshot({ path: resolve(evidence, 'window-profile-contact-sheet-844x400.png'), fullPage: true });
await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(120);

// Ordinary occupancy owns collision failure: Round cannot enter Square's cell.
await newBuildingPicture();
for (let step = 0; step < 2; step += 1) await page.locator('[data-action="camera-zoom-in"]').click();
const occupiedRoot = await addVisible(BRICK); await dragLayerTo(occupiedRoot.id, { x: 145, y: 420 });
const occupiedSquare = await addVisible(SQUARE); await connectBroad(occupiedSquare.id, occupiedRoot.id, 'A');
const occupiedRound = await addVisible(ROUND); const squareMetric = (await metrics()).find((entry) => entry.id === occupiedSquare.id);
let occupiedIntent = false;
for (const nudge of [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: -3, y: 0 }, { x: 6, y: 1 }, { x: -6, y: -1 }, { x: 9, y: 2 }, { x: -9, y: -2 }]) {
  await dragLayerTo(occupiedRound.id, { x: squareMetric.x + nudge.x, y: squareMetric.y + nudge.y });
  occupiedIntent = await page.evaluate(() => window.BlockFolkImaginarium.app.resolveSnapContext().candidate.status === 'occupied');
  if (occupiedIntent) break;
}
assert.equal(occupiedIntent, true, 'a realistic release around the filled window cell must resolve to occupied');
const occupiedBefore = await normalizedState(); await touchControl(snapSelector); assert.deepEqual(await normalizedState(), occupiedBefore); assert.equal(await page.locator('#toast').textContent(), 'That spot is full.');

assert.deepEqual(failures, [], failures.join('\n')); assert.deepEqual(requests, []); await browser.close();
console.log('BLOCKFOLK_WINDOW_BROWSER PASS', JSON.stringify({ windows: 2, squareWallCells: 3, roundAssemblyCells: 4, hiddenBlocks: 0, mirroredPlane: true, persistence: 'exact', png: true, puzzle: true, portrait: '400x844', landscape: '844x400', requests: requests.length, evidence }));
