/* global Buffer, window */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, 'test-results/construction-pass-001/background-sharpness');
const artifactUrl = pathToFileURL(resolve(root, 'dist/index.html')).href;
await mkdir(evidence, { recursive: true });

const failures = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') failures.push(message.text()); });
await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
await page.evaluate(async () => { const app = window.BlockFolkImaginarium.app; await app.startNewPicture(false); app.openStartingLocation('forest-river'); });
await page.waitForTimeout(120);
const capture = await page.evaluate(() => {
  const app = window.BlockFolkImaginarium.app; const canvas = app.canvas.lowerCanvasEl; const dataUrl = canvas.toDataURL('image/png');
  return { render: app.diagnostics().render, world: app.diagnostics().world, canvasDataUrl: dataUrl };
});
const png = Buffer.from(capture.canvasDataUrl.split(',')[1], 'base64');
await writeFile(resolve(evidence, 'app-forest-river-canvas.png'), png);
await page.screenshot({ path: resolve(evidence, 'app-forest-river-browser-400x844.png'), fullPage: true });
await writeFile(resolve(evidence, 'render-diagnosis.json'), `${JSON.stringify({ artifactUrl, ...capture, canvasDataUrl: undefined, pageErrors: failures }, null, 2)}\n`);
if (failures.length) throw new Error(`Background diagnosis browser errors: ${failures.join('; ')}`);
if (capture.render.retinaScale < 2 || capture.render.lowerBacking.width < capture.world.viewport.width * 2 || capture.render.backgroundNatural.width !== 4096 || capture.render.imageSmoothingQuality !== 'high') throw new Error(`Unexpected background rendering pipeline: ${JSON.stringify(capture.render)}`);
console.log('BLOCKFOLK_BACKGROUND_SHARPNESS_DIAGNOSIS PASS', JSON.stringify({ evidence, render: capture.render, world: capture.world }));
await browser.close();
