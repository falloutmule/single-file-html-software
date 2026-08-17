import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const artifact = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
const inheritedMarkers = [
  'the-imaginarium-library-v1', 'the-imaginarium.preferences@1', 'window.Imaginarium',
  'background-paper', 'background-bedroom', 'background-blockfolk-valley',
  'sticker-animals-cat', 'sticker-blockfolk-', 'paper-cut sticker', 'paper-cut background',
  'blockfolk-valley.png', 'Minecraft'
];
for (const marker of inheritedMarkers) assert.equal(artifact.includes(marker), false, `packed artifact must not contain ${marker}`);
for (const marker of [
  '<title>BlockFolk Imaginarium</title>', 'blockfolk-imaginarium-library-v1',
  'blockfolk-imaginarium.preferences@1', 'blockfolk-imaginarium.page@2',
  'blockfolk-imaginarium.sticker-pack@1', 'blockfolk-imaginarium.puzzle@1',
  'BlockFolk are coming soon', 'blockfolk-valley', 'BlockFolk Valley',
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
if (!artifact.includes('data:image/webp;base64,')) throw new Error('Packed production world WebP is missing.');
console.log('BLOCKFOLK_IMAGINARIUM_PACKED_AUDIT PASS isolated identity, six-category contract, one production world, empty inherited catalog, no external script or stylesheet');
