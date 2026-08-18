# BlockFolk Imaginarium First Production Build Report

## Outcome

PASS — the first phone-testable production build restores all 30 accepted individual BlockFolk stickers, retains native Unicode emoji and the accepted BlockFolk Valley unchanged, and is published as an isolated offline single-HTML product at:

`https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/`

The feature branch and dedicated Pages subpath were the only remote mutations. No PR, merge, tag, release, Pages-root replacement, original Imaginarium deployment, or unrelated publication occurred.

## Repository and commits

- Repository: `falloutmule/single-file-html-software`
- Worktree: `C:\Users\fallo\Documents\Single-File-Html\.worktrees\blockfolk-imaginarium-001`
- Product: `examples/blockfolk-imaginarium`
- Branch: `feature/blockfolk-imaginarium-001`
- Verified production-catalog starting HEAD: `dbab798992fb491f6942edfc2c09807e475644d1`
- Sticker implementation commit: `b0111b24a2916ecc779d7eb5e435fc700142f447`
- Final reporting commit: the focused commit containing this report; its exact object ID is recorded in the completion handoff because a commit cannot contain its own final hash.
- Pushed upstream: `origin/feature/blockfolk-imaginarium-001`
- Fetched Pages starting tip: `260829515804fb49dc5ffd56576824d2cd371248`
- Pages commit: `ebe9a23cb792d774e32e5ff8bd6d591854667059`

## Restored catalog

All PNG files were copied byte-for-byte from `examples/the-imaginarium/src/assets/blockfolk/`. Their source artwork, transparency, colors, pixels, and provenance were not changed. Runtime registration uses the canonical asset manifest; the packed audit decodes every embedded PNG and compares its SHA-256 set with these 30 accepted files.

| Category | Count | Stickers |
| --- | ---: | --- |
| Animals | 2 | Wolf, Boar |
| People | 6 | Farmer, Miner, Knight, Wizard, Ranger, Explorer |
| Building | 6 | Wooden Door, Stone Door, Square Window, Round Window, Log Block, Brick Block |
| Nature | 12 | Oak Tree, Pine Tree, Shrub, Berry Bush, Grass Block, Dirt Block, Stone Block, Sand Block, Snow Block, Water Block, Lava Block, Leaves Block |
| Magic | 4 | Slime, Bat, Golem, Dragon |
| Emoji | 0 illustrated | Native typed Unicode input |

Only Animals, People, Building, Nature, Magic, and Emoji are selectable, in that exact order. Words, Things, Silly, old backgrounds, debug backgrounds, and reference sheets are absent.

The restored art uses a 420-world-unit longest edge. This is derived from the accepted original 285-logical-pixel placement at approximately 0.30 phone fit and produces an approximately 85–103 CSS-pixel initial extent at normal Valley bookmark zooms. Imported pictures and emoji retain their established sizing behavior.

No persistence schema or BlockFolk namespace was replaced. A saved empty-world project created before catalog registration reloads successfully and immediately gains catalog access without migration, deletion, or original Imaginarium storage access.

## Preserved product behavior

- Native emoji preserves simple, variation-selector, skin-tone, ZWJ, flag, and family sequences through creation, save/reload, editing, and export.
- All 30 thumbnails decode, and all 30 stickers can be placed.
- Pan, midpoint pinch zoom, sticker-drag isolation, fit-world, five bookmarks, portrait/landscape continuity, and world-coordinate registration pass.
- Flip, Behind/In Front, Undo/Redo, Copy, movement, scale, rotation, deletion, save/reload, Import with transparent-edge trimming, My Pictures, puzzle creation, and PNG export pass.
- PNG export contains the accepted Valley, restored image stickers, and native emoji.
- The delayed-click/double-activation repair and distinct press/release sounds remain present and tested.
- Offline operation remains self-contained with no runtime service or unexpected request.

## Background protection

The production Valley was not recompressed, regenerated, cropped, redrawn, or replaced.

| Asset | Dimensions | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| Revised authority JPEG | 1280 × 1280 | 293,332 | `4aa0bb1fb66e3c4101a0e4aa2dad1cf0ebf6adf7a5b484453a9cddd9bb0d7911` |
| Production master PNG | 4096 × 4096 | 20,577,460 | `e5ea7c4077ddfac7c343fd7b1b4a903774bfeb59f4dbd9c28bf12cf630ad9933` |
| Sole shipping WebP | 4096 × 4096 | 1,424,174 | `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c` |

Exactly one WebP background is packed. The five existing runtime bookmark crops and bookmark coordinates are unchanged; no separate crop image, alternate background, or debug-world payload is embedded.

## Artifact

