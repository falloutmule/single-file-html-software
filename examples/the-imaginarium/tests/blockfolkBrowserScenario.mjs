/* global document, window */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactUrl = pathToFileURL(resolve(projectRoot, 'dist/index.html')).href;
const evidenceDirectory = resolve(projectRoot, 'test-results/blockfolk-puzzle-color');
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

assert.equal(await page.locator('[data-action="make-puzzle"]').getAttribute('data-control-tone'), 'sky');
await page.getByRole('button', { name: /Make a Picture/ }).click();
await page.locator('#editor-screen:not([hidden])').waitFor();
await page.locator('[data-action="show-backgrounds"]').click();
const blockfolkBackground = page.locator('[data-background-id="background-blockfolk-valley"]');
await blockfolkBackground.waitFor();
assert.equal(await page.locator('.background-button').filter({ hasText: 'Blockfolk Valley' }).locator('img').getAttribute('style'), 'object-position: 10% 50%;');
await blockfolkBackground.click();
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics())).background, 'background-blockfolk-valley');
await page.waitForFunction(() => window.Imaginarium.app.canvas.backgroundImage?._element?.naturalWidth === 1448);

const backgroundLayout = await page.evaluate(() => {
  const image = window.Imaginarium.app.canvas.backgroundImage;
  return { width: image.width, height: image.height, left: image.left, top: image.top, scaleX: image.scaleX, scaleY: image.scaleY };
});
assert.deepEqual({ width: backgroundLayout.width, height: backgroundLayout.height }, { width: 1448, height: 1086 });
assert.ok(Math.abs(backgroundLayout.scaleX - backgroundLayout.scaleY) < 0.000001, 'background must not stretch');
assert.ok(Math.abs(backgroundLayout.left + 84) < 0.01, `background left crop should be about 84 rendered pixels; received ${backgroundLayout.left}`);
assert.ok(Math.abs(backgroundLayout.top) < 0.01, 'background must fill the page height without vertical crop');

await page.locator('[data-action="close-backgrounds"]').click();
const blockfolkCategory = page.locator('[data-category="blockfolk"]');
await blockfolkCategory.scrollIntoViewIfNeeded();
await blockfolkCategory.click();
assert.equal(await page.evaluate(() => window.Imaginarium.app.category), 'blockfolk');
assert.equal(await page.locator('#sticker-list [data-sticker-id^="sticker-blockfolk-"]').count(), 30);

for (const [index, id] of ['sticker-blockfolk-farmer-pitchfork', 'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-red-dragon'].entries()) {
  await page.locator(`#sticker-list [data-sticker-id="${id}"]`).click();
  await page.waitForFunction((count) => window.Imaginarium.diagnostics().stickers === count, index + 1);
}
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics())).stickers, 3);
await page.locator('[data-action="bigger"]').click();
await page.locator('[data-action="turn"]').click();
await page.locator('[data-action="copy"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 4);
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics())).stickers, 4);
await page.locator('[data-action="undo"]').click();
await page.waitForFunction(() => window.Imaginarium.diagnostics().stickers === 3);
assert.equal((await page.evaluate(() => window.Imaginarium.diagnostics())).stickers, 3);
const savedPictureId = await page.evaluate(async () => {
  const app = window.Imaginarium.app;
  await app.saveCurrent({ quiet: true });
  const id = app.current.id;
  await app.goHome();
  await app.openPicture(id);
  return id;
});
assert.ok(savedPictureId);
assert.deepEqual(await page.evaluate(() => {
  const diagnostic = window.Imaginarium.diagnostics();
  return { background: diagnostic.background, stickers: diagnostic.stickers };
}), { background: 'background-blockfolk-valley', stickers: 3 }, 'saved Blockfolk picture must reopen intact');
assert.ok(await page.evaluate(() => window.Imaginarium.app.canvas.toDataURL({ format: 'png', multiplier: 0.25 }).length > 10000), 'PNG export must include the Blockfolk composition');
await page.screenshot({ path: resolve(evidenceDirectory, 'blockfolk-editor-phone.png'), fullPage: true });

await page.evaluate(() => window.Imaginarium.app.goHome());
await page.locator('[data-action="make-puzzle"]').click();
const sourceTones = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#puzzle-source-screen [data-control-tone]')].map((element) => [element.dataset.action, element.dataset.controlTone])));
assert.deepEqual(sourceTones, { 'go-home': 'lilac', 'puzzle-photo': 'yellow', 'puzzle-show-creations': 'mint', 'puzzle-resume': 'purple' });
await page.screenshot({ path: resolve(evidenceDirectory, 'puzzle-source-colors-phone.png'), fullPage: true });

await page.evaluate(async () => {
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="900" height="1200" fill="#85cce4"/><circle cx="450" cy="600" r="280" fill="#ef9bb9"/></svg>');
  await window.Imaginarium.app.puzzle.startFraming(dataUrl, 'Color acceptance');
});
assert.equal(await page.locator('[data-action="puzzle-frame-reset"]').getAttribute('data-control-tone'), 'sky');
await page.locator('[data-action="puzzle-build"]').click();
const playTones = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#puzzle-play-screen [data-control-tone]')].map((element) => [element.dataset.action, element.dataset.controlTone])));
assert.deepEqual(playTones, { 'puzzle-back': 'lilac', 'puzzle-hint': 'yellow', 'puzzle-race': 'pink', 'puzzle-snap': 'mint', 'puzzle-restart': 'lilac', 'puzzle-play-again': 'yellow', 'puzzle-another': 'sky', 'puzzle-done': 'purple' });
await page.screenshot({ path: resolve(evidenceDirectory, 'puzzle-play-colors-phone.png'), fullPage: true });

assert.deepEqual(failures, []);
console.log('IMAGINARIUM_BLOCKFOLK_BROWSER_SCENARIO PASS', JSON.stringify({ backgroundLayout, blockfolkStickers: 30, savedPictureId, evidenceDirectory }));
await browser.close();
