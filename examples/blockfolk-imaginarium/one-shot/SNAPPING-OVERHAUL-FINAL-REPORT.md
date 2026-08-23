# BlockFolk Snapping Overhaul — Final Automated Report

> **SUPERSEDED BY PHYSICAL FAILURE.** Samsung review showed the Stone Door too short and partly over/behind a Log Block. The automated PASS claims below are historical evidence only and are not current product or release authority. See `docs/archive/TYPED-SNAP-FORMATION-ENGINE-2026-08-20.md` and the grid-snap recovery Phase 0 report.

Status: **AUTOMATED PASS / FAIL — awaiting physical Samsung review**

## Release identity

- Verified starting feature HEAD: `8ac907e914bc29e37f71e64a1273000c7f319e0b`
- Implementation commit: `499636e63e9906b08a80582beeeff5c2a1b89206`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Fetched Pages parent: `a5883a78862a00b8bcc9f6c823dc674a79934d52`
- Pages commit: `200dd59ffe5f6fe906effcae50c9695c3a5305aa`
- GitHub Pages deployment run: `32414114121` — PASS
- Live phone candidate: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=200dd59`
- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-7852b7f329b4`
- Bytes: `12,308,382`
- SHA-256: `288c6664584137ceb97226b29a3fd6bcdd99aaac5b1056f7daa268f1d00f92c6`

Two isolated canonical packs produced the same Build ID, byte count, and SHA-256. The live HTTPS download is byte-identical to the accepted local artifact.

## Final construction model

One production snap engine now owns exactly fourteen construction assets:

- Blocks: Grass, Dirt, Stone, Sand, Snow, Water, Lava, Log, Leaves, and Brick.
- Doors: Wooden Door and Stone Door.
- Windows: Square Window and Round Window.

All ten blocks use the accepted canonical construction extent `420 / 1.1^10 = 161.928181560403` world units, the reviewed column vector `(55.6,32.1)`, tier vector `(0,-73.1)`, and distinct `cellMount`, `wallLeft`, `wallRight`, `stackTop`, `stackBase`, and `wallFace` ports. Doors use an authored two-tier height: Stone Door scale `(73.1 × 2) / (398 - 25) = 0.3919571045576407`; Wooden Door scale `(73.1 × 2) / (390 - 25) = 0.4005479452054794`. Existing saved scales remain authoritative.

Stone and Wooden Doors expose five unique structural slots: lower-left jamb, lower-right jamb, upper-left jamb, upper-right jamb, and lintel. Only Brick and Log `cellMount` ports are doorway-frame compatible. Two doorway cells stay reserved. Windows use one `wallMount` port and blocks use a separate capacity-one `wallFace` receiver, so windows never compete with door semantics.

Candidate discovery validates reciprocal types, discrete wall plane, supported orientation, opposing normals, scale within 1%, capacity, duplicates, current component, reserved cells, and the calibrated 36 CSS-pixel acquisition radius. Port pairs that imply one transform become one candidate pose; supporting correspondences strengthen that pose, while one deliberate Snap records exactly one canonical edge. Meaningfully distinct tied poses are rejected. The obsolete generic fallback is absent from new production candidate generation.

## Components, formations, and controls

- Ordinary dragging never connects pieces. Snap occurs only after a deliberate activation of the permanent `snap-context` controller.
- The controller retains the same DOM node, control ID, focus target, and duplicate-click suppression state while its label changes between Snap and Unsnap.
- A later native touch intentionally detaches once and reports exactly `Sticker detached.`.
- Connected components move, resize, Flip, move Behind/In Front, Copy, Trash, Undo/Redo, save/reload, change orientation, enter puzzles, and export as unified assemblies.
- Copy creates fresh sticker and connection IDs. Unsnap removes only the selected member's incident edges and allows the graph to split safely.
- Component depth stays contiguous relative to unrelated stickers; blocks remain behind mounted doors/windows and unrelated layers are not reordered by component-local depth repair.
- One through four occupied doorway slots report honest partial progress. Five same-material slots derive `Doorway complete`; no completion boolean or synthetic edge is stored.
- Five mixed Brick/Log slots remain `Doorway 5 of 5` but partial because no mixed-material completion policy has been approved.
- Both door-first and frame-positioned-first workflows pass through visible touch controls. Square and Round Window mounts pass and render above their hosts.

## Page@4 migration

New records use `blockfolk-imaginarium.page@4`. Page@1, page@2, and page@3 remain readable. Migration occurs in memory first and preserves sticker identity, coordinates, scale, angle, Flip, opacity, z-order, camera, category, embedded assets, and valid legacy/typed connections.

Failed historical door overlay and fake-jamb links are quarantined in memory without deleting or moving stickers. The raw page@3 record remains unchanged while the user only pans, zooms, changes orientation, uses Fit, or opens a camera bookmark. Those view-only actions and passive save attempts make zero storage writes. The first explicit content mutation or intentional Done/save writes one normalized page@4 record. Migration notices are tracked per picture for the active session and stop after normalization. Original Imaginarium namespaces and sentinels are never opened for mutation.

## Verification

