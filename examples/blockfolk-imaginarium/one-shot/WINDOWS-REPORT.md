# BlockFolk Stage 3 One-Cell Windows Report

Status: **AUTOMATED PASS — EXACT PAGES ARTIFACT PUBLISHED — SAMSUNG CHECK PENDING**

## WHAT WAS DONE

- Enabled Square Window and Round Window as real one-cell construction occupants through the shared `blockfolk-one-cell-window@1` contract.
- Gave each window only the four contacts appropriate to one wall plane: two horizontal neighbors and `+Z`/`-Z`.
- Kept the existing whole-assembly Flip behavior as the route from the authored iso-a plane to the mirrored iso-b plane.
- Used asset-local visible-anchor calibration only to place each differently proportioned PNG on the same logical cell basis as blocks.
- Preserved the Stage 1/2 grid, exact `73.1` Z tier, occupancy, pose arbitration, Snap/Unsnap controller, logical-Z draw order, transforms, persistence, page@3 schema, Classic world, catalog, and assets.
- Did not add hidden blocks, overlays, formation counters, typed ports, recipes, schema fields, pair rules, or door behavior.
- After the first Samsung check exposed the rear/left window being painted behind its neighboring block, changed only equal-tier internal assembly ordering: blocks paint first and window faces paint afterward. Logical Z remains the first and controlling draw-order key.

## WHAT WAS VERIFIED

- Both windows have one logical footprint cell, the same shared window profile ID, zero visible-origin offset, and only `+A`, `-A`, `+Z`, and `-Z` contacts in iso-a.
- Flip exposes the equivalent iso-b wall plane without changing cell occupancy, connections, or Z geometry.
- Exact A-wall and mirrored B-wall placement, `+Z`, `-Z`, mixed block/window contact, occupied-cell rejection, and legacy connection readability pass in the model lane.
- Square Window connects between two Brick blocks as exactly three occupied cells with no hidden block.
- Round Window connects between two Log blocks and accepts a vertical Brick neighbor; the resulting assembly contains four occupied cells and no hidden block.
- Browser verification uses the visible Building catalog, native touch dragging, and the public Snap/Unsnap controller.
- Flip, whole-assembly drag, exact save/reload, PNG export, puzzle export, and Unsnap pass through public product behavior.
- Unsnap removes the selected window's incident edges without moving any member.
- Portrait `400×844` and landscape `844×400` screenshots show both authored window shapes and the mirrored plane.
- Stage 1 grid, Stage 2 all-material, full catalog/product, historical page@3, read-only page@4, lint, typecheck, repository, SFHS inspect/validate/check/build/pack/verify, packed purity, and deterministic double-pack lanes pass.
- Local source, exact candidate, and live Pages Chromium lanes report zero unexpected requests and zero console/page errors.
- Direct Fabric-index assertions prove Square and Round windows paint after same-tier blocks on both horizontal sides, before and after Flip. Creation order and selected member no longer decide whether the window frame is visible.

## SAMSUNG FINDING AND BOUNDED REPAIR

- Physical evidence from the first Stage 3 candidate showed a connected window on the rear/left contact behind its Log neighbor while the still-loose front/right window appeared correctly in front.
- Root cause: canonical assembly order used logical Z and then generic screen `top → left`; that was valid for blocks but allowed one authored window face to paint before its adjacent block.
- Repair: keep logical Z first, then paint blocks before window faces within the same tier, then retain the existing `top → left → stable ID` order inside each kind.
- Unchanged: cell coordinates, `73.1`, candidate selection, connections, transforms, assets, persistence, controller behavior, whole-component layer movement, and block-only A/B ordering.

## REPRODUCIBLE WINDOW CALIBRATION

Painted pixels are decoded PNG pixels with alpha greater than `8` on the 0–255 scale. Bounds are inclusive. Center offsets compare the painted-bounds center with the source-image center.

| Window | Source | Painted bounds | Painted size | Center offset | Normalized size |
|---|---:|---:|---:|---:|---:|
| Square | 268×363 | 25,25–242,337 | 218×313 | 0, 0 | 0.813433×0.862259 |
| Round | 305×359 | 25,25–279,333 | 255×309 | 0, 0 | 0.836066×0.860724 |

