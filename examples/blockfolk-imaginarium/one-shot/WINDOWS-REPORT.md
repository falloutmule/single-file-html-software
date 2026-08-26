# BlockFolk Stage 3 One-Cell Windows Report

Status: **AUTOMATED AND PUBLICATION PASS — REPRESENTATIVE SAMSUNG CHECK PENDING**

## AUTHORITY AND PRIOR PHYSICAL FAILURE

The preceding Stage 3 build (`blockfolk-imaginarium-6731182612c5`) physically failed. Its Square Window connected and painted in front, but remained approximately full-cube height and read as a decoration attached to a neighboring block rather than a wall-cell occupant. That Samsung result remains authoritative for the old build; it is not reclassified as a pass.

This bounded repair changes only window creation scale and window construction calibration. Failed oversized Stage 3 prototype saves are unsupported and receive no migration or load-time rewrite. Ordinary accepted page@3 pictures continue to load with their stored transforms unchanged.

## IMPLEMENTATION

- Square and Round Windows remain genuine one-cell occupants with no hidden block, overlay, recipe, or alternate topology.
- The immutable logical cell uses the accepted block projection: canonical extent `161.9281815604032`, projected aspect `273/325`, A anchors at `±0.4/±0.2`, and Z center step exactly `73.1` world units.
- Window artwork is visibly smaller while its ports and occupancy continue to use that full virtual block-cell basis.
- A profile-aware creation-extent lookup applies the calibrated extent only when a new window is added. All other assets retain their existing spawn extent.
- The authored iso-a plane exposes only `+A`, `-A`, `+Z`, and `-Z`; whole-assembly Flip remains the route to iso-b. No literal B ports were added.
- Stage 1/2 snapping, arbitration, controller behavior, connections, logical-Z order, persistence schema, background, catalog placement, and assets are unchanged.

## REPRODUCIBLE CALIBRATION

Painted pixels are decoded PNG pixels whose alpha is greater than `8` on the 0–255 scale. Bounds are inclusive. The starting visual ratio makes the painted frame exactly one accepted Z tier high; the decisive seam fixture required no additional adjustment.

| Window | Source | Painted bounds | Painted size | Visual ratio | Creation extent | Painted world size |
|---|---:|---:|---:|---:|---:|---:|
| Square | 268×363 | 25,25–242,337 | 218×313 | 0.5235488689 | 84.7773162939 | 50.9130990415×73.1 |
| Round | 305×359 | 25,25–279,333 | 255×309 | 0.5244823856 | 84.9284789644 | 60.3252427184×73.1 |

The measured visual-ratio release sweep is ±4% around each initial ratio. It is a Stage 3 calibration guard, not a framework-level definition for future artwork.

## VERIFICATION

- Model tests prove both windows retain one cell, four authorized contacts, the accepted full virtual cell, exact A geometry, exact `73.1` Z geometry, mixed block/window construction, occupied-cell rejection, and legacy connection readability.
- The decisive browser fixture constructs Brick → Square Window → Brick with a complete adjacent Brick row. Six visible occupants produce six distinct cells, with no block behind the window.
- The permanent public controller creates one vertical bridge between two three-cell rows. Direct logical-grid and Fabric-index assertions retain logical-Z ordering and the same-tier window-face order.
- Round Window independently proves the same middle-cell calibration, vertical growth, occupancy, and mirrored plane.
- Flip, whole-assembly drag, Bigger, assembly Copy, Undo, exact save/reload, recovery, PNG export, puzzle export, and non-moving Unsnap pass.
- Portrait `400×844` and landscape `844×400` screenshots show the calibrated walls at phone scale. The Square seam fixture visually closes without requiring adjustment beyond the measured starting ratio.
- Stage 1 grid, Stage 2 all-material, full catalog/product, historical page@3, read-only page@4, lint, typecheck, SFHS inspect/validate/check/build/pack/verify, packed purity, offline/no-request, and deterministic double-pack lanes pass.
- The frozen local candidate and the exact live Pages URL both pass window and full-product Chromium lanes with zero unexpected requests and zero console/page errors.

## PACKED ARTIFACT INVENTORY

The exact 10,386,296-byte artifact is fully explained:

- active BlockFolk media: 9,702,970 bytes;
- production JavaScript: 631,065 bytes;
- production CSS: 31,584 bytes;
- HTML/tag bytes: 20,677 bytes;
- 31 exact active BlockFolk PNGs;
- six essential bundled Lucide category icons;
- native Unicode emoji using the device font;
- zero unclaimed media, alternate worlds, donor/demo assets, emoji fonts, or runtime network dependencies.

## EXACT PUBLISHED STATE

- Branch: `feature/blockfolk-grid-snap-completion-001`
- Implementation commit: `473b336a421b92ccc907e801c881b7abb4a576bf`
- Build ID: `blockfolk-imaginarium-839cf9b08581`
- Source SHA-256: `839cf9b08581a06035607ddba23accbbe949cc8feee5ca02a7e2993fd215fa20`
- Artifact bytes: `10,386,296`
- Artifact SHA-256: `f499d8f4b26f0a22642b3856cea5e43353751f94ff5d4a17f89a33d2bb83c61d`
- Pages commit: `50221476c532df8bfd82212b6da7fb4e99e85d8b`
- Pages workflow: `33024768209`, passed
- Live retrieval: `10,386,296` bytes; SHA-256 exact match
- Live Chromium: portrait and landscape PASS; zero unexpected requests; zero console/page errors

## REPRESENTATIVE SAMSUNG CHECK — PENDING

Use only this sequence on the published candidate:

> Make Brick → Square Window → Brick, add the adjacent Brick row, Flip once, drag the assembly, save/reload, then Unsnap once.

Acceptance requires the Square Window itself to occupy the middle wall cell, with no hidden block behind it and clean seams to the neighboring cells. No Round Window matrix is required because both windows use the same verified logical-cell contract.

## EVIDENCE

- Pre-edit backup: `test-results/blockfolk-window-cell-calibration-001/index.before-window-cell-calibration.html`
- Frozen exact candidate: `test-results/blockfolk-window-cell-calibration-001/blockfolk-window-cell-calibration-001.html`
- Packed inventory: `test-results/blockfolk-window-cell-calibration-001/packed-asset-inventory.json`
- Local calibration and screenshots: `test-results/blockfolk-windows-001/`
- Exact-candidate Chromium: `test-results/blockfolk-window-cell-calibration-001/exact-window/` and `exact-product/`
- Live Chromium: `test-results/blockfolk-window-cell-calibration-001/live-window/` and `live-product/`
- Pages workflow: `https://github.com/falloutmule/single-file-html-software/actions/runs/33024768209`

## GITHUB PAGES URL

- `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=5022147-473b336-839cf9b08581`

## RESULT

**STAGE 3 CALIBRATION AND PUBLICATION: PASS. STAGE 3 PHYSICAL ACCEPTANCE: PENDING ONE REPRESENTATIVE SAMSUNG CHECK.**
