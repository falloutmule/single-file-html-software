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
  'blockfolk-imaginarium.preferences@1', 'blockfolk-imaginarium.page@1',
  'blockfolk-imaginarium.sticker-pack@1', 'blockfolk-imaginarium.puzzle@1',
  'BlockFolk are coming soon'
]) assert.equal(artifact.includes(marker), true, `packed artifact must contain ${marker}`);
assert.equal(/<script[^>]+src=/i.test(artifact), false, 'packed artifact must not load an external script');
assert.equal(/<link[^>]+rel=["']?stylesheet/i.test(artifact), false, 'packed artifact must not load an external stylesheet');
console.log('BLOCKFOLK_IMAGINARIUM_PACKED_AUDIT PASS isolated identity, empty inherited catalog, no external script or stylesheet');
