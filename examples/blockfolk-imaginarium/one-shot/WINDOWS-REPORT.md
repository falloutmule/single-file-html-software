# BlockFolk Stage 3 One-Cell Windows Report

Status: **AUTOMATED PASS — EXACT PAGES ARTIFACT PUBLISHED — SAMSUNG CHECK PENDING**

## WHAT WAS DONE

- Enabled Square Window and Round Window as real one-cell construction occupants through the shared `blockfolk-one-cell-window@1` contract.
- Gave each window only the four contacts appropriate to one wall plane: two horizontal neighbors and `+Z`/`-Z`.
- Kept the existing whole-assembly Flip behavior as the route from the authored iso-a plane to the mirrored iso-b plane.
- Used asset-local visible-anchor calibration only to place each differently proportioned PNG on the same logical cell basis as blocks.
- Preserved the Stage 1/2 grid, exact `73.1` Z tier, occupancy, pose arbitration, Snap/Unsnap controller, logical-Z draw order, transforms, persistence, page@3 schema, Classic world, catalog, and assets.
- Did not add hidden blocks, overlays, formation counters, typed ports, recipes, schema fields, pair rules, or door behavior.

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

## REPRODUCIBLE WINDOW CALIBRATION

Painted pixels are decoded PNG pixels with alpha greater than `8` on the 0–255 scale. Bounds are inclusive. Center offsets compare the painted-bounds center with the source-image center.

| Window | Source | Painted bounds | Painted size | Center offset | Normalized size |
|---|---:|---:|---:|---:|---:|
| Square | 268×363 | 25,25–242,337 | 218×313 | 0, 0 | 0.813433×0.862259 |
| Round | 305×359 | 25,25–279,333 | 255×309 | 0, 0 | 0.836066×0.860724 |

Both visible centers are exact. Their independent source aspect ratios are recorded in the construction profile solely to calibrate visible horizontal contacts to the canonical block-cell basis; topology remains shared.

## WHAT FAILED DURING VERIFICATION

- The broad product browser scenario still expected windows to be ordinary, Snap-disabled stickers. That Stage 2 assertion was updated to the authorized Stage 3 contract while retaining the Door-disabled proof.
- The first revised assertion looked for a non-existent nested label element. It was corrected to verify the real permanent controller's accessible label; the rerun and complete browser suite pass.
- The SFHS changed-path selector retains its known review warning for project-specific paths. Explicit model, calibration, window browser, full product, exact-artifact, and live browser lanes cover every changed production and test path.

## CURRENT EXACT STATE

- Branch: `feature/blockfolk-grid-snap-completion-001`
- Implementation commit: `9e87f07aca359f496c7e6a44d49fd2bea9bdcbe3`, pushed to origin
- Build ID: `blockfolk-imaginarium-784613d4bf95`
- Source SHA-256: `784613d4bf95edc6866e5b65547dac7a85d2d8889b2924276c19fa0a452dadb2`
- Artifact bytes: `10,385,659`
- Artifact SHA-256: `73209ea4b628b6aa4f231ac3c2eba062c98bbb044cdf5e3d94f61b034f8141fd`
- Pages commit: `aecd496f7fa80f90b49a49f2a2f5b47ba51dc211`
- Pages workflow: `32967861432`, passed
- Live retrieval: `10,385,659` bytes and exact SHA-256 match
- Packed inventory: `9,702,970` media bytes, `630,428` JavaScript bytes, `31,584` CSS bytes, and `20,677` HTML/tag bytes; 31 active BlockFolk PNGs and zero unclaimed media

## REPRESENTATIVE SAMSUNG CHECK

Run this once on the published candidate:

> Brick → Square Window → Brick → Flip → drag the three-piece assembly → save/reload → Unsnap once

Pass means the window visibly occupies the middle wall cell, Flip keeps the wall coherent, all three members move and reload together, and one Unsnap activation detaches the selected window without moving the pieces.

No Round Window matrix is required on the phone; the shared-contract automated proof owns that coverage.

## REMAINING BLOCKER

- Stage 3 physical acceptance is pending the single representative Samsung sequence above.

## EVIDENCE

- Ignored pre-edit backup: `test-results/blockfolk-windows-001/index.before-windows.html`
- Exact candidate: `test-results/blockfolk-windows-001/blockfolk-windows-001.html`
- Window calibration JSON: `test-results/blockfolk-windows-001/window-calibration.json`
- Packed inventory: `test-results/blockfolk-windows-001/packed-asset-inventory.json`
- Local screenshots/proof: `test-results/blockfolk-windows-001/browser/`
- Exact candidate proof: `test-results/blockfolk-windows-001/exact-window/browser/`
- Live window proof: `test-results/blockfolk-windows-001/live-window/browser/`
- Live product proof: `test-results/blockfolk-windows-001/live-product/`
- Pages workflow: `https://github.com/falloutmule/single-file-html-software/actions/runs/32967861432`

## GITHUB PAGES URL

- `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=aecd496-9e87f07-784613d4bf95`

## RESULT

**STAGE 3: AUTOMATED PASS / EXACT PAGES ARTIFACT PUBLISHED / STOPPED FOR ONE REPRESENTATIVE SAMSUNG WINDOW CHECK**
