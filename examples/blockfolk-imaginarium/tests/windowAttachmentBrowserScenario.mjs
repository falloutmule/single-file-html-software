/* global document, indexedDB, structuredClone, window */
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(root, 'dist/index.html')).href;
const evidence = resolve(root, process.env.BLOCKFOLK_ATTACHMENT_EVIDENCE_DIRECTORY || 'test-results/blockfolk-window-attachment-persistence-001/browser');
await mkdir(evidence, { recursive: true });

const failures = []; const requests = [];
const BRICK = 'sticker-blockfolk-brick-stone-block';
const SQUARE = 'sticker-blockfolk-square-window';
const ROUND = 'sticker-blockfolk-round-window';
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

async function nativeTouch(x, y, destination = null) {
  const rect = await page.locator('.upper-canvas').boundingBox(); assert.ok(rect);
  const start = { x: rect.x + x, y: rect.y + y }; const finish = destination ? { x: rect.x + destination.x, y: rect.y + destination.y } : start;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  if (destination) for (let step = 1; step <= 5; step += 1) {
    const progress = step / 5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + (finish.x - start.x) * progress, y: start.y + (finish.y - start.y) * progress, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80);
}

async function touchControl(selector) {
  const box = await page.locator(selector).boundingBox(); assert.ok(box, `visible control required: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80);
}

async function editControl(action) {
  await touchControl('#selection-toolbar [data-action="show-selection-more"]');
  await touchControl(`#selection-more-sheet [data-action="${action}"]`);
  await touchControl('#selection-more-sheet [data-action="close-selection-more"]');
}

async function state() {
  return page.evaluate(() => {
    const app = window.BlockFolkImaginarium.app; const transform = app.canvas.viewportTransform; const objects = app.canvas.getObjects();
    return {
      attachments: [...app.windowAttachments],
      persistedAttachments: structuredClone(app.current.attachments || []),
      connections: structuredClone(app.current.connections),
      layers: objects.map((object, index) => ({
        id: object.blockfolkLayerId, assetId: object.blockfolkAssetId, index,
        left: Number(object.left || 0), top: Number(object.top || 0), scaleX: Number(object.scaleX || 1), scaleY: Number(object.scaleY || 1),
        angle: Number(object.angle || 0), flipX: !!object.flipX,
        x: Number(object.left || 0) * transform[0] + transform[4], y: Number(object.top || 0) * transform[3] + transform[5],
        width: object.getScaledWidth() * transform[0], height: object.getScaledHeight() * transform[3]
      }))
    };
  });
}

async function addVisible(assetId) {
  const count = (await state()).layers.length; const button = page.locator(`[data-sticker-id="${assetId}"]`);
  await button.scrollIntoViewIfNeeded(); await button.click();
  await page.waitForFunction((before) => window.BlockFolkImaginarium.app.canvas.getObjects().length === before + 1, count);
  return (await state()).layers.at(-1);
}

async function dragLayer(layerId, destination) {
  const layer = (await state()).layers.find((entry) => entry.id === layerId); assert.ok(layer);
  await nativeTouch(layer.x, layer.y, destination);
}

async function selectLayer(layerId) {
  await page.evaluate((id) => {
    const app = window.BlockFolkImaginarium.app; const object = app.canvas.getObjects().find((item) => item.blockfolkLayerId === id);
    app.canvas.setActiveObject(object); object.setCoords(); app.canvas.requestRenderAll(); app.updateSelection();
  }, layerId);
}

function transformOf(snapshot, layerId) {
  const { left, top, scaleX, scaleY, angle, flipX } = snapshot.layers.find((layer) => layer.id === layerId);
  return { left, top, scaleX, scaleY, angle, flipX };
}

function assertTransform(actual, expected, message) {
  for (const key of ['left', 'top', 'scaleX', 'scaleY', 'angle']) assert.ok(Math.abs(actual[key] - expected[key]) < .01, `${message}: ${key}`);
  assert.equal(actual.flipX, expected.flipX, `${message}: flipX`);
}

await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(() => new Promise((resolvePromise, reject) => {
  const request = indexedDB.deleteDatabase('blockfolk-imaginarium-library-v1'); request.onsuccess = () => resolvePromise(); request.onerror = () => reject(request.error); request.onblocked = () => resolvePromise();
}));
await page.reload({ waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.locator('[data-action="new-picture"]').first().click(); await page.locator('#editor-screen:not([hidden])').waitFor();
await page.locator('#category-tabs [data-category="building"]').click();

const rootBrick = await addVisible(BRICK); await dragLayer(rootBrick.id, { x: 155, y: 390 });
const mateBrick = await addVisible(BRICK);
let scene = await state(); const rootMetric = scene.layers.find((layer) => layer.id === rootBrick.id); const mateMetric = scene.layers.find((layer) => layer.id === mateBrick.id);
await dragLayer(mateBrick.id, { x: rootMetric.x + .4 * ((rootMetric.width + mateMetric.width) / 2), y: rootMetric.y - .2 * ((rootMetric.height + mateMetric.height) / 2) });
await touchControl(snapSelector);
scene = await state(); assert.equal(scene.connections.length, 1, 'two Bricks must form the structural host assembly through public Snap');

const square = await addVisible(SQUARE);
await editControl('smaller'); await editControl('smaller');
scene = await state(); const hostMetric = scene.layers.find((layer) => layer.id === rootBrick.id);
await dragLayer(square.id, { x: hostMetric.x, y: hostMetric.y });
const beforeAttach = await state(); const squareBeforeAttach = transformOf(beforeAttach, square.id); const connectionsBeforeAttach = beforeAttach.connections;
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Attach selected window to a block');
await touchControl(snapSelector);
const attached = await state();
assertTransform(transformOf(attached, square.id), squareBeforeAttach, 'Snap must not move or resize the Square Window');
assert.deepEqual(attached.connections, connectionsBeforeAttach, 'attachment must not enter the structural connection graph');
assert.deepEqual(attached.attachments, [[square.id, rootBrick.id]], 'Square Window must record exactly one in-memory host ID');
assert.deepEqual(attached.persistedAttachments, [{ childLayerId: square.id, hostLayerId: rootBrick.id }], 'Snap must immediately synchronize the canonical page relation without creating history');
assert.ok(attached.layers.find((layer) => layer.id === square.id).index > attached.layers.find((layer) => layer.id === mateBrick.id).index, 'attached window must paint after its host assembly');
assert.equal(await page.locator(snapSelector).getAttribute('aria-label'), 'Detach selected window from its block');
await page.screenshot({ path: resolve(evidence, 'square-window-attached-400x844.png'), fullPage: true });

const exposedMate = attached.layers.find((layer) => layer.id === mateBrick.id);
await nativeTouch(exposedMate.x, exposedMate.y, { x: 390, y: 75 });
const afterHostDrag = await state();
const hostDragDelta = {
  x: transformOf(afterHostDrag, rootBrick.id).left - transformOf(attached, rootBrick.id).left,
  y: transformOf(afterHostDrag, rootBrick.id).top - transformOf(attached, rootBrick.id).top
};
const childDragDelta = {
  x: transformOf(afterHostDrag, square.id).left - transformOf(attached, square.id).left,
  y: transformOf(afterHostDrag, square.id).top - transformOf(attached, square.id).top
};
assert.ok(Math.abs(hostDragDelta.x - childDragDelta.x) < .01 && Math.abs(hostDragDelta.y - childDragDelta.y) < .01, `window must follow the host actual final post-clamp drag delta: ${JSON.stringify({ hostDragDelta, childDragDelta })}`);

const beforeHostResize = afterHostDrag; await editControl('bigger'); const afterHostResize = await state();
const hostBeforeResize = transformOf(beforeHostResize, rootBrick.id); const hostAfterResize = transformOf(afterHostResize, rootBrick.id);
const childBeforeResize = transformOf(beforeHostResize, square.id); const childAfterResize = transformOf(afterHostResize, square.id); const resizeFactor = hostAfterResize.scaleX / hostBeforeResize.scaleX;
assert.ok(Math.abs(childAfterResize.left - (hostAfterResize.left + (childBeforeResize.left - hostBeforeResize.left) * resizeFactor)) < .01, 'window x must follow the accepted host scale');
assert.ok(Math.abs(childAfterResize.top - (hostAfterResize.top + (childBeforeResize.top - hostBeforeResize.top) * resizeFactor)) < .01, 'window y must follow the accepted host scale');
assert.ok(Math.abs(childAfterResize.scaleX - childBeforeResize.scaleX * resizeFactor) < .01, 'window scale must follow the accepted host scale multiplier');

const structuralLayers = afterHostResize.layers.filter((layer) => [rootBrick.id, mateBrick.id].includes(layer.id));
const flipCenter = structuralLayers.reduce((sum, layer) => sum + layer.left, 0) / structuralLayers.length; const childBeforeFlip = transformOf(afterHostResize, square.id);
await touchControl('#selection-toolbar [data-action="flip"]'); const afterFlip = await state(); const childAfterFlip = transformOf(afterFlip, square.id);
assert.ok(Math.abs(childAfterFlip.left - (2 * flipCenter - childBeforeFlip.left)) < .01, 'window must share the host assembly mirror transform');
assert.equal(childAfterFlip.flipX, !childBeforeFlip.flipX); assert.deepEqual(afterFlip.attachments, [[square.id, rootBrick.id]]);

await page.evaluate((layerId) => {
  const app = window.BlockFolkImaginarium.app; const child = app.canvas.getObjects().find((object) => object.blockfolkLayerId === layerId);
  app.camera = { ...app.camera, centerX: Number(child.left || 0), centerY: Number(child.top || 0) }; app.applyCamera();
}, square.id);
const readyForChildEdit = await state();
const structuralBeforeChildEdit = readyForChildEdit.layers.filter((layer) => [rootBrick.id, mateBrick.id].includes(layer.id)).map(({ id, left, top, scaleX, scaleY, angle, flipX }) => ({ id, left, top, scaleX, scaleY, angle, flipX }));
const childMetric = readyForChildEdit.layers.find((layer) => layer.id === square.id);
await nativeTouch(childMetric.x, childMetric.y, { x: childMetric.x - 24, y: childMetric.y + 18 });
const afterChildDrag = await state();
assert.deepEqual(afterChildDrag.layers.filter((layer) => [rootBrick.id, mateBrick.id].includes(layer.id)).map(({ id, left, top, scaleX, scaleY, angle, flipX }) => ({ id, left, top, scaleX, scaleY, angle, flipX })), structuralBeforeChildEdit, 'direct window drag must not move the host assembly');
assert.deepEqual(afterChildDrag.attachments, [[square.id, rootBrick.id]], 'direct repositioning keeps the attachment');
assert.notDeepEqual(transformOf(afterChildDrag, square.id), transformOf(readyForChildEdit, square.id), `direct window drag must reposition the child: ${JSON.stringify({ childMetric, active: await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker()?.blockfolkLayerId) })}`);
await editControl('smaller'); const afterChildResize = await state();
assert.deepEqual(afterChildResize.layers.filter((layer) => [rootBrick.id, mateBrick.id].includes(layer.id)).map(({ id, left, top, scaleX, scaleY, angle, flipX }) => ({ id, left, top, scaleX, scaleY, angle, flipX })), structuralBeforeChildEdit, 'direct window resize must not resize the host assembly');

const persistedSquareTransform = transformOf(afterChildResize, square.id);
await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; const id = app.current.id; await app.saveCurrent({ quiet: true }); await app.openPicture(id); });
let reloaded = await state();
assert.deepEqual(reloaded.attachments, [[square.id, rootBrick.id]], 'stored page@3 data must restore the runtime attachment Map exactly once on open');
assert.deepEqual(reloaded.persistedAttachments, [{ childLayerId: square.id, hostLayerId: rootBrick.id }]);
assertTransform(transformOf(reloaded, square.id), persistedSquareTransform, 'save/reload must preserve the exact repositioned and resized Square Window transform');
await page.screenshot({ path: resolve(evidence, 'square-window-persisted-400x844.png'), fullPage: true });

const reloadedMate = reloaded.layers.find((layer) => layer.id === mateBrick.id); await nativeTouch(reloadedMate.x, reloadedMate.y, { x: reloadedMate.x - 28, y: reloadedMate.y + 16 });
const followedAfterReload = await state();
const reloadedHostDelta = { x: transformOf(followedAfterReload, rootBrick.id).left - transformOf(reloaded, rootBrick.id).left, y: transformOf(followedAfterReload, rootBrick.id).top - transformOf(reloaded, rootBrick.id).top };
const reloadedChildDelta = { x: transformOf(followedAfterReload, square.id).left - transformOf(reloaded, square.id).left, y: transformOf(followedAfterReload, square.id).top - transformOf(reloaded, square.id).top };
assert.ok(Math.abs(reloadedHostDelta.x - reloadedChildDelta.x) < .01 && Math.abs(reloadedHostDelta.y - reloadedChildDelta.y) < .01, 'a restored attachment must follow its host again');

await selectLayer(square.id); const originalCountBeforeCopy = followedAfterReload.layers.length; await touchControl('#selection-toolbar [data-action="copy"]');
let copiedWindowState = await state(); const copiedWindowId = await page.evaluate(() => window.BlockFolkImaginarium.app.activeSticker()?.blockfolkLayerId); const copiedWindow = copiedWindowState.layers.find((layer) => layer.id === copiedWindowId);
assert.equal(copiedWindowState.layers.length, originalCountBeforeCopy + 1); assert.equal(copiedWindow.assetId, SQUARE);
assert.deepEqual(copiedWindowState.attachments, [[square.id, rootBrick.id]], 'toolbar Copy must keep the original Window attached and leave only the clone free');
assert.deepEqual(copiedWindowState.persistedAttachments, [{ childLayerId: square.id, hostLayerId: rootBrick.id }]);
await touchControl('#selection-toolbar [data-action="trash"]');

await selectLayer(rootBrick.id); const assemblyCountBeforeCopy = (await state()).layers.length; await touchControl('#selection-toolbar [data-action="copy"]');
const copiedAssemblyState = await state();
assert.equal(copiedAssemblyState.layers.length, assemblyCountBeforeCopy + 2, 'structural assembly Copy must copy only its two structural members');
assert.equal(copiedAssemblyState.layers.filter((layer) => layer.assetId === SQUARE).length, 1, 'structural assembly Copy must not copy attached decorations');
assert.deepEqual(copiedAssemblyState.attachments, [[square.id, rootBrick.id]], 'the decoration must remain attached to the original structural host');
await touchControl('#selection-toolbar [data-action="trash"]');

await selectLayer(square.id); await editControl('bigger'); const attachedBeforeDetach = await state(); const beforeDetachTransform = transformOf(attachedBeforeDetach, square.id);
await touchControl(snapSelector); let detached = await state();
assert.equal(detached.attachments.length, 0); assert.deepEqual(detached.persistedAttachments, []); assertTransform(transformOf(detached, square.id), beforeDetachTransform, 'Unsnap must not transform the window');
await touchControl('[data-action="undo"]'); detached = await state();
assert.equal(detached.attachments.length, 0, 'Undo must not resurrect an attachment from a picture snapshot'); assert.deepEqual(detached.persistedAttachments, [], 'Undo must immediately rewrite snapshot attachment data from the live Map');
await touchControl('[data-action="redo"]'); detached = await state();
assert.equal(detached.attachments.length, 0, 'Redo must not resurrect an attachment from a picture snapshot'); assert.deepEqual(detached.persistedAttachments, []);

const freeChild = transformOf(detached, square.id);
await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; const id = app.current.id; await app.saveCurrent({ quiet: true }); await app.openPicture(id); });
reloaded = await state(); assert.equal(reloaded.attachments.length, 0); assert.deepEqual(reloaded.persistedAttachments, []); assertTransform(transformOf(reloaded, square.id), freeChild, 'a detached Window must remain free after save/reload');
const detachedHost = reloaded.layers.find((layer) => layer.id === rootBrick.id); await nativeTouch(detachedHost.x, detachedHost.y, { x: detachedHost.x - 30, y: detachedHost.y + 10 });
assertTransform(transformOf(await state(), square.id), freeChild, 'detached window must not follow later building movement');