| Lane | Exact result |
| --- | --- |
| Focused source/static/model | PASS: 14 typed profiles; 10 block calibrations; both doors/windows; pose consensus; graph invariants; partial/complete/mixed doorway formation; migration quarantine |
| Local general production browser | PASS at `400 × 844` and `844 × 400`; 30 stickers; 6 categories; native emoji; zero errors/requests |
| Local typed block pilot | PASS: 7 scenarios; native-touch stable controller; zero errors/requests |
| Local doorway/window browser | PASS: Brick and Log complete formations, both doors, frame-positioned-first flow, Square/Round Window, group operations, PNG, puzzle, migration-independent persistence; zero errors/requests |
| Page@4 browser | PASS: view-only raw preservation and exactly one authorized normalization write |
| Calibration harness | PASS: 4 screenshots, both phone orientations, zero failures/unexpected requests |
| Background render diagnosis | PASS: 4096 source, Retina 2× backing, high-quality smoothing; no asset change |
| Lint / typecheck | PASS / PASS |
| Complete repository tests | PASS: 46 files, 316 passed, 2 documented skips |
| One-Shot validation | PASS |
| SFHS inspect / validate / build / test / check / pack / verify | PASS, zero findings |
| Packed/offline audit | PASS: isolated identity, six categories, two accepted Valley choices, 30 exact PNG stickers, no source sheets/external code |
| Deterministic double pack | PASS: both `12,308,382` bytes and SHA-256 `288c6664…92c6` |
| Live general browser | PASS at both phone orientations; zero errors and zero runtime requests |
| Live typed pilot / doorway / migration browsers | PASS; both windows; PNG/puzzle; zero errors and zero unexpected requests |
| Live byte identity | PASS: `12,308,382` bytes and exact local SHA-256 |

## Visual evidence

The contact sheet is `art/evidence/snapping-overhaul-final/required-12-contact-sheet.png`, SHA-256 `b14863626a5d32c0d308da35698c2e6a65f0f13fdd95dc53d5d1c573cb8fcf6f`. The following deployed-artifact screenshots were visually inspected:

| Scene | Portrait SHA-256 | Landscape SHA-256 |
| --- | --- | --- |
| Unsnapped door near block | `ff6e75f42510b5703783b6164112c278a80e2dd5f30f2c6c3a62d3f22fdcb5fd` | `a27f52f9691287d50f23d9779ededaf216554f0a6bfd5cad32e66494bdf2cf97` |
| Completed Brick doorway | `a5f3e9c7269a17ed9d1324357a98a530911746e901c087a5ad07b09813d6e22c` | `f9b44b9c7073573a521c4b337c8531ec4e7545f2770d4ea2b4e21beaa5270146` |
| Completed Log doorway | `063399a823d438504de274c31a7d3319289b18b4218863fb6c1d67f6a5be8843` | `a9d9aed8fa541335a50ce9e915a76ca77a03432a6fe8bcd986ba5941eca84cd7` |
| Assembly moved by door | `8b9c913d7493a324e5887c9018744f4d54a27a1566ade4230fd4692db5710158` | `99aeda92981dddbcaa36c8b05a76f113b91e0049a56d67a824fc0af62c53c654` |
| Assembly moved by block | `d09aea8ff20269261736410d95bf1881c56423761ecea123003a8a36054ded6b` | `c9e1299a1c4af81b8b437e9cf121dd6393c9c6ae432c1b98ef573e7452bb87df` |
| Deliberately unsnapped member | `9f62abe2b6ba4baf45ebb04f466493f2cc7920923881594b34f94eee26f5ebaf` | `a8769e0ac411ceb0ee83197d875a70b216610053d26041699f3b2707fa8c7275` |

No complete block is directly behind the door, no reserved opening cell is occupied, no alignment drifts between orientations, and the contextual controller remains stable. Automated visual inspection cannot replace the target-device verdict.

## Integrity and Pages isolation

- Original Imaginarium diff from the verified starting HEAD: empty.
- Original artifact: `10,349,547` bytes; SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`.
- Original localStorage and IndexedDB sentinels: unchanged in the complete browser lane.
- Ueye diff: empty.
- BlockFolk asset diff: empty.
- Production Valley WebP: `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`.
- Classic Valley PNG: `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`.
- Accepted sticker count: 30; no sticker or background bytes changed.
- Categories remain Animals 2, People 6, Building 6, Nature 12, Magic 4, and native Emoji.
- Pages changed only `blockfolk-imaginarium/index.html`. The unrelated Pages tree digest remained `83f57eec36a0d7a3becf5ff2b5ca4f0c81918071a7884e699eba222c9f5211e0`.
- No PR, tag, release, Pages-root replacement, original route change, or unrelated deployment occurred.

## Physical gate

All implementation, automated verification, push, publication, and live verification work is complete. Per the approved snapping-overhaul definition of done, overall status remains **FAIL — awaiting physical Samsung review** until the user confirms on the deployed URL that:

1. A Stone or Wooden Door plus five Brick or Log frame pieces visibly forms the intended one-wide, two-tier doorway.
2. Snap occurs only after the Snap button is pressed and each press adds one persistent connection.
3. Progress advances honestly from `Doorway 1 of 5` through `Doorway complete`.
4. Dragging the door or any connected block keeps the complete assembly locked.
5. A deliberate Unsnap detaches once and leaves every sticker in place.

Physical evidence supersedes this automated report.
