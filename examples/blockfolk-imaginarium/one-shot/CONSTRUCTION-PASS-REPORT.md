# BlockFolk Imaginarium Construction Pass

Status: `PASS — implementation and dedicated Pages publication verified`

## Result

The first construction interaction pass adds a smaller, exactly-derived new-sticker scale; opt-in sticker-to-sticker construction snapping; persistent assemblies; contextual phone selection actions; observable group-aware layering; and a high-DPI Valley rendering safeguard. It does not change the accepted background bytes, categories, catalog, emoji behavior, or original Imaginarium.

## Failure-mode audit

| Failure mode | Guard |
| --- | --- |
| UI suggests snap but does not persist it | `connections` are schema-validated, saved, reloaded, and browser-tested |
| Zoom changes the snap feel | tolerance is defined in CSS pixels and divided by camera scale |
| Group operation silently detaches a member | connected components are selected and transformed together; Unsnap is explicit |
| Graph loop hangs traversal | visited-set traversal is used |
| Copy retains old IDs | copied stickers and copied connections receive fresh IDs |
| Group changes lose internal layer order | ordered component groups are moved contiguously |
| Behind/In Front appears ineffective | feedback plus stored-order and rendered-PNG proof |
| Old saves break | isolated `@2` to `@3` migration supplies only `connections: []` |
| Map quality fix alters approved art | production asset hashes remain unchanged; candidate is evidence-only |

## Exact snappable assets

Grass Block, Dirt Block, Stone Block, Sand Block, Snow Block, Water Block, Lava Block, Log Block, Leaves Block, Brick Block, Wooden Door, Stone Door, Square Window, and Round Window.

## Evidence

- Production comparison: [blockfolk-valley-sharpness-comparison.png](../art/evidence/blockfolk-valley-sharpness-comparison.png)
- Ignored browser/canvas captures and determinism report: `test-results/construction-pass-001/`
- Current local artifact: `dist/index.html`, Build ID `blockfolk-imaginarium-f608fef21d4a`, 8,782,332 bytes, SHA-256 `79b373f74ac0ff3637e0ab0ffa57bccb527bf1ec1d53f53cf15645bacb3722e1`
- Feature implementation: `8340d784455555a4fe7d560802ae266f3539de12`; Pages artifact commit: `1a24fef073fcc9140c59ba2e142e0b24702962e0`
- Live cache-busted route: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=1a24fef` — byte-identical, portrait and landscape Chromium PASS.

## Remaining physical-device check

Automated portrait and landscape scenarios pass. Final user acceptance remains the subjective feel of construction snapping, toolbar density, audio/haptics, real device decode time, and native emoji glyph coverage on the intended handset.
