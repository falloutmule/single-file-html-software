/* global Image, document */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, process.env.BLOCKFOLK_WINDOW_EVIDENCE_DIRECTORY || 'test-results/blockfolk-windows-001');
const alphaThreshold = 8;
const assets = [
  ['sticker-blockfolk-square-window', 'square_window.png'],
  ['sticker-blockfolk-round-window', 'round_window.png']
].map(([assetId, file]) => ({ assetId, file, dataUrl: `data:image/png;base64,${readFileSync(resolve(root, 'src/assets/blockfolk', file)).toString('base64')}` }));

await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
const measurements = await page.evaluate(async ({ entries, threshold }) => Promise.all(entries.map(async (entry) => {
  const image = new Image(); image.src = entry.dataUrl; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width; let minY = canvas.height; let maxX = -1; let maxY = -1; let paintedPixels = 0;
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    if (pixels[(y * canvas.width + x) * 4 + 3] <= threshold) continue;
    paintedPixels += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const width = maxX - minX + 1; const height = maxY - minY + 1;
  return {
    assetId: entry.assetId, file: entry.file, sourceWidth: canvas.width, sourceHeight: canvas.height, paintedPixels,
    bounds: { minX, minY, maxX, maxY, width, height },
    centerOffset: { x: Number((((minX + maxX) / 2) - ((canvas.width - 1) / 2)).toFixed(3)), y: Number((((minY + maxY) / 2) - ((canvas.height - 1) / 2)).toFixed(3)) },
    normalizedPaintedExtent: { width: Number((width / canvas.width).toFixed(6)), height: Number((height / canvas.height).toFixed(6)) }
  };
})), { entries: assets, threshold: alphaThreshold });
await browser.close();

for (const measurement of measurements) {
  assert.ok(measurement.paintedPixels > 0);
  assert.ok(Math.abs(measurement.centerOffset.x) <= 1 && Math.abs(measurement.centerOffset.y) <= 1, `${measurement.file} painted bounds must remain centered within one source pixel`);
  assert.ok(measurement.normalizedPaintedExtent.height >= .84 && measurement.normalizedPaintedExtent.height <= .88, `${measurement.file} must retain the reviewed one-cell wall height envelope`);
}
const report = {
  schema: 'blockfolk.window-calibration@1', paintedPixelCriterion: `decoded PNG alpha > ${alphaThreshold} on the 0-255 scale`,
  releaseGuards: { maximumAbsoluteCenterOffsetSourcePx: 1, normalizedPaintedHeightRange: [.84, .88] }, assets: measurements
};
await writeFile(resolve(evidence, 'window-calibration.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('BLOCKFOLK_WINDOW_CALIBRATION PASS', JSON.stringify(report));
