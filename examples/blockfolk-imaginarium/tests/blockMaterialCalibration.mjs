/* global Image, document */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../packages/browser-runner/node_modules/playwright/index.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = resolve(root, process.env.BLOCKFOLK_ALL_MATERIALS_EVIDENCE_DIRECTORY || 'test-results/blockfolk-all-materials-001');
const alphaThreshold = 8;
const assets = [
  ['sticker-blockfolk-grass-dirt-block', 'grass_dirt_block.png'],
  ['sticker-blockfolk-dirt-block', 'dirt_block.png'],
  ['sticker-blockfolk-stone-block', 'stone_block.png'],
  ['sticker-blockfolk-sand-block', 'sand_block.png'],
  ['sticker-blockfolk-snow-block', 'snow_block.png'],
  ['sticker-blockfolk-water-block', 'water_block.png'],
  ['sticker-blockfolk-lava-block', 'lava_block.png'],
  ['sticker-blockfolk-wood-log-block', 'wood_log_block.png'],
  ['sticker-blockfolk-leaf-block', 'leaf_block.png'],
  ['sticker-blockfolk-brick-stone-block', 'brick_stone_block.png']
].map(([assetId, file]) => ({
  assetId, file,
  dataUrl: `data:image/png;base64,${readFileSync(resolve(root, 'src/assets/blockfolk', file)).toString('base64')}`
}));

await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
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
  const paintedWidth = maxX >= minX ? maxX - minX + 1 : 0; const paintedHeight = maxY >= minY ? maxY - minY + 1 : 0;
  return {
    assetId: entry.assetId, file: entry.file, sourceWidth: canvas.width, sourceHeight: canvas.height, paintedPixels,
    bounds: { minX, minY, maxX, maxY, width: paintedWidth, height: paintedHeight },
    centerOffset: {
      x: Number((((minX + maxX) / 2) - ((canvas.width - 1) / 2)).toFixed(3)),
      y: Number((((minY + maxY) / 2) - ((canvas.height - 1) / 2)).toFixed(3))
    },
    normalizedPaintedExtent: {
      width: Number((paintedWidth / canvas.width).toFixed(6)),
      height: Number((paintedHeight / canvas.height).toFixed(6))
    }
  };
})), { entries: assets, threshold: alphaThreshold });
await browser.close();

for (const measurement of measurements) {
  assert.ok(measurement.paintedPixels > 0, `${measurement.file} must have painted pixels above alpha ${alphaThreshold}`);
  assert.ok(Math.abs(measurement.centerOffset.x) <= 1 && Math.abs(measurement.centerOffset.y) <= 1, `${measurement.file} painted bounds must remain centered within one source pixel`);
}
const widthValues = measurements.map((item) => item.normalizedPaintedExtent.width);
const heightValues = measurements.map((item) => item.normalizedPaintedExtent.height);
const widthSpread = Math.max(...widthValues) - Math.min(...widthValues);
const heightSpread = Math.max(...heightValues) - Math.min(...heightValues);
assert.ok(widthSpread <= .015, `Stage 2 normalized painted-width spread ${widthSpread} exceeds 0.015`);
assert.ok(heightSpread <= .015, `Stage 2 normalized painted-height spread ${heightSpread} exceeds 0.015`);

const report = {
  schema: 'blockfolk.block-material-calibration@1',
  paintedPixelCriterion: `decoded PNG alpha > ${alphaThreshold} on the 0-255 scale`,
  releaseGuards: { maximumAbsoluteCenterOffsetSourcePx: 1, maximumCohortNormalizedExtentSpread: .015 },
  cohort: { count: measurements.length, normalizedWidthSpread: Number(widthSpread.toFixed(6)), normalizedHeightSpread: Number(heightSpread.toFixed(6)) },
  assets: measurements
};
await writeFile(resolve(evidence, 'block-material-calibration.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log('BLOCKFOLK_BLOCK_MATERIAL_CALIBRATION PASS', JSON.stringify(report));
