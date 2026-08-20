# BlockFolk Snapping Overhaul — Phase 3 Report

Status: **PHYSICAL PASS — pilot accepted; superseded by the final doorway candidate**

Subsequent physical verdict: the user reported that the blocks worked on the target phone, which cleared the Brick/Log pilot gate and authorized continuation into doors, windows, formations, and page@4 migration. The final doorway candidate has its own physical gate in `SNAPPING-OVERHAUL-FINAL-REPORT.md`.

## Commits and publication

- Starting feature HEAD: `804e02ead62bd05a10a846c928dec97c8f5c4063`
- Phase 3 implementation: `18ad2a585d41b3c580f94a803724536bab0ef032`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Pages parent: `e343c0c5741e26ae1325d83374dec10525d58353`
- Pages commit: `a5883a78862a00b8bcc9f6c823dc674a79934d52`
- Live candidate: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=a5883a7-3`
- GitHub Pages deployment run: `32397832576` — PASS

Only `blockfolk-imaginarium/index.html` changed on Pages. The Pages root SHA-256 remained `c27a8e4dadc7e2d94ad1c94f85d6316d0a8ad6ee9a00b05b2024c675df34e456` before and after publication.

## Production pilot boundary

Exactly two typed profiles are enabled:

- Brick Block: canonical extent `420 / 1.1^10 = 161.928181560403`, source size 273 × 325, alpha `(25,25)–(247,300)`, origin `(136.5,163)`.
- Log Block: canonical extent `420 / 1.1^10 = 161.928181560403`, source size 274 × 326, alpha `(24,24)–(249,301)`, origin `(136.5,163)`.

Both use the reviewed column vector `(55.6,32.1)`, tier vector `(0,-73.1)`, planes `wall-iso-a` and `wall-iso-b`, and the six semantic ports `cellMount`, `wallLeft`, `wallRight`, `stackTop`, `stackBase`, and `wallFace`. Brick/Log mutual snapping cannot fall back to legacy rectangular anchors. Doors remain creator-disabled; every other construction asset remains behind the existing compatibility boundary. No formation or page@4 migration is present.

Ordinary dragging never creates a connection. One deliberate activation of the permanent `snap-context` control creates at most one typed edge through an immutable transaction. Candidate validation enforces screen-space acquisition tolerance, scale, plane, opposing normal, reciprocal type, capacity, duplicate, same-component, and ambiguity rules. Unsupported connected-component Turn is rejected with guidance instead of corrupting the v1 wall axes.

## Component behavior and persistence

- Dragging either member moves the complete connected component.
- Resize and Flip apply to the component and refresh typed relative transforms; Flip changes wall plane A/B without free rotation.
- Behind/In Front move the component as one contiguous layer while preserving internal order.
- Copy creates fresh sticker and typed connection IDs; Trash, Undo, and Redo operate atomically.
- Save/reload and portrait/landscape changes preserve typed connections, transforms, camera state, and controller state.
- Intentional Unsnap removes only the selected member's incident edge, leaves placement unchanged, and reports exactly `Sticker detached.`.
- Existing page@3 legacy connections remain valid and existing sticker sizes/transforms are not rewritten.

## Rendered evidence

All committed screenshots were visually inspected:

| Evidence | SHA-256 |
| --- | --- |
| `art/evidence/snapping-block-pilot-phase3/brick-horizontal-connected-400x844.png` | `46303849a5a9ec36d7657b788bdc71236f3710016596231d57469780529cabb0` |
| `art/evidence/snapping-block-pilot-phase3/log-vertical-connected-400x844.png` | `96ea6995ea674d463af6c242f324a9c8fd084638eb601bec57a8e3cb30924d9c` |
| `art/evidence/snapping-block-pilot-phase3/log-vertical-connected-844x400.png` | `e802e8e89dffd5acab72f9b4539259e6d37926bf315207c128938f99491faf25` |
| `art/evidence/snapping-block-pilot-phase3/brick-component-moved-400x844.png` | `11a24a30c23071f7fc484eef83c62c54f1ee749f846fb4c15cdfc889eb4c08b8` |
| `art/evidence/snapping-block-pilot-phase3/brick-component-flipped-400x844.png` | `b03b61c5d9a74f952feebccd2cbc629f40e60ec07f2833bd3327972cd1a59c9b` |
| `art/evidence/snapping-block-pilot-phase3/brick-component-persisted-844x400.png` | `ff8fcbe36684497297ca0a272525848555e04782aef5ae384f0a05ef64263735` |
| `art/evidence/snapping-block-pilot-phase3/brick-deliberately-detached-400x844.png` | `9fec692fdda670a09a61675dc9e829cd286db4c4dac3d73936378fe9d19c1ca6` |

The accepted evidence shows side-by-side Brick, vertically stacked Log, whole-component movement, plane-preserving Flip, persisted landscape state, a fitting phone toolbar, and deliberate detachment without visual displacement.

## Verification

| Lane | Exact result |
| --- | --- |
| Focused/static/source | PASS |
| Typed Brick/Log model | PASS: canonical insertion, horizontal/vertical/mixed candidates, scale and plane rejection, one-edge transaction, capacity, idempotent persistence, old-size preservation |
| Local typed browser | PASS: seven screenshots, zero errors, zero unexpected requests |
| Native-touch controller | PASS: same DOM node/control ID, one activation after more than 800 ms, persistent edge, later one-shot Unsnap with exact feedback |
| General production browser | PASS at 400 × 844 and 844 × 400; all 30 stickers and native emoji; zero errors and zero runtime requests |
| Lint and typecheck | PASS |
| Complete repository tests | PASS: 46 files, 316 passed, 2 documented skips |
| One-Shot validation | PASS |
| SFHS inspect/validate/test/check/pack/verify | PASS with zero findings |
| Packed/offline audit | PASS |
| Deterministic double pack | PASS: both outputs byte-identical |
| Live general browser | PASS: all 30 stickers, native emoji, portrait/landscape persistence, zero errors, zero requests |
| Live typed browser | PASS: real-touch pilot, seven scenarios, zero errors, zero requests |

## Artifact and integrity

- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-01551aec11aa`
- Bytes: `12,298,062`
- SHA-256: `7e2ef06eacbbf0f38ad830eb52dc980afe0bbfbec84461aad85d92332c078454`
- Live download: byte-identical to the artifact
- Original Imaginarium tree: `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`
- Original Imaginarium accepted artifact: `10,349,547` bytes, SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`
- Production Valley WebP: unchanged, SHA-256 `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`
- Classic Valley PNG: unchanged, SHA-256 `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`
- Accepted 30-sticker aggregate: unchanged, SHA-256 `7faf96032388e45cafb132bc548f3335b85c039c213ff471764c6d59b64d149b`
- Categories and counts: Animals 2, People 6, Building 6, Nature 12, Magic 4, Emoji native input
- Original Imaginarium, Ueye, both backgrounds, sticker bytes, categories, storage namespaces, and unrelated tracked paths: unchanged

## Physical gate — resolved

The pilot originally stopped for the following target-Samsung checks:

1. Two Brick Blocks connect side-by-side only after pressing Snap.
2. Two Log Blocks connect vertically only after pressing Snap.
3. Dragging either member keeps the pair locked.
4. Flip preserves the connection and visibly changes wall direction.
5. Pressing the same contextual control again intentionally detaches once.

The user subsequently reported that the blocks worked. Phase 3 status is therefore **PHYSICAL PASS**, and the product continued into the separately gated final doorway candidate.
