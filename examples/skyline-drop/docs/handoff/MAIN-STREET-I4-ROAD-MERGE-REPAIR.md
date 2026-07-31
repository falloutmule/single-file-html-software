# Main Street I4 and Shared-Road Repair

## Overall goal

Make Main Street a useful long connector instead of an awkward road–shop–road strip, while allowing established streets to be reused rather than duplicated.

## Current goal

Replace the three-cell Main Street with a straight four-cell district and permit road-on-road surface merging.

## Authorized design

```text
ROAD — ROAD — ROAD — SHOP
```

- Footprint: straight tetromino / I4
- Surface contents: three connected roads and one shop
- Jobs: unchanged at two
- Queue positions: unchanged
- Road Remix: unsupported because rotation already supplies the useful orientations

## Shared-road rule

An incoming road cell may occupy a cell that already contains a road.

- Road-on-road: allowed
- Road-on-home/shop/park/plaza: blocked
- Trees and mountains: unchanged
- Road entrance and utility hub protection: unchanged
- Underground conduit merging: unchanged

Shared road cells retain their original display owner and record every district that uses the road. This preserves district-level road access when several districts share the same street segment.

## Files changed

- `src/types.ts`
- `src/pieces.ts`
- `src/simulation.ts`
- `src/main.ts`
- `tests/simulation.test.full2.mjs`
- `tests/utility-overlap.test.mjs`
- `tests/current-piece-info-smoke.py`
- `tests/main-street-road-merge.test.mjs`
- `tests/main-street-road-merge-smoke.py`
- `package.json`
- `README.md`
- `INTAKE-STATUS.md`

## Verification summary

- Strict TypeScript: PASS
- Three deterministic level solutions: PASS
- Mechanics regression: PASS
- Utility overlap regression: PASS
- Road Remix regression: PASS
- Main Street I4 and shared-road simulation proof: PASS
- Focused mobile Chromium proof: PASS
- Focused desktop boot proof: PASS
- One Pixi canvas: PASS
- Console/page errors: 0
- External HTTP requests: 0

## Boundaries

No other district shape, objective, queue position, job output, control, camera, terrain, upgrade, or art asset was changed.

Canonical SFHS pack and exact verification remain unrun in this Node 22 runtime. The artifact remains an `INTAKE_REQUIRED: PIXI_NATIVE` candidate.
