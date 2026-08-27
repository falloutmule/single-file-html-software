/* global structuredClone */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SNAPPABLE_ASSET_IDS, isSnappableAsset } from '../src/model/constructionModel.js';
import { PAGE_SCHEMA, normalizePicture } from '../src/model/pageModel.js';
import { READ_ONLY_LEGACY_NOTICE, ReadOnlyLegacySession, stableCanonicalSerialize } from '../src/model/ReadOnlyLegacySession.js';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'historical');
const manifest = JSON.parse(readFileSync(join(fixtureRoot, 'manifest.json'), 'utf8'));
const loaded = new Map();
for (const entry of manifest.fixtures) {
  const value = JSON.parse(readFileSync(join(fixtureRoot, entry.file), 'utf8'));
  const hash = createHash('sha256').update(stableCanonicalSerialize(value)).digest('hex');
  assert.equal(hash, entry.originalCanonicalSha256, `${entry.file} must retain its producing-writer canonical hash`);
  assert.equal(value.schema, entry.schema); assert.equal(value.id, entry.storageKey);
  loaded.set(entry.file, value);
}

const page1 = normalizePicture(loaded.get('page1-f6daec9.json'));
assert.equal(page1.schema, PAGE_SCHEMA); assert.equal(page1.stickers.length, 1); assert.equal(page1.stickers[0].x, 1024); assert.equal(page1.stickers[0].y, 1024); assert.deepEqual(page1.connections, []);
const page2 = normalizePicture(loaded.get('page2-e10dc04.json'));
assert.equal(page2.schema, PAGE_SCHEMA); assert.deepEqual(page2.page.camera, { centerX: 1900, centerY: 2100, zoom: 1.25 }); assert.deepEqual(page2.connections, []);
for (const name of ['page3-8340d78.json', 'page3-b639f72.json']) {
  const page3 = normalizePicture(loaded.get(name)); assert.equal(page3.schema, PAGE_SCHEMA); assert.equal(page3.stickers.length, 2); assert.equal(page3.connections.length, 1);
}

const rawPage4 = loaded.get('page4-499636e.json'); const beforePage4 = structuredClone(rawPage4);
const session = await ReadOnlyLegacySession.open(rawPage4);
assert.deepEqual(rawPage4, beforePage4, 'opening the adapter must not mutate its caller record');
assert.deepEqual(session.renderedStickerSnapshot, rawPage4.stickers, 'page@4 stickers must be an exact rendered snapshot');
assert.deepEqual(session.renderedPicture.connections, [], 'page@4 connections must be inactive in the rendered view');
assert.deepEqual(session.quarantinedConnections, rawPage4.connections, 'page@4 connections must be quarantined without interpretation');
assert.equal(session.originalIdentity.id, rawPage4.id); assert.equal(session.canonicalHash, manifest.fixtures.find((entry) => entry.file === 'page4-499636e.json').originalCanonicalSha256);
for (const capability of ['contentMutation', 'stickerEdit', 'snap', 'undoRedo', 'save', 'rename', 'duplicate', 'delete', 'recoveryExport', 'puzzle']) assert.equal(session.capabilities[capability], false, `${capability} must fail closed`);
for (const capability of ['camera', 'fit', 'orientation', 'pngExport', 'close']) assert.equal(session.capabilities[capability], true, `${capability} must remain available`);
assert.equal('bookmarks' in session.capabilities, false, 'the removed Locations concept must not remain in read-only capabilities');
assert.equal(READ_ONLY_LEGACY_NOTICE, 'This older picture is open read-only. Your stickers are safe, but its snap links are inactive.');
await assert.rejects(() => ReadOnlyLegacySession.open({ ...rawPage4, stickers: [{ ...rawPage4.stickers[0], x: 'bad' }] }), /invalid sticker settings/i);

assert.deepEqual(SNAPPABLE_ASSET_IDS, [
  'sticker-blockfolk-grass-dirt-block', 'sticker-blockfolk-dirt-block', 'sticker-blockfolk-stone-block',
  'sticker-blockfolk-sand-block', 'sticker-blockfolk-snow-block', 'sticker-blockfolk-water-block',
  'sticker-blockfolk-lava-block', 'sticker-blockfolk-wood-log-block', 'sticker-blockfolk-leaf-block',
  'sticker-blockfolk-brick-stone-block'
]);
for (const id of ['sticker-blockfolk-wood-door', 'sticker-blockfolk-stone-door', 'sticker-blockfolk-square-window', 'sticker-blockfolk-round-window']) assert.equal(isSnappableAsset(id), false);

console.log('BLOCKFOLK_HISTORICAL_RECOVERY PASS', JSON.stringify({ fixtures: manifest.fixtures.length, pageWriter: PAGE_SCHEMA, page4Hash: session.canonicalHash, blockSnapAssets: SNAPPABLE_ASSET_IDS.length }));
