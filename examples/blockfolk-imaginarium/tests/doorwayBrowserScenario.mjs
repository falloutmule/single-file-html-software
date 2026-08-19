/* global PointerEvent, document, structuredClone, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const runKind = process.env.BLOCKFOLK_ARTIFACT_URL ? 'live' : 'local';
const evidenceDirectory = resolve(projectRoot, process.env.BLOCKFOLK_EVIDENCE_DIRECTORY || `test-results/doorway-geometry-repair/${runKind}`);
await mkdir(evidenceDirectory, { recursive: true });

const failures = []; const runtimeRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  runtimeRequests.push(url); failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage(); const cdp = await context.newCDPSession(page);
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });

await page.goto(artifactUrl, { waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(async () => { await window.BlockFolkImaginarium.app.startNewPicture(false); window.BlockFolkImaginarium.app.openStartingLocation('world-center'); });
await page.locator('#editor-screen:not([hidden])').waitFor();

async function screenshotBoth(name) {
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(100);
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}-400x844.png`), fullPage: true });
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(100);
  await page.screenshot({ path: resolve(evidenceDirectory, `${name}-844x400.png`), fullPage: true });
  await page.setViewportSize({ width: 400, height: 844 }); await page.waitForTimeout(100);
}

async function nativeTouchTap(selector) {
  const rect = await page.locator(selector).boundingBox(); assert.ok(rect, `touch target must have bounds: ${selector}`);
  const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, radiusX: 8, radiusY: 8, force: .8, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function canvasPointerDrag(layerId, dx, dy) {
  const point = await page.evaluate((id) => {
    const app = window.BlockFolkImaginarium.app; const object = app.canvas.getObjects().find((item) => item.blockfolkLayerId === id); const transform = app.canvas.viewportTransform;
    return { x: object.left * transform[0] + transform[4], y: object.top * transform[3] + transform[5] };
  }, layerId);
  await page.evaluate(({ point: start, dx: moveX, dy: moveY }) => {
    const surface = window.BlockFolkImaginarium.app.canvas.upperCanvasEl; const rect = surface.getBoundingClientRect();
    const send = (type, x, y, buttons) => surface.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 71, pointerType: 'touch', isPrimary: true, clientX: rect.left + x, clientY: rect.top + y, buttons }));
    send('pointerdown', start.x, start.y, 1); send('pointermove', start.x + moveX, start.y + moveY, 1); send('pointerup', start.x + moveX, start.y + moveY, 0);
  }, { point, dx, dy });
  await page.waitForTimeout(80);
}

const doorwayState = () => page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; app.syncCurrentFromCanvas();
  return {
    stickers: app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex })),
    connections: structuredClone(app.current.connections),
    exportDataUrl: app.exportDataUrl()
  };
});

async function seedUnsnapped(blockAssetId = 'sticker-blockfolk-brick-stone-block') {
  return page.evaluate(async (assetId) => {
    const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); app.camera = { centerX: 2048, centerY: 2048, zoom: 5 }; app.applyCamera();
    await app.addSticker('sticker-blockfolk-stone-door');
    for (let index = 0; index < 5; index += 1) await app.addSticker(assetId);
    const [door, ...blocks] = app.canvas.getObjects(); const pitch = 96.1322435461142; const rise = 68.8194771631714;
    const doorOriginY = door.top + (398 - 424 / 2) * door.scaleY; const cells = [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2]];
    blocks.forEach((block, index) => {
      const blockOriginOffsetY = assetId.includes('brick') ? (300 - 325 / 2) * block.scaleY : (301 - 326 / 2) * block.scaleY;
      block.set({ left: door.left + cells[index][0] * pitch + 32, top: doorOriginY - cells[index][1] * rise - blockOriginOffsetY }); block.setCoords();
    });
    app.canvas.discardActiveObject(); app.syncCurrentFromCanvas(); app.canvas.requestRenderAll();
    return { door: door.blockfolkLayerId, blocks: blocks.map((block) => block.blockfolkLayerId) };
  }, blockAssetId);
}

async function buildDoorFirst(blockAssetId) {
  return page.evaluate(async (assetId) => {
    const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); app.camera = { centerX: 2048, centerY: 2048, zoom: 5 }; app.applyCamera();
    await app.addSticker('sticker-blockfolk-stone-door');
    const door = app.canvas.getObjects()[0]; door.set({ left: 2048, top: 2120 }); door.setCoords();
    const pitch = 96.1322435461142; const rise = 68.8194771631714; const cells = [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2]];
    const blocks = [];
    for (const [column, tier] of cells) {
      await app.addSticker(assetId); const block = app.canvas.getObjects().at(-1); const doorOriginY = door.top + (398 - 424 / 2) * door.scaleY;
      const blockOriginOffsetY = assetId.includes('brick') ? (300 - 325 / 2) * block.scaleY : (301 - 326 / 2) * block.scaleY;
      block.set({ left: door.left + column * pitch + .2, top: doorOriginY - tier * rise - blockOriginOffsetY }); block.setCoords();
      app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); await app.snapSelected(); blocks.push(block.blockfolkLayerId);
    }
    app.canvas.discardActiveObject(); app.syncCurrentFromCanvas(); app.canvas.requestRenderAll();
    return { door: door.blockfolkLayerId, blocks, connectionCount: app.current.connections.length };
  }, blockAssetId);
}

async function buildWallFirst() {
  return page.evaluate(async () => {
    const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); app.camera = { centerX: 2048, centerY: 2048, zoom: 5 }; app.applyCamera();
    const blockAssetId = 'sticker-blockfolk-brick-stone-block'; const cells = [[-1, 0], [1, 0], [-1, 1], [1, 1], [0, 2]]; const pitch = 96.1322435461142; const rise = 68.8194771631714;
    for (let index = 0; index < 5; index += 1) await app.addSticker(blockAssetId);
    const blocks = app.canvas.getObjects(); const doorLeft = 2048; const doorTop = 2120; const doorScale = (420 / (1.1 ** 10)) / 424; const doorOriginY = doorTop + (398 - 424 / 2) * doorScale;
    blocks.forEach((block, index) => { const [column, tier] = cells[index]; const blockOriginOffsetY = (300 - 325 / 2) * block.scaleY; block.set({ left: doorLeft + column * pitch, top: doorOriginY - tier * rise - blockOriginOffsetY }); block.setCoords(); });
    app.syncCurrentFromCanvas();
    app.current.connections = blocks.slice(1).map((block, index) => ({ id: `wall-${index}`, aLayerId: blocks[index].blockfolkLayerId, bLayerId: block.blockfolkLayerId, aAssetId: blockAssetId, bAssetId: blockAssetId, aAnchorId: 'southEast', bAnchorId: 'northWest' }));
    await app.addSticker('sticker-blockfolk-stone-door'); const door = app.canvas.getObjects().at(-1); door.set({ left: doorLeft + 7, top: doorTop }); door.setCoords(); app.canvas.setActiveObject(door); app.syncCurrentFromCanvas(); app.updateSelection(); await app.snapSelected();
    app.canvas.discardActiveObject(); app.syncCurrentFromCanvas(); app.canvas.requestRenderAll();
    return { door: door.blockfolkLayerId, blocks: blocks.map((block) => block.blockfolkLayerId), connectionCount: app.current.connections.length };
  });
}

await seedUnsnapped();
assert.equal((await doorwayState()).connections.length, 0, 'nearby doorway pieces must remain independent until Snap is pressed');
await screenshotBoth('01-unsnapped-door-near-blocks');

const brickDoorway = await buildDoorFirst('sticker-blockfolk-brick-stone-block');
assert.ok(brickDoorway.connectionCount >= 5, 'door-first Brick construction must keep at least the five authored doorway links');
let state = await doorwayState();
assert.equal(state.connections.every((item) => item.aAnchorId !== 'backFace' && item.bAnchorId !== 'backFace'), true, 'new doorway construction must never use the legacy center overlay');
assert.equal(state.connections.filter((item) => item.aAssetId === 'sticker-blockfolk-stone-door' || item.bAssetId === 'sticker-blockfolk-stone-door').length, 5, 'door-first Brick construction must occupy all five unique Stone Door sockets exactly once');
assert.equal(new Set(state.connections.flatMap((item) => [item.aAnchorId, item.bAnchorId]).filter((id) => id.startsWith('door'))).size, 5, 'all five unique Stone Door sockets must be occupied once');
await screenshotBoth('02-completed-brick-doorway');

const logDoorway = await buildDoorFirst('sticker-blockfolk-wood-log-block');
assert.ok(logDoorway.connectionCount >= 5, 'door-first Log construction must keep at least the five authored doorway links');
assert.equal((await doorwayState()).connections.filter((item) => item.aAssetId === 'sticker-blockfolk-stone-door' || item.bAssetId === 'sticker-blockfolk-stone-door').length, 5, 'door-first Log construction must occupy all five unique Stone Door sockets exactly once');
await screenshotBoth('03-completed-log-doorway');

const wallFirst = await buildWallFirst();
assert.equal(wallFirst.connectionCount, 9, 'wall-first insertion must retain four wall links and atomically add five doorway links');
state = await doorwayState(); const wallFirstBeforeMove = state.stickers;
await canvasPointerDrag(wallFirst.door, 34, 22);
state = await doorwayState();
const doorDelta = state.stickers.map((item, index) => ({ x: item.x - wallFirstBeforeMove[index].x, y: item.y - wallFirstBeforeMove[index].y }));
assert.equal(doorDelta.every((delta) => Math.abs(delta.x - doorDelta[0].x) < .01 && Math.abs(delta.y - doorDelta[0].y) < .01), true, 'dragging the door must move every doorway member by one identical delta');
await screenshotBoth('04-assembly-moved-by-door');

const beforeBlockMove = state.stickers;
await canvasPointerDrag(wallFirst.blocks[0], -26, 18);
state = await doorwayState();
const blockDelta = state.stickers.map((item, index) => ({ x: item.x - beforeBlockMove[index].x, y: item.y - beforeBlockMove[index].y }));
assert.equal(blockDelta.every((delta) => Math.abs(delta.x - blockDelta[0].x) < .01 && Math.abs(delta.y - blockDelta[0].y) < .01), true, 'dragging a jamb must move every doorway member by one identical delta');
await screenshotBoth('05-assembly-moved-by-block');

// Whole-assembly editing, persistence, puzzle flattening, and PNG export.
const operationProof = await page.evaluate(async (doorLayerId) => {
  const app = window.BlockFolkImaginarium.app; const select = (id) => { const object = app.canvas.getObjects().find((item) => item.blockfolkLayerId === id); app.canvas.setActiveObject(object); app.updateSelection(); return object; };
  select(doorLayerId); const baseConnections = app.current.connections.length; const baseStickers = app.canvas.getObjects().length;
  await app.resizeSelected(1.1); await app.flipSelected(); const afterFlipConnections = app.current.connections.length;
  await app.addSticker('sticker-blockfolk-wolf'); const wolf = app.activeSticker(); wolf.set({ left: 2048, top: 2048 }); wolf.setCoords(); select(doorLayerId); await app.moveSelectedDepth(-1); await app.moveSelectedDepth(1);
  const beforeCopy = app.canvas.getObjects().length; await app.copySelected(); const afterCopy = app.canvas.getObjects().length; const afterCopyConnections = app.current.connections.length;
  await app.trashSelected(); const afterTrash = app.canvas.getObjects().length; await app.undo(); const afterUndo = app.canvas.getObjects().length; await app.redo(); const afterRedo = app.canvas.getObjects().length; await app.undo();
  await app.saveCurrent({ quiet: true }); const pictureId = app.current.id; const saved = structuredClone(app.current); const exportDataUrl = app.exportDataUrl(); const puzzle = await app.flattenPictureForPuzzle(pictureId); await app.openPicture(pictureId); app.syncCurrentFromCanvas();
  return { baseConnections, baseStickers, afterFlipConnections, beforeCopy, afterCopy, afterCopyConnections, afterTrash, afterUndo, afterRedo, saved, reloaded: structuredClone(app.current), exportLength: exportDataUrl.length, puzzleLength: puzzle.dataUrl.length };
}, wallFirst.door);
assert.equal(operationProof.afterFlipConnections, operationProof.baseConnections, 'assembly resize and flip must preserve every connection');
assert.equal(operationProof.afterCopy - operationProof.beforeCopy, 6, 'Copy must duplicate all six doorway members');
assert.equal(operationProof.afterCopyConnections - operationProof.baseConnections, operationProof.baseConnections, 'Copy must duplicate every doorway and wall link with fresh IDs');
assert.equal(operationProof.afterTrash, operationProof.beforeCopy, 'Trash must remove the copied six-piece assembly');
assert.equal(operationProof.afterUndo, operationProof.afterCopy); assert.equal(operationProof.afterRedo, operationProof.beforeCopy);
assert.deepEqual(operationProof.reloaded, operationProof.saved, 'save/reload must preserve doorway geometry, graph, transforms, and z-order exactly');
assert.ok(operationProof.exportLength > 10000 && operationProof.puzzleLength > 10000, 'PNG export and puzzle input must contain the rendered doorway');

// Deliberately detach one member using the permanent contextual controller.
const detachDoorway = await buildDoorFirst('sticker-blockfolk-brick-stone-block');
await page.evaluate((layerId) => { const app = window.BlockFolkImaginarium.app; const member = app.canvas.getObjects().find((item) => item.blockfolkLayerId === layerId); app.canvas.setActiveObject(member); app.updateSelection(); }, detachDoorway.blocks[0]);
const controllerBeforeDetach = await page.evaluate(() => { const app = window.BlockFolkImaginarium.app; const root = app.root.querySelector('[data-action="snap-context"]').closest('.sfhs-cf-root'); window.__doorwaySnapRoot = root; return { id: root.dataset.sfhsControlId, connections: app.current.connections.length, activations: app.controls.activationCount }; });
await nativeTouchTap('#selection-toolbar [data-action="snap-context"]'); await page.waitForTimeout(900);
const detachProof = await page.evaluate((before) => { const app = window.BlockFolkImaginarium.app; const root = app.root.querySelector('[data-action="snap-context"]').closest('.sfhs-cf-root'); return { sameRoot: root === window.__doorwaySnapRoot, id: root.dataset.sfhsControlId, connections: app.current.connections.length, activationDelta: app.controls.activationCount - before.activations, toast: document.querySelector('#toast').textContent }; }, controllerBeforeDetach);
assert.equal(detachProof.sameRoot, true); assert.equal(detachProof.id, controllerBeforeDetach.id); assert.equal(detachProof.activationDelta, 1); assert.equal(detachProof.toast, 'Sticker detached.');
assert.ok(detachProof.connections < controllerBeforeDetach.connections, 'intentional Unsnap must remove only the selected member links');
await page.locator('[data-action="undo"]').click(); await page.waitForTimeout(80);
assert.equal((await doorwayState()).connections.length, controllerBeforeDetach.connections, 'Unsnap must restore through one Undo action');
await page.locator('[data-action="redo"]').click(); await page.waitForTimeout(80);
assert.equal((await doorwayState()).connections.length, detachProof.connections, 'Unsnap must reapply through one Redo action');
await page.evaluate((layerId) => { const app = window.BlockFolkImaginarium.app; const member = app.canvas.getObjects().find((item) => item.blockfolkLayerId === layerId); member.set({ left: member.left - 80 }); member.setCoords(); app.canvas.setActiveObject(member); app.canvas.requestRenderAll(); }, detachDoorway.blocks[0]);
await screenshotBoth('06-deliberately-unsnapped-member');

// Duplicate, occupied-opening, incompatible, crowded, and size-mismatch cases
// must reject predictably without corrupting the doorway graph.
const duplicateDoorway = await buildDoorFirst('sticker-blockfolk-brick-stone-block');
const duplicateProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; const door = app.canvas.getObjects().find((item) => item.blockfolkAssetId === 'sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-brick-stone-block'); const block = app.canvas.getObjects().at(-1);
  const doorOriginY = door.top + (398 - 424 / 2) * door.scaleY; block.set({ left: door.left - 96.1322435461142, top: doorOriginY - (300 - 325 / 2) * block.scaleY }); block.setCoords(); app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); const before = app.current.connections.length; await app.snapSelected();
  return { before, after: app.current.connections.length, toast: document.querySelector('#toast').textContent };
});
assert.deepEqual(duplicateProof, { before: duplicateDoorway.connectionCount, after: duplicateDoorway.connectionCount, toast: 'That doorway spot is filled' }, 'a duplicate authored doorway slot must be rejected without adding a connection');

const occupiedOpeningProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); await app.addSticker('sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-brick-stone-block'); const [door, block] = app.canvas.getObjects(); door.set({ left: 2048, top: 2120 }); const doorOriginY = door.top + (398 - 424 / 2) * door.scaleY; block.set({ left: door.left, top: doorOriginY - (300 - 325 / 2) * block.scaleY }); door.setCoords(); block.setCoords(); app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); await app.snapSelected(); return { connections: app.current.connections.length, toast: document.querySelector('#toast').textContent };
});
assert.deepEqual(occupiedOpeningProof, { connections: 0, toast: 'Keep doorway clear' }, 'a complete block directly behind the door must be rejected');

const incompatibleProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); await app.addSticker('sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-stone-block'); const [door, block] = app.canvas.getObjects(); door.set({ left: 2048, top: 2120 }); block.set({ left: 1952, top: 2120 }); door.setCoords(); block.setCoords(); app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); await app.snapSelected(); return { connections: app.current.connections.length, toast: document.querySelector('#toast').textContent };
});
assert.deepEqual(incompatibleProof, { connections: 0, toast: 'Move closer to snap' }, 'an incompatible block must not acquire a Stone Door socket');

const crowdedProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); await app.addSticker('sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-brick-stone-block'); const [doorB, doorA, block] = app.canvas.getObjects(); doorB.blockfolkLayerId = 'crowded-door-b'; doorA.blockfolkLayerId = 'crowded-door-a'; block.blockfolkLayerId = 'crowded-block'; doorB.set({ left: 2048, top: 2120 }); doorA.set({ left: 2048, top: 2120 }); const doorOriginY = doorA.top + (398 - 424 / 2) * doorA.scaleY; block.set({ left: doorA.left - 96.1322435461142 + .5, top: doorOriginY - (300 - 325 / 2) * block.scaleY }); doorB.setCoords(); doorA.setCoords(); block.setCoords(); app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); const proposal = app.proposeSnap([block]); return { target: proposal.candidate?.target?.blockfolkLayerId, anchor: proposal.candidate?.targetAnchor?.id };
});
assert.deepEqual(crowdedProof, { target: 'crowded-door-a', anchor: 'doorJambLowerLeft' }, 'equal-distance crowded targets must resolve by stable layer ID and authored priority');

const rejectionProof = await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); await app.addSticker('sticker-blockfolk-stone-door'); await app.addSticker('sticker-blockfolk-brick-stone-block');
  const [door, block] = app.canvas.getObjects(); door.set({ left: 2048, top: 2120 }); const doorOriginY = door.top + (398 - 424 / 2) * door.scaleY; block.set({ left: door.left - 96.1322435461142, top: doorOriginY - (300 - 325 / 2) * block.scaleY, scaleX: block.scaleX * 1.02, scaleY: block.scaleY * 1.02 }); door.setCoords(); block.setCoords(); app.canvas.setActiveObject(block); app.syncCurrentFromCanvas(); app.updateSelection(); await app.snapSelected();
  return { connections: app.current.connections.length, toast: document.querySelector('#toast').textContent };
});
assert.deepEqual(rejectionProof, { connections: 0, toast: 'Match piece sizes' }, 'mismatched doorway pieces must remain independent with clear size guidance');

// Native touch: one physical touch snaps once, survives the delayed click
// window, then one later deliberate touch detaches once on the same controller.
await page.evaluate(async () => {
  const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); await app.addSticker('sticker-blockfolk-brick-stone-block'); await app.addSticker('sticker-blockfolk-brick-stone-block');
  const [first, second] = app.canvas.getObjects(); first.set({ left: 1960, top: 2050 }); second.set({ left: 1960 + first.getScaledWidth() * .4 + second.getScaledWidth() * .4 + 4, top: 2050 + first.getScaledHeight() * .2 + second.getScaledHeight() * .2 }); first.setCoords(); second.setCoords(); app.canvas.setActiveObject(second); app.syncCurrentFromCanvas(); app.updateSelection();
  const root = app.root.querySelector('[data-action="snap-context"]').closest('.sfhs-cf-root'); window.__nativeSnapRoot = root; window.__nativeSnapBefore = { id: root.dataset.sfhsControlId, activations: app.controls.activationCount };
});
await nativeTouchTap('#selection-toolbar [data-action="snap-context"]'); await page.waitForTimeout(900);
const nativeSnapProof = await page.evaluate(() => { const app = window.BlockFolkImaginarium.app; const root = app.root.querySelector('[data-action="snap-context"]').closest('.sfhs-cf-root'); return { connections: app.current.connections.length, activationDelta: app.controls.activationCount - window.__nativeSnapBefore.activations, sameRoot: root === window.__nativeSnapRoot, id: root.dataset.sfhsControlId, state: root.dataset.contextState }; });
assert.deepEqual(nativeSnapProof, { connections: 1, activationDelta: 1, sameRoot: true, id: nativeSnapProof.id, state: 'unsnap' });
assert.equal(nativeSnapProof.id, await page.evaluate(() => window.__nativeSnapBefore.id));
await nativeTouchTap('#selection-toolbar [data-action="snap-context"]'); await page.waitForTimeout(900);
assert.deepEqual(await page.evaluate(() => { const app = window.BlockFolkImaginarium.app; const root = app.root.querySelector('[data-action="snap-context"]').closest('.sfhs-cf-root'); return { connections: app.current.connections.length, activationDelta: app.controls.activationCount - window.__nativeSnapBefore.activations, sameRoot: root === window.__nativeSnapRoot, state: root.dataset.contextState, toast: document.querySelector('#toast').textContent }; }), { connections: 0, activationDelta: 2, sameRoot: true, state: 'snap', toast: 'Sticker detached.' }, 'a later deliberate touch must detach exactly once on the same permanent controller');

assert.deepEqual(runtimeRequests, []); assert.deepEqual(failures, []);
console.log('BLOCKFOLK_DOORWAY_BROWSER PASS', JSON.stringify({ runKind, artifactUrl, screenshots: 12, brickDoorwayConnections: brickDoorway.connectionCount, logDoorwayConnections: logDoorway.connectionCount, wallFirstConnections: wallFirst.connectionCount, nativeTouch: nativeSnapProof, runtimeRequests: 0, evidenceDirectory }));
await browser.close();
