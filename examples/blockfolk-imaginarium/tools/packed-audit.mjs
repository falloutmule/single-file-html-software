import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifact = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
const inheritedMarkers = [
  'the-imaginarium-library-v1', 'the-imaginarium.preferences@1', 'window.Imaginarium',
  'background-paper', 'background-bedroom', 'background-blockfolk-valley',
  'sticker-animals-cat', 'paper-cut sticker', 'paper-cut background',
  'blockfolk-valley.png', 'Minecraft'
];
for (const marker of inheritedMarkers) assert.equal(artifact.includes(marker), false, `packed artifact must not contain ${marker}`);
for (const marker of [
  '<title>BlockFolk Imaginarium</title>', 'blockfolk-imaginarium-library-v1',
  'blockfolk-imaginarium.preferences@1', 'blockfolk-imaginarium.page@2',
  'blockfolk-imaginarium.sticker-pack@1', 'blockfolk-imaginarium.puzzle@1',
  'blockfolk-valley', 'BlockFolk Valley', 'sticker-blockfolk-', 'Wolf', 'red-dragon', 'Dragon',
  'show-world-locations', 'camera-zoom-in', 'camera-zoom-out', 'camera-fit', 'Add Emoji'
]) assert.equal(artifact.includes(marker), true, `packed artifact must contain ${marker}`);
for (const obsoleteDefinition of [
  /id:\s*["']things["']\s*,\s*title:\s*["']Things["']/,
  /id:\s*["']silly["']\s*,\s*title:\s*["']Silly["']/,
  /id:\s*["']words["']\s*,\s*title:\s*["']Words["']/,
  /data-category=["'](?:things|silly|words)["']/,
  /<option\s+value=["'](?:things|silly|words)["']/
]) assert.equal(obsoleteDefinition.test(artifact), false, `packed artifact must not contain obsolete category definition ${obsoleteDefinition}`);
assert.equal(/<script[^>]+src=/i.test(artifact), false, 'packed artifact must not load an external script');
assert.equal(/<link[^>]+rel=["']?stylesheet/i.test(artifact), false, 'packed artifact must not load an external stylesheet');
assert.equal(/(?:src|href)=["']https?:/i.test(artifact), false, 'packed artifact must not request runtime network resources');
if (artifact.includes('DEBUG WORLD • NOT PRODUCTION') || artifact.includes('OCEAN BAY')) throw new Error('Debug world payload remains in the packed product.');
assert.equal(artifact.includes('data:image/jpeg;base64,'), false, 'reference/source JPEGs must not be shipped');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const packedPngs = [...artifact.matchAll(/data:image\/png;base64,([A-Za-z0-9+/=]+)/g)].map((match) => Buffer.from(match[1], 'base64'));
const expectedPngs = readdirSync(join(root, 'src', 'assets', 'blockfolk')).filter((name) => name.endsWith('.png')).map((name) => readFileSync(join(root, 'src', 'assets', 'blockfolk', name)));
assert.equal(packedPngs.length, 30, 'packed product must contain exactly 30 PNG sticker payloads');
assert.deepEqual(packedPngs.map(sha256).sort(), expectedPngs.map(sha256).sort(), 'every packed PNG must match one accepted shipping sticker exactly');
const packedWebps = [...artifact.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/g)].map((match) => Buffer.from(match[1], 'base64'));
assert.equal(packedWebps.length, 1, 'packed product must contain exactly one WebP world payload');
assert.equal(sha256(packedWebps[0]), sha256(readFileSync(join(root, 'src', 'assets', 'backgrounds', 'blockfolk-valley.webp'))), 'packed world must match the accepted sole shipping WebP');
console.log('BLOCKFOLK_IMAGINARIUM_PACKED_AUDIT PASS isolated identity, six-category contract, one production world, 30 exact accepted PNG stickers, no source sheets, no external script or stylesheet');