- Path: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-1558f395ee8f`
- Source SHA-256: `1558f395ee8f6da44dbe1025f5c2e44e8aede903fd6f1c49907ea0a6cb9506f5`
- Bytes: 8,769,364
- SHA-256: `8b830d36cee776cf74512f1e31b624e0615fa2a6cefb3c648ea1a92a40850de3`

Two isolated canonical builds produced the same Build ID, size, and byte-for-byte SHA-256.

## Verification

| Lane | Exact result |
| --- | --- |
| Focused source scenarios and static audit | PASS: 6 categories; counts 2/6/6/12/4/0; 30 exact PNG assets; one unchanged world |
| Repository lint and TypeScript | PASS |
| Repository unit suite | PASS: 46 files, 316 passed, 2 skipped |
| SFHS inspect and validate | PASS, zero findings |
| SFHS changed-path check | PASS; one expected path-map review warning for the sibling example, with lint/typecheck/full unit steps passing |
| SFHS project test | PASS |
| Canonical pack and exact verify | PASS, zero findings |
| Packed identity/catalog/network audit | PASS: 30 matching PNGs, one matching WebP, no JPEG/reference sheet, no obsolete background |
| Two isolated production builds | PASS: byte-identical at 8,769,364 bytes and the artifact SHA-256 above |
| Local packed Chromium | PASS at 400 × 844 and 844 × 400; zero console errors, page errors, or unexpected requests; 185 ms observed boot |
| Live HTTPS Chromium | PASS at 400 × 844 and 844 × 400; zero console errors, page errors, or unexpected requests; 3,436 ms observed cold-network boot |
| Catalog/browser behavior | PASS: every thumbnail decoded; all 30 art stickers placed; native emoji and every required camera/editor/persistence/export lane passed |
| Original Imaginarium focused regression | PASS: 11 backgrounds and 114 stickers |
| Original Imaginarium canonical pack/verify | PASS: Build ID `the-imaginarium-1843671f0e4c`; 10,349,547 bytes; SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b` |
| Original save sentinel | PASS: original localStorage and IndexedDB sentinel values remained unchanged during BlockFolk browser tests |
| Ueye | Absent from this branch and untouched |

The original Imaginarium tracked tree remained hash-identical at `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7` before and after the work.

## Pages proof

The Pages commit has parent `260829515804fb49dc5ffd56576824d2cd371248` and changes only `blockfolk-imaginarium/index.html`.

- Live BlockFolk response: 8,769,364 bytes; SHA-256 exactly `8b830d36cee776cf74512f1e31b624e0615fa2a6cefb3c648ea1a92a40850de3`
- Pages root `index.html`: blob `1690add7c1d1658e377a7c9531ab740bc027ff7b`; 10,349,488 bytes; SHA-256 `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e`; unchanged from the fetched authority
- Original Imaginarium route and all pre-existing Pages files were preserved.

## Resolved failures and remaining uncertainty

- The initial packed audit assumed a bundler-composed full sticker-ID literal. It was repaired to validate the ID namespace plus all 30 decoded PNG hashes.
- One isolated offline install lacked a cached `@eslint/js` tarball. The official clean-build harness was rerun with the approved network boundary; no lockfile or dependency version changed.
- The first live read briefly returned 404 while GitHub Pages propagated. A subsequent exact-byte download and both phone-sized live browser scenarios passed.
- A lint failure in the packed audit's explicit `Buffer` use was repaired with a standard import; the complete lint lane then passed.

Automated acceptance is complete. The only remaining physical-phone uncertainty is subjective touch/audio feel, real-device decode performance, and the handset's installed native-emoji glyph coverage. The published HTTPS URL above—not a local Python server—is the user acceptance route.

## Construction-focused interaction pass — PASS

This focused construction pass began at feature commit `ad83f52e68207740be6bdb1d13201e0a26e27855` and its implementation commit is `8340d784455555a4fe7d560802ae266f3539de12`. The report/evidence commit follows this publication verification. The pushed branch is `origin/feature/blockfolk-imaginarium-001`; the dedicated Pages commit is `1a24fef073fcc9140c59ba2e142e0b24702962e0` (parent `ebe9a23cb792d774e32e5ff8bd6d591854667059`).

### Smaller construction-unit default

New artwork stickers now use `420 / 1.1^6 = 237.078...` world units for their longest edge. The previous default was 420 world units and the existing Smaller action multiplies scale by `1 / 1.1`; this is therefore exactly six existing reduction steps below the prior default rather than a guessed replacement size. The change is only at creation time: persisted sticker scales remain untouched.

### Assembly model and isolated migration