const round = await addVisible(ROUND); scene = await state(); const currentHost = scene.layers.find((layer) => layer.id === rootBrick.id);
await dragLayer(round.id, { x: currentHost.x, y: currentHost.y }); const roundBeforeAttach = transformOf(await state(), round.id); await touchControl(snapSelector);
await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; const id = app.current.id; await app.saveCurrent({ quiet: true }); await app.openPicture(id); });
scene = await state(); assert.deepEqual(scene.attachments, [[round.id, rootBrick.id]], 'Round Window must use the same persisted attachment path'); assertTransform(transformOf(scene, round.id), roundBeforeAttach, 'Round Window save/reload must be non-transforming');
await page.evaluate(async (layerId) => window.BlockFolkImaginarium.app.renderCurrentPicture(layerId), round.id);
scene = await state(); assert.deepEqual(scene.attachments, [[round.id, rootBrick.id]], 'an internal current-picture rerender must retain a valid attachment');

const roundRecoveryTransform = transformOf(scene, round.id);
const recoveryJson = await page.evaluate((squareLayerId) => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas(); const value = structuredClone(app.current);
  value.attachments.push(null, { childLayerId: squareLayerId, hostLayerId: 'missing-host' }, { childLayerId: 'missing-child', hostLayerId: value.attachments[0].hostLayerId });
  return JSON.stringify(value);
}, square.id);
await page.locator('#recovery-input').setInputFiles({ name: 'blockfolk-window-attachment-recovery.json', mimeType: 'application/json', buffer: Buffer.from(recoveryJson) });
await page.waitForFunction(() => document.querySelector('#toast')?.textContent === 'Picture recovery opened.');
scene = await state();
assert.deepEqual(scene.attachments, [[round.id, rootBrick.id]], 'recovery import must restore only the valid relation and ignore malformed or dangling records');
assert.deepEqual(scene.persistedAttachments, [{ childLayerId: round.id, hostLayerId: rootBrick.id }]);
assertTransform(transformOf(scene, round.id), roundRecoveryTransform, 'recovery attachment restoration must not change the child transform');

await selectLayer(round.id); await touchControl('#selection-toolbar [data-action="trash"]');
scene = await state(); assert.equal(scene.attachments.length, 0, 'deleting an endpoint must prune its attachment'); assert.deepEqual(scene.persistedAttachments, []); assert.equal(scene.layers.some((layer) => layer.id === rootBrick.id), true, 'deleting the child must not cascade to its host');

assert.deepEqual(requests, [], 'window attachment persistence must remain offline');
assert.deepEqual(failures, [], failures.join('\n'));
await browser.close();
console.log(`BlockFolk window attachment browser scenario passed: ${evidence}`);
