# BlockFolk Stage 1 Logical-Z Draw-Order Repair Report

Status: **AUTOMATED PASS — EXACT PAGES ARTIFACT PUBLISHED / SAMSUNG RETEST PENDING**

## WHAT WAS DONE

- Recorded the Samsung result as authoritative: the prior build created a real Z connection but painted the lower tier after the upper tier, producing staggered cubes instead of a continuous wall.
- Kept the accepted 73.1-world-unit Z tier, A/B/Z candidate engine, Snap/Unsnap controller, page@3 schema, transforms, connections, Classic world, and assets unchanged.
- Added one construction-grid-aware internal ordering routine. Valid contiguous assemblies now paint by logical Z ascending, then the accepted same-tier `top → left → stable layer ID` rule.
- Kept each assembly inside its existing contiguous Fabric canvas slot. Unrelated sticker order, whole-assembly Behind/In Front, inconsistent/legacy/non-construction groups, and Unsnap behavior are unchanged.
- Reapplied canonical ordering after Snap, full/recovery rendering, Flip, Copy, and undo/redo restoration. Render-time correction does not itself rewrite stored `zIndex`; the next normal save may persist the corrected order.

## WHAT WAS VERIFIED

- Directly proved for every comparable member pair that lower logical Z has a lower Fabric canvas index than higher logical Z.
- Proved creation order, selected member, +Z/−Z edge direction, and mixed Log/Brick materials cannot determine vertical paint order.
- Proved three tiers render `Z0 → Z1 → Z2`; a 2×2 wall paints both bottom members before both top members while retaining the same-tier A/B rule.
- Proved Flip recomputes same-tier ordering without changing logical Z or connections; Copy, Behind/In Front, and Flip preserve each component's contiguous slot relative to unrelated assemblies.
- Proved save/reload, undo/redo, and a deliberately reversed recovery payload render canonically. Recovery rendering leaves the stored payload untouched until a normal canvas sync.
- Proved whole-component drag and non-destructive Unsnap retain exact member transforms and expected topology changes.
- Preserved exact 73.1 Z separation, existing A/B geometry, multi-zoom touch arbitration, ambiguity/occupancy atomicity, one activation/one edge, and permanent controller identity.
- `test:source`, `test:browser`, lint, typecheck, SFHS inspect/validate/check/pack/verify, packed purity, and deterministic isolated double-build pass. The SFHS path-map review warning was manually covered by the complete source and browser suites.
- Packed inventory explains all `10,384,790` bytes: `9,702,970` media bytes, `629,559` JavaScript bytes, `31,584` CSS bytes, and `20,677` HTML/tag bytes; no unclaimed media exists.
- Exact local candidate and both isolated builds are byte-identical. The exact candidate passes the focused construction browser and full portrait/landscape product browser lanes with zero unexpected requests or console/page errors.
- Live Pages retrieval is exactly `10,384,790` bytes with SHA-256 `9909e92fb7072e78e820195146ac49b857184f3d8df8f20caf23d227a42530bb`.
- Live Chromium passes logical-Z ordering, 2×2 merge, Flip, assembly drag, save/reload, reversed recovery rendering, Copy, Behind, Unsnap, Classic world, six categories, all 30 accepted stickers, native Unicode emoji, and page@4 zero-write protection.

## WHAT FAILED

- Physical Samsung Stage 1 acceptance remains failed from the prior candidate until this published replacement passes the single bounded retest.
- The first isolated determinism attempt lacked one offline ESLint tarball. The authorized retry used the existing package store plus a process-local Git safe-directory setting; no global Git configuration or tracked dependency state changed.

## CURRENT EXACT STATE

- Worktree: `.worktrees/blockfolk-grid-snap-completion-001`.
- Branch: `feature/blockfolk-grid-snap-completion-001`.
- Implementation commit: `00dca0f8c3f09b0dfdc645f6881428614af7a4aa`, pushed to origin.
- Build ID: `blockfolk-imaginarium-d565ed2db9cc`.
- Artifact bytes: `10,384,790`.
- Artifact SHA-256: `9909e92fb7072e78e820195146ac49b857184f3d8df8f20caf23d227a42530bb`.
- Source SHA-256: `d565ed2db9cc72ee74eaa0f26009020be0a71f8f8e12a21a6e998a7e7aaa56e3`.
- Exact local phone file: `test-results/blockfolk-logical-z-order-001/blockfolk-logical-z-order-001.html`.
- Pages commit: `e25c245670d1e8b96ad74140997d2a78129fff85`, changing only `blockfolk-imaginarium/index.html` and pushed to `origin/gh-pages`.
- Pages deployment workflow: `32909695420`, passed.

```text
CLASSIC_ONLY_WORLD: PASS
PAGE3_COORDINATE_PRESERVATION: PASS
HORIZONTAL_A_B: REGRESSION PASS
VERTICAL_Z_GEOMETRY: REGRESSION PASS
LOGICAL_Z_DRAW_ORDER: AUTOMATED PASS
COMPONENT_2_PLUS_2_WALL: AUTOMATED PASS
FLIP_REORDERING: AUTOMATED PASS
PUBLICATION: PASS / LIVE BYTES IDENTICAL
PHYSICAL_SAMSUNG: FAIL / REPLACEMENT RETEST PENDING
STAGE_2_PLUS: NOT STARTED
```

## REMAINING BLOCKERS

- The exact live replacement must pass one Samsung sequence before Stage 1 can complete.

## NEXT ACTIONABLE STEP

On the exact live candidate below, run only: create two horizontal Brick pairs → merge vertically into a coherent 2×2 wall → Flip → drag → save/reload → Unsnap once.

## EVIDENCE

- Ignored backup: `test-results/blockfolk-logical-z-order-001/index.before-logical-z-order.html`, SHA-256 `b1cf13cce4f5740ce8b04d3ea533bf855bd74707aed6527ba732b1d53fea6b9f`.
- Determinism: `test-results/blockfolk-logical-z-order-001/determinism-report.json` and `deterministic-index.html`.
- Exact candidate: `test-results/blockfolk-logical-z-order-001/blockfolk-logical-z-order-001.html`.
- Local and exact construction proofs: `test-results/blockfolk-logical-z-order-001/browser/` and `exact-grid/`.
- Exact product proofs: `test-results/blockfolk-logical-z-order-001/exact-product/` and `exact-page4/`.
- Live response and proofs: `test-results/blockfolk-logical-z-order-001/live-pages-index.html`, `live-grid/`, `live-product/`, and `live-page4/`.

## GITHUB PAGES URL

- `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e25c245-00dca0f-d565ed2db9cc-1`
- Live bytes: `10,384,790`.
- Live SHA-256: `9909e92fb7072e78e820195146ac49b857184f3d8df8f20caf23d227a42530bb`.
- Live smoke: **PASS** in portrait and landscape with zero runtime requests and zero console/page errors.

## RESULT

**AUTOMATED PASS / EXACT PAGES ARTIFACT PUBLISHED / PHYSICAL SAMSUNG RETEST PENDING**