Both visible centers are exact. Their independent source aspect ratios are recorded in the construction profile solely to calibrate visible horizontal contacts to the canonical block-cell basis; topology remains shared.

## WHAT FAILED DURING VERIFICATION

- The first published Stage 3 candidate physically failed the left/rear window-face ordering check. The screenshot-backed defect is repaired in the replacement candidate below; physical re-acceptance remains pending.
- The broad product browser scenario originally expected windows to be ordinary, Snap-disabled stickers. That Stage 2 assertion was updated to the authorized Stage 3 contract while retaining the Door-disabled proof.
- The first revised assertion looked for a non-existent nested label element. It was corrected to verify the real permanent controller's accessible label; the rerun and complete browser suite pass.
- The SFHS changed-path selector retains its known review warning for project-specific paths. Explicit model, calibration, window browser, full product, exact-artifact, and live browser lanes cover every changed production and test path.

## CURRENT EXACT STATE

- Branch: `feature/blockfolk-grid-snap-completion-001`
- Stage 3 registration commit: `9e87f07aca359f496c7e6a44d49fd2bea9bdcbe3`
- Window-foreground repair commit: `a936f48f07f2ed7ce6cdb1b35c28dd2f03e30f58`, pushed to origin
- Build ID: `blockfolk-imaginarium-6731182612c5`
- Source SHA-256: `6731182612c5ef5a45c4a74ca5ab9693ce5807273e2c92c6f9d4e7a709ec328d`
- Artifact bytes: `10,385,756`
- Artifact SHA-256: `fee6b596b3202117daa86e859933e97d4c573902157adc2b87086e126bb20f6e`
- Pages commit: `d93305f22fed5f2355aa5140c1d21f17b91cb5ff`
- Pages workflow: `32976877807`, passed
- Live retrieval: `10,385,756` bytes and exact SHA-256 match
- Packed inventory: `9,702,970` media bytes, `630,525` JavaScript bytes, `31,584` CSS bytes, and `20,677` HTML/tag bytes; 31 active BlockFolk PNGs and zero unclaimed media

## REPRESENTATIVE SAMSUNG CHECK

Run this once on the replacement candidate:

> Put Square Window on the rear/left side of one Log → Snap → confirm the full window frame stays in front → Flip → confirm it remains in front

Pass means Snap no longer pushes the rear/left window frame behind the Log, and Flip does not reintroduce the occlusion.

No Round Window matrix is required on the phone; the shared-contract automated proof owns that coverage.

## REMAINING BLOCKER

- Stage 3 physical re-acceptance is pending the single foreground sequence above.

## EVIDENCE

- Ignored pre-edit backup: `test-results/blockfolk-windows-001/index.before-windows.html`
- Pre-repair backup: `test-results/blockfolk-window-foreground-001/index.before-window-foreground.html`
- Exact replacement candidate: `test-results/blockfolk-window-foreground-001/blockfolk-window-foreground-001.html`
- Window calibration JSON: `test-results/blockfolk-windows-001/window-calibration.json`
- Replacement packed inventory: `test-results/blockfolk-window-foreground-001/packed-asset-inventory.json`
- Local screenshots/proof: `test-results/blockfolk-windows-001/browser/`
- Exact replacement proof: `test-results/blockfolk-window-foreground-001/exact-window/browser/`
- Live replacement window proof: `test-results/blockfolk-window-foreground-001/live-window/browser/`
- Live replacement product proof: `test-results/blockfolk-window-foreground-001/live-product/`
- Pages workflow: `https://github.com/falloutmule/single-file-html-software/actions/runs/32976877807`

## GITHUB PAGES URL

- `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=d93305f-a936f48-6731182612c5`

## RESULT

**STAGE 3: AUTOMATED PASS / EXACT PAGES ARTIFACT PUBLISHED / STOPPED FOR ONE REPRESENTATIVE SAMSUNG WINDOW CHECK**
