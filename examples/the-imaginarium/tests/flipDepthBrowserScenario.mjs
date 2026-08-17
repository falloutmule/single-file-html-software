/* global document, getComputedStyle, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const evidenceDirectory = resolve(projectRoot, 'test-results/flip-depth-controls');
await mkdir(evidenceDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const failures = [];
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/iu.test(url)) return route.continue();
  failures.push(`Unexpected request: ${url}`); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`Page error: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`Console error: ${message.text()}`); });
await page.goto(artifactUrl, { waitUntil: 'load' });
await page.locator('#app[data-boot="ready"]').waitFor();

await page.getByRole('button', { name: /Make a Picture/ }).click();
await page.locator('#editor-screen:not([hidden])').waitFor();
await page.locator('[data-category="blockfolk"]').scrollIntoViewIfNeeded();
await page.locator('[data-category="blockfolk"]').click();

for (const [index, id] of ['sticker-blockfolk-stone-block', 'sticker-blockfolk-broadleaf-tree', 'sticker-blockfolk-wood-door', 'sticker-blockfolk-farmer-pitchfork'].entries()) {
  await page.locator(`[data-sticker-id="${id}"]`).click();
  await page.waitForFunction((count) => window.Imaginarium.diagnostics().stickers === count, index + 1);
}
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4);

await page.evaluate(() => {
  const app = window.Imaginarium.app;
  const objects = app.canvas.getObjects();
  const placements = [[470, 720], [600, 700], [540, 720], [630, 710]];
  objects.forEach((object, index) => { object.set({ left: placements[index][0], top: placements[index][1] }); object.setCoords(); });
  app.canvas.setActiveObject(objects[2]); app.canvas.requestRenderAll(); app.updateSelection();
});

const toolbarLayout = await page.locator('#selection-toolbar').evaluate((toolbar) => {
  const buttons = [...toolbar.querySelectorAll('button')];
  return {
    clientWidth: toolbar.clientWidth,
    scrollWidth: toolbar.scrollWidth,
    labels: buttons.map((button) => button.getAttribute('aria-label')),
    minimumWidth: Math.min(...buttons.map((button) => button.getBoundingClientRect().width)),
    touchAction: getComputedStyle(buttons[0].querySelector('.sfhs-cf-interactive') || buttons[0]).touchAction
  };
});
assert.deepEqual(toolbarLayout.labels, ['Smaller', 'Bigger', 'Turn', 'Flip', 'Behind', 'In Front', 'Copy', 'Trash']);
assert.ok(toolbarLayout.scrollWidth > toolbarLayout.clientWidth, 'phone toolbar must scroll instead of shrinking its controls');
assert.ok(toolbarLayout.minimumWidth >= 69, 'phone toolbar controls must retain comfortable width');
assert.equal(toolbarLayout.touchAction, 'pan-x', 'toolbar controls must allow horizontal touch scrolling');

const objectState = () => page.evaluate(() => {
  const app = window.Imaginarium.app;
  const active = app.activeSticker();
  return {
    activeId: active?.imaginariumLayerId || null,
    active: active ? { left: active.left, top: active.top, scaleX: active.scaleX, scaleY: active.scaleY, angle: active.angle, flipX: active.flipX } : null,
    order: app.canvas.getObjects().map((object) => object.imaginariumAssetId)
  };
});

const originalDoor = await objectState();
assert.equal(originalDoor.order[2], 'sticker-blockfolk-wood-door');
await page.locator('[data-action="flip"]').click();
let state = await objectState();
assert.equal(state.active.flipX, true, 'first Flip must mirror Wood Door');
assert.deepEqual({ left: state.active.left, top: state.active.top, scaleX: state.active.scaleX, scaleY: state.active.scaleY, angle: state.active.angle }, { left: originalDoor.active.left, top: originalDoor.active.top, scaleX: originalDoor.active.scaleX, scaleY: originalDoor.active.scaleY, angle: originalDoor.active.angle }, 'Flip must preserve center, size, and rotation');
await page.locator('[data-action="flip"]').click();
assert.equal((await objectState()).active.flipX, false, 'second Flip must restore Wood Door');

await page.locator('[data-action="turn"]').click();
await page.locator('[data-action="flip"]').click();
state = await objectState();
assert.equal(state.active.angle, 15); assert.equal(state.active.flipX, true);

await page.locator('[data-action="behind"]').click();
const behindOnce = await objectState();
assert.deepEqual(behindOnce.order, ['sticker-blockfolk-stone-block', 'sticker-blockfolk-wood-door', 'sticker-blockfolk-broadleaf-tree', 'sticker-blockfolk-farmer-pitchfork'], 'Behind must move Wood Door exactly one step');
assert.equal(behindOnce.activeId, originalDoor.activeId, 'Behind must preserve selection');
await page.locator('[data-action="undo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4 && window.Imaginarium.app.activeSticker());
assert.deepEqual((await objectState()).order, originalDoor.order, 'Undo must restore prior depth');
assert.equal((await objectState()).activeId, originalDoor.activeId, 'Undo must preserve the edited sticker selection');
await page.locator('[data-action="redo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4 && window.Imaginarium.app.activeSticker());
assert.deepEqual((await objectState()).order, behindOnce.order, 'Redo must restore depth change');

await page.locator('[data-action="behind"]').click();
assert.equal((await objectState()).order[0], 'sticker-blockfolk-wood-door', 'a repeated Behind press must reach the back sticker position');
assert.equal(await page.locator('[data-action="behind"]').isDisabled(), true, 'Behind must disable at the back boundary');
await page.locator('[data-action="in-front"]').click();
const inFrontOnce = await objectState();
assert.equal(inFrontOnce.order[1], 'sticker-blockfolk-wood-door', 'In Front must move exactly one step');
assert.equal(inFrontOnce.activeId, originalDoor.activeId, 'In Front must preserve selection');
await page.locator('[data-action="undo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4 && window.Imaginarium.app.activeSticker());
assert.equal((await objectState()).order[0], 'sticker-blockfolk-wood-door');
await page.locator('[data-action="redo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4 && window.Imaginarium.app.activeSticker());
assert.deepEqual((await objectState()).order, inFrontOnce.order);

await page.locator('[data-action="copy"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 5);
const copiedDoor = await objectState();
assert.equal(copiedDoor.active.flipX, true, 'Copy must inherit Flip');
assert.equal(copiedDoor.active.angle, 15, 'Copy must inherit Turn');
assert.equal(copiedDoor.order.at(-1), 'sticker-blockfolk-wood-door', 'Copy must use deterministic existing front placement');
assert.notEqual(copiedDoor.activeId, originalDoor.activeId, 'copy must remain independently editable');
assert.equal(await page.locator('[data-action="in-front"]').isDisabled(), true, 'In Front must disable at the front boundary');
await page.locator('[data-action="flip"]').click();
assert.equal((await objectState()).active.flipX, false, 'copied sticker must flip independently');
await page.locator('[data-action="undo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 5 && window.Imaginarium.app.activeSticker());
assert.equal((await objectState()).active.flipX, true, 'Undo must restore copied sticker orientation');
await page.locator('[data-action="redo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 5 && window.Imaginarium.app.activeSticker());
assert.equal((await objectState()).active.flipX, false, 'Redo must restore copied sticker edit');

const beforeSave = await page.evaluate(() => {
  const app = window.Imaginarium.app; app.syncCurrentFromCanvas();
  return app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }));
});
const savedPictureId = await page.evaluate(async () => {
  const app = window.Imaginarium.app; await app.saveCurrent({ quiet: true }); const id = app.current.id; await app.goHome(); await app.openPicture(id); return id;
});
const afterReopen = await page.evaluate(() => {
  const app = window.Imaginarium.app; app.syncCurrentFromCanvas();
  return app.current.stickers.map(({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }) => ({ layerId, assetId, x, y, scaleX, scaleY, angle, flipX, zIndex }));
});
assert.deepEqual(afterReopen, beforeSave, 'save and gallery reopen must preserve combined transform and stack state');
assert.deepEqual(await page.evaluate(() => window.Imaginarium.app.canvas.getObjects().map((object) => object.imaginariumLayerId)), afterReopen.map((sticker) => sticker.layerId), 'editor and serialized export order must match');
const exportLength = await page.evaluate(() => window.Imaginarium.app.exportDataUrl().length);
assert.ok(exportLength > 100000, 'PNG export must render the transformed Blockfolk scene');

await page.evaluate(() => {
  const app = window.Imaginarium.app;
  const farmer = app.canvas.getObjects().find((object) => object.imaginariumAssetId === 'sticker-blockfolk-farmer-pitchfork');
  app.canvas.setActiveObject(farmer); app.canvas.requestRenderAll(); app.updateSelection();
});
await page.locator('[data-action="flip"]').click();
assert.equal((await objectState()).active.flipX, true, 'Flip must also mirror an asymmetric Blockfolk character');
await page.locator('[data-action="flip"]').click();
assert.equal((await objectState()).active.flipX, false, 'the character must return to its original orientation');

await page.evaluate(() => {
  const app = window.Imaginarium.app; const active = app.canvas.getObjects().at(-1);
  app.canvas.setActiveObject(active); app.canvas.requestRenderAll(); app.updateSelection();
  document.querySelector('#selection-toolbar').scrollLeft = 190;
});
await page.locator('#selection-toolbar:not([hidden])').waitFor();
await page.screenshot({ path: resolve(evidenceDirectory, 'flip-depth-phone.png') });
assert.deepEqual(failures, []);
console.log('IMAGINARIUM_FLIP_DEPTH_BROWSER_SCENARIO PASS', JSON.stringify({ savedPictureId, toolbarLayout, exportLength, evidenceDirectory }));
await browser.close();
