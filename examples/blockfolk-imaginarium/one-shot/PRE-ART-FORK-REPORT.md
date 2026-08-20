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

## Explicit snap-lock repair — PASS

The repair at implementation commit `3e64042c903026ebed3a0e5d8c42dc1e54f963d8` removes ambiguous Snap success. The command now validates and stores its connection, proves both endpoints resolve to the same assembly, and only then displays `Snapped and locked`. If that invariant fails, it restores the pre-command picture and reports that the pieces could not lock.

The expanded phone browser proof waits after Snap, selects and drags the opposite member, verifies equal world-space movement for both pieces, saves/reloads, and rechecks the assembly from that opposite member. Local and live scenarios pass at `400 × 844` and `844 × 400` with no console errors, page errors, or unexpected requests. Complete repository tests pass (46 files; 316 passed, 2 skipped), as do lint, typecheck, SFHS inspect/validate/check/pack/verify, packed audit, and byte-identical double packing.

The published artifact is Build ID `blockfolk-imaginarium-9f41cbe47b57`, 12,270,994 bytes, SHA-256 `170b85d3ed08d1e995d1e37f8634f7f81cd5e01c7478c61b277005d8b12c5595`. Pages commit `2ad0eca84f7c47f44cd67f61c1b50fad2ed2a8a3` updates only the BlockFolk HTML. The cache-busted phone route is `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=2ad0eca`.

The original Imaginarium tracked files and accepted artifact remain unchanged; Ueye is untouched. See [SNAP-LOCK-REPORT.md](SNAP-LOCK-REPORT.md) for exact evidence and the physical-phone check.

## Physical touch snap-lock repair — PASS

The prior graph-only repair did not own the full physical touch path. Fabric could still transform the active object independently after BlockFolk moved the connected component, so the connection record remained valid while the artwork visibly pulled apart. Implementation commit `cc2f8ed59ba057bde02c4fe25da2c5ad953b90fe` disables Fabric object movement, moves all connected members from immutable gesture origins, and reapplies that rigid result on pointer-up. Assembly edge clamping now uses a shared correction.

The photographed Stone Door / Brick Block order also exposed hidden face artwork. Newly snapped doors and windows are now placed above their supporting block. The exact browser case proves visible landing, painted-face registration, Snap-to-Unsnap replacement, a two-member assembly, front-visible door artwork, resistance to an injected single-member drift, native Chromium touch movement, save/reload, and both phone orientations.

The published artifact is Build ID `blockfolk-imaginarium-e1aaca287e0c`, 12,271,836 bytes, SHA-256 `00ffedbe9c2258bc6782f79282e8ac042696c4a058f4e8b6fccddd2a447c0a90`. Pages commit `0f0f390328db287aed174d0a5d94d183a9f5e776` updates only the BlockFolk HTML. Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=0f0f390`.

See [SNAP-TOUCH-LOCK-REPORT.md](SNAP-TOUCH-LOCK-REPORT.md) for the failing reproduction and exact live proof.

## Stable Snap/Unsnap controller repair - PASS

Implementation commit `1757d050ca21d747440174bc6bd6df42ce9a1dea` fixes the physical Android immediate-unlock defect at its control-identity boundary. Snap and Unsnap are now states of one permanent `snap-context` DOM button and one SFHS controller. The label, icon, accessible name, tooltip, and color update in place, while the control ID, focus target, and private duplicate-click suppression window remain stable. A deliberate Unsnap now reports `Sticker detached.`.

The native-touch browser regression proves one touch produces one activation and one persistent connection after waiting beyond the suppression window. It also re-hit-tests with `document.elementFromPoint(x, y)` after the state change, verifies the same control ID receives the browser-generated click, and proves that click is suppressed. A later deliberate touch, keyboard Enter, and assistive click each activate exactly once. Local and live phone scenarios pass at `400 x 844` and `844 x 400` with zero console errors, page errors, or unexpected requests.

The published artifact is Build ID `blockfolk-imaginarium-673c6918144e`, 12,272,785 bytes, SHA-256 `c1de5b58ccca3d4477e5b94a93b8e6aab32522f69ea76fee9e33358ca25e1280`. Pages commit `ab5d35bfa2337e5b1c0a77e0fbaad321de9721e7` changes only `blockfolk-imaginarium/index.html`. Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=ab5d35b`.

