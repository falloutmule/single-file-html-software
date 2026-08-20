/* global structuredClone, window */
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../../../packages/browser-runner/node_modules/playwright/index.mjs';

const productRoot = resolve(import.meta.dirname, '../..');
const artifactUrl = process.env.BLOCKFOLK_ARTIFACT_URL || pathToFileURL(resolve(productRoot, 'dist/index.html')).href;
const failures = []; const unexpectedRequests = [];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 400, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
await context.route('**/*', async (route) => {
  const url = route.request().url();
  if (url === artifactUrl || /^(?:about:blank|blob:|data:|file:)/u.test(url)) return route.continue();
  unexpectedRequests.push(url); return route.abort('blockedbyclient');
});
const page = await context.newPage();
page.on('pageerror', (error) => failures.push(`pageerror: ${error.message}`));
page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

try {
  await page.goto(artifactUrl, { waitUntil: 'load' }); await page.locator('#app[data-boot="ready"]').waitFor();
  const initial = await page.evaluate(async () => {
    const app = window.BlockFolkImaginarium.app;
    const raw = {
      schema: 'blockfolk-imaginarium.page@3', id: 'migration-browser-page', title: 'Older Construction',
      createdAt: '2026-08-19T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z',
      page: { width: 4096, height: 4096, backgroundAssetId: 'blockfolk-valley', camera: { centerX: 2048, centerY: 2048, zoom: 1 } },
      ui: { category: 'building' },
      stickers: [
        { layerId: 'legacy-door', assetId: 'sticker-blockfolk-stone-door', x: 1800, y: 1900, scaleX: .77, scaleY: .77, angle: 12, flipX: true, flipY: false, opacity: 1, zIndex: 0 },
        { layerId: 'legacy-block', assetId: 'sticker-blockfolk-brick-stone-block', x: 1900, y: 1950, scaleX: .83, scaleY: .83, angle: 0, flipX: false, flipY: false, opacity: 1, zIndex: 1 }
      ],
      connections: [{ id: 'failed-doorway-link', aLayerId: 'legacy-door', bLayerId: 'legacy-block', aAssetId: 'sticker-blockfolk-stone-door', bAssetId: 'sticker-blockfolk-brick-stone-block', aAnchorId: 'backFace', bAnchorId: 'frontFace' }],
      embeddedAssets: [], promptId: null
    };
    await app.storage.putPicture(structuredClone(raw));
    const originalPut = app.storage.putPicture.bind(app.storage); app.__migrationWriteCount = 0;
    app.storage.putPicture = async (picture) => { app.__migrationWriteCount += 1; return originalPut(picture); };
    await app.openPicture(raw.id);
    return { raw, writes: app.__migrationWriteCount, current: structuredClone(app.current), pending: structuredClone(app.pendingPictureMigration) };
  });
  assert.equal(initial.writes, 0, 'opening a page@3 picture must not write it');
  assert.equal(initial.current.schema, 'blockfolk-imaginarium.page@4');
  assert.equal(initial.current.connections.length, 0, 'failed doorway links must be quarantined in memory');
  assert.equal(initial.current.stickers[0].scaleX, .77); assert.equal(initial.current.stickers[0].angle, 12); assert.equal(initial.current.stickers[0].flipX, true);
  assert.deepEqual(initial.pending.quarantinedConnectionIds, ['failed-doorway-link']);

  await page.locator('[data-action="camera-zoom-in"]').click();
  await page.setViewportSize({ width: 844, height: 400 }); await page.waitForTimeout(120);
  await page.locator('[data-action="show-world-locations"]').click();
  await page.locator('[data-location-id="coast"]').click(); await page.waitForTimeout(120);
  const afterViewOnly = await page.evaluate(async () => {
    const app = window.BlockFolkImaginarium.app;
    await app.saveCurrent({ quiet: true });
    return { writes: { count: app.__migrationWriteCount, raw: await app.storage.getPicture('migration-browser-page') }, pending: !!app.pendingPictureMigration };
  });
  assert.equal(afterViewOnly.pending, true, 'camera, bookmark, and orientation changes must not authorize migration');
  assert.equal(afterViewOnly.writes.count, 0);
  assert.equal(afterViewOnly.writes.raw.schema, 'blockfolk-imaginarium.page@3', 'the raw page@3 record must remain untouched after view-only changes');
  assert.equal(afterViewOnly.writes.raw.connections.length, 1);

  await page.setViewportSize({ width: 400, height: 844 });
  await page.locator('[data-category="building"]').click();
  await page.locator('[data-sticker-id="sticker-blockfolk-brick-stone-block"]').click();
  await page.waitForFunction(() => window.BlockFolkImaginarium.app.current?.stickers?.length === 3 && window.BlockFolkImaginarium.app.migrationWriteAuthorized === true);
  const written = await page.evaluate(async () => {
    const app = window.BlockFolkImaginarium.app;
    await app.saveCurrent({ quiet: true });
    return { stored: await app.storage.getPicture('migration-browser-page'), pending: app.pendingPictureMigration, authorized: app.migrationWriteAuthorized, writes: app.__migrationWriteCount };
  });
  assert.equal(written.stored.schema, 'blockfolk-imaginarium.page@4', 'an explicit content mutation may normalize the picture on save');
  assert.equal(written.stored.connections.length, 0);
  assert.equal(written.stored.stickers.find(({ layerId }) => layerId === 'legacy-door').scaleX, .77, 'migration write must preserve existing sticker sizes');
  assert.equal(written.pending, null); assert.equal(written.authorized, false);
  assert.equal(written.writes, 1, 'the migration must produce exactly one authorized storage write');
} finally {
  await context.close(); await browser.close();
}

assert.deepEqual(failures, []);
assert.deepEqual(unexpectedRequests, []);
console.log('BLOCKFOLK_PAGE4_MIGRATION_BROWSER PASS', JSON.stringify({ artifactUrl, viewOnlyRawPreserved: true, contentWritePage4: true, errors: 0, unexpectedRequests: 0 }));