- Page schema is now `blockfolk-imaginarium.page@3`. The isolated `@2` migration adds an empty `connections` array without changing existing sticker coordinates, scale, flip state, z-order, camera state, bookmarks, or BlockFolk storage namespace.
- A connection is an explicit, duplicate-safe pair of sticker IDs plus its own ID. Connected-component traversal is loop-safe, so structures containing cycles are valid.
- The explicit, transparent-art-aware connector metadata is limited to Grass, Dirt, Stone, Sand, Snow, Water, Lava, Log, Leaves, Brick, Wooden Door, Stone Door, Square Window, and Round Window. It uses named visual-edge anchors rather than raw PNG rectangles. All other stickers, imports, and native emoji remain independent.
- Snap is opt-in. Its 30 CSS-pixel tolerance is converted through the live camera scale. Turning it off blocks new links but retains existing assemblies. There is no background or invisible-map-grid snapping.
- Drag, resize, flip, copy, delete, Behind/In Front, Undo/Redo, save/reload, and orientation persistence operate on the selected connected component. Copy remaps both sticker and connection IDs. Unsnap removes only the active member's connections and is undoable; any remaining components stay valid assemblies.

### Toolbar and z-order proof

The compact selection toolbar now exposes contextual Snap/Unsnap, Behind, In Front, Flip, Copy, and Delete. Manual Smaller, Bigger, and Turn controls moved to the compact More/Edit sheet. At 400 × 844 and 844 × 400 the browser scenario confirms every control remains reachable.

The former layer action only altered the active canvas object and gave no stateful edge feedback; it could not preserve an assembly as one contiguous layer. The repaired action reorders ordered object groups by exactly one group, preserves internal group order, persists the result, and announces `Moved behind`, `Moved in front`, `Already at back`, or `Already at front`. The rendered-browser test uses three deliberately overlapping distinct stickers and verifies both stored order and PNG output after repeated actions.

### Valley sharpness diagnosis

The production Valley master and shipping WebP remain byte-identical to the accepted assets listed above. The rendering inspection found a 4096 × 4096 natural source, Retina 2× canvas backing at the 400 × 844 phone viewport, and high-quality browser smoothing. The application now explicitly retains that high-quality, Retina rendering policy for both Fabric canvases so a low-resolution intermediate cannot regress the map; no map pixels were changed.

The remaining softness is principally the accepted 1280-to-4096 VSR/source character rather than a second low-resolution application raster. The recorded deterministic NVIDIA VSR workflow remains the applicable upscale authority. No current local ComfyUI installation with an available node/model was found during this pass, and no node, model, or dependency was installed. The committed comparison proof is [blockfolk-valley-sharpness-comparison.png](../art/evidence/blockfolk-valley-sharpness-comparison.png): current shipping WebP, high-quality app canvas, native master, and one conservative unsharp evidence candidate. The candidate is not packed or deployed and requires separate approval before any asset replacement.

### Local verification before publication

| Lane | Result |
| --- | --- |
| Focused source and construction scenarios | PASS: default scale, explicit snap metadata, migration, snap/unsnap, group editing, z-order, persistence, emoji independence |
| Packed phone Chromium | PASS at 400 × 844 and 844 × 400: zero console errors, page errors, and unexpected requests |
| Background render diagnosis | PASS: 4096 natural background, 2× backing, high-quality smoothing, rendered canvas and browser capture retained under ignored test evidence |
| Lint, typecheck, complete unit suite | PASS: 46 files, 316 passed, 2 skipped |
| SFHS inspect, validate, test, pack, verify, packed audit | PASS with zero findings |
| Isolated deterministic double build | PASS: both builds are `blockfolk-imaginarium-f608fef21d4a`, 8,782,332 bytes, SHA-256 `79b373f74ac0ff3637e0ab0ffa57bccb527bf1ec1d53f53cf15645bacb3722e1` |
| Original Imaginarium canonical pack/verify | PASS: `the-imaginarium-1843671f0e4c`, 10,349,547 bytes, SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b` |
| Original-product source isolation | PASS: no changed tracked path under `examples/the-imaginarium`; tree remains `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`. Ueye is absent from this branch and untouched. |

### Published artifact and Pages proof

- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-f608fef21d4a`
- Source SHA-256: `f608fef21d4a54b8ea9079bb76d199bef65ed7b5addea90fb313d7df2025a7ce`
- Bytes: `8,782,332`
- SHA-256: `79b373f74ac0ff3637e0ab0ffa57bccb527bf1ec1d53f53cf15645bacb3722e1`
- Live phone route: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=1a24fef`

After ordinary GitHub Pages propagation, the cache-busted live download was 8,782,332 bytes with exactly the artifact SHA-256 above. Live Chromium passed at 400 × 844 and 844 × 400 with zero console errors, page errors, and unexpected runtime requests. The Pages commit modifies only `blockfolk-imaginarium/index.html`; the live Pages root remains 10,349,488 bytes with SHA-256 `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e`.

No PR, tag, release, root-route change, original-Imaginarium deployment, remote rewrite, or unrelated remote mutation occurred. The only remaining physical-phone acceptance items are subjective snap feel, toolbar density, audio/haptics, actual-device decode behavior, and installed native-emoji glyph coverage.