The background assets, 30-sticker catalog, category order, scale, construction geometry, save schema, BlockFolk namespaces, original Imaginarium, Ueye, Pages root, and non-BlockFolk routes are unchanged. See [STABLE-SNAP-CONTROLLER-REPORT.md](STABLE-SNAP-CONTROLLER-REPORT.md) for the root-cause record and exact proof.

## Stone Doorway geometry repair — FAIL pending physical Samsung review

Implementation commit `fe3735fba5eb50d9b4f59b856e92d92aee9e0b68` replaces new Stone Door center overlays with an authored one-wide, two-tier topology: two lower Brick/Log jambs, two upper jambs, one lintel, and two protected opening cells. The permanent `snap-context` controller is unchanged. Legacy `backFace` saves still load without mutation, but that obsolete centered connection cannot be created again.

The canonical artifact is Build ID `blockfolk-imaginarium-119b61d7d836`, `12,281,064` bytes, SHA-256 `8b3c217d3c6aa937c26a6c9a57dce94a16c88ec792bbdb049b5344375ab7be8d`. Pages commit `e981cc5c1b75c7bb170e503505b67964b8024264` changes only `blockfolk-imaginarium/index.html`; the live file is byte-identical at `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e981cc5-2`.

Focused model, 12-scene rendered doorway, full local/live phone browser, lint, typecheck, 46-file repository tests, SFHS inspect/validate/check/pack/verify, packed audit, and deterministic double-pack lanes pass. The original Imaginarium, Ueye, 30-sticker catalog, category order, emoji behavior, stable controller, and both Valley backgrounds are unchanged. See [STONE-DOORWAY-GEOMETRY-REPORT.md](STONE-DOORWAY-GEOMETRY-REPORT.md) for exact topology, rejection cases, screenshots, hashes, and integrity proof.

Automated acceptance is PASS. Overall status remains **FAIL — awaiting physical Samsung review** of the visible opening and locked six-piece drag behavior.

## Snapping overhaul Phase 0 honest baseline — FAIL awaiting physical Samsung acceptance

Physical Samsung evidence superseded the preceding automated doorway claim. Implementation commit `35a94904e83bf5f68212503493c8341fd6ada501` additively removes the failed Stone Door geometry, automatic multi-edge doorway wiring, hidden-cell rejection, doorway-specific layer sorting, and circular rendered-doorway test. It does not restore centered door-over-block snapping. New Wooden Door and Stone Door connections are creator-disabled until calibrated typed profiles exist.

Failed `doorJamb*`, `blockJamb*`, and historical door `backFace` endpoints remain validation-only so existing page@3 pictures load without deleting or rewriting stickers, coordinates, scale, Flip, z-order, or stored connections. Generic block and window snapping remains enabled. The permanent `snap-context` DOM node/controller, its control ID, duplicate-click suppression, distinct cues, and contextual Unsnap behavior remain unchanged. Intentional Unsnap feedback is exactly `Sticker detached.`

Canonical artifact: Build ID `blockfolk-imaginarium-e1fdbbfc5738`, `12,273,880` bytes, SHA-256 `93918d0ce2b87ea9fd20001586ed9dadb7011abedfae1e71c91f80e75ea73df4`. Two canonical packs are byte-identical. Pages commit `0897bb987421818eddfd53c166c361e5ff29282c` changes only `blockfolk-imaginarium/index.html`; the live response is byte-identical at `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=0897bb9-3`.

Focused source/static, lint, typecheck, 46-file repository tests (316 passed, 2 skipped), SFHS inspect/validate/test/check/pack/verify, packed/offline audit, deterministic double-pack, and local/live phone Chromium at `400 × 844` and `844 × 400` pass. The known SFHS path-map review warning remains non-blocking because the explicit product source, static, packed, and browser lanes cover the changed paths. Browser proof reports zero console errors, page errors, and unexpected requests.

The Original Imaginarium tree remains `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`; its accepted artifact remains `10,349,547` bytes with SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`. Production Valley WebP SHA-256 remains `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`; Classic Valley PNG remains `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`. Ueye and unrelated tracked paths are untouched. See [SNAPPING-OVERHAUL-PHASE0-REPORT.md](SNAPPING-OVERHAUL-PHASE0-REPORT.md).

Automated Phase 0 acceptance is PASS. Overall status is **FAIL — awaiting physical Samsung acceptance**. The new typed-port core, calibration harness, page@4 migration, and doorway formations have not begun.

## Snapping overhaul Phase 1 renderer-neutral core — PASS

Implementation commit `44413de1079401a633ca88f054ab0d95b6bc285c` adds isolated modules for versioned asset profiles, source/local/world/viewport transforms, transformed typed ports, centralized compatibility and capacity checks, pose-consensus candidate search, graph validation, loop-safe BFS components, selected-member edge removal, fresh-ID connection cloning, and immutable atomic transaction planning.

All 14 construction assets have explicit versioned uncalibrated profile shells; all report `productionEnabled: false`. The packed runtime boundary explicitly reports `page@3-compatibility`, typed profile/connection schema `1`, and zero production-enabled typed profiles. Doors remain creator-disabled, page@3 records and the permanent Snap/Unsnap controller remain authoritative, and no formation or calibration behavior is enabled.

Independent fixtures prove that multiple compatible port pairs yielding one transform become one candidate pose with one canonical edge, while two meaningfully distinct tied poses are rejected as ambiguous. Model coverage also proves Flip plane/normal transforms, reciprocal types, scale, plane, normal, capacity, duplicate-pair, same-component, finite-transform, deterministic ordering, transaction staleness, loop traversal, graph splitting, cloning, and generated-chain invariants.

Canonical artifact: Build ID `blockfolk-imaginarium-c1d4b89dc6f8`, `12,275,714` bytes, SHA-256 `7cbe5c67fb2cd3e2dbadc12f6e172b22f24da10724b65e2225cba9db17531842`. Two canonical packs are byte-identical. Pages commit `e343c0c5741e26ae1325d83374dec10525d58353` changes only `blockfolk-imaginarium/index.html`; live bytes match at `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e343c0c-1`.

Focused source/static, lint, typecheck, 46-file repository tests (316 passed, 2 skipped), SFHS inspect/validate/test/check/pack/verify, packed audit, deterministic double-pack, and local/live Chromium at `400 × 844` and `844 × 400` pass with zero console errors, page errors, or unexpected requests. Original Imaginarium tree/artifact, Ueye, both Valley assets, all 30 sticker bytes, categories, emoji, camera, storage, and Pages root remain unchanged. See [SNAPPING-OVERHAUL-PHASE1-REPORT.md](SNAPPING-OVERHAUL-PHASE1-REPORT.md).

## Snapping overhaul Phase 3 typed Brick/Log pilot — FAIL awaiting physical Samsung review

Implementation commit `18ad2a585d41b3c580f94a803724536bab0ef032` production-enables typed snapping for Brick Block and Log Block only. It uses the independently reviewed Phase 2 source geometry, one-edge immutable transactions, screen-space acquisition, and explicit port/plane/normal/scale/capacity validation. Brick/Log mutual snaps cannot fall back to the legacy anchors. Doors remain creator-disabled; formation logic and page@4 migration remain absent.

Real visible-control browser tests prove horizontal Brick and vertical Log construction, no connection on ordinary drag, persistent group movement from either member, component resize/Flip/depth/Copy/Trash/Undo/Redo, save/reload, orientation continuity, puzzle input, PNG export, stable controller identity after delayed native touch, and one-shot intentional Unsnap with exact `Sticker detached.` feedback. All 30 stickers and native emoji still pass the broader production scenario.

The deterministic artifact is Build ID `blockfolk-imaginarium-01551aec11aa`, `12,298,062` bytes, SHA-256 `7e2ef06eacbbf0f38ad830eb52dc980afe0bbfbec84461aad85d92332c078454`. Pages commit `a5883a78862a00b8bcc9f6c823dc674a79934d52` changes only `blockfolk-imaginarium/index.html`; the live download is byte-identical at `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=a5883a7-3`.

Focused model/source/static tests, lint, typecheck, all 46 repository files (316 passed, 2 documented skips), One-Shot validation, SFHS inspect/validate/test/check/pack/verify, packed/offline audit, deterministic double packing, and local/live Chromium at both phone orientations pass. Live runs report zero console errors, page errors, and unexpected requests. Original Imaginarium, Ueye, both Valley backgrounds, all sticker bytes, categories, native emoji, BlockFolk namespaces, Pages root, and unrelated tracked paths remain unchanged. Full evidence is in [SNAPPING-OVERHAUL-PHASE3-REPORT.md](SNAPPING-OVERHAUL-PHASE3-REPORT.md).

Automated Phase 3 acceptance is PASS. Overall status remains **FAIL — awaiting physical Samsung review** before Phase 4.
