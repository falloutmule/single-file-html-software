# Skyline Drop

A short, level-based, isometric city puzzle roguelike. Modern district pieces hover over terrain, cast a landing shadow, and lock onto the surface while their directional utility conduits connect below ground.

## Controls

- Move: Arrow keys or WASD
- Rotate: Q / E
- Road Remix current district: M or the Road Remix button
- Drop: Space
- Toggle surface / underground: X
- Restart level: R
- Pause: Escape
- Fullscreen: ⛶ button during play
- Touch: large movement, rotation, layer, and drop controls
- Information panel: always visible above the controls; tap the top metrics, a placed object, terrain, network source, conduit, or empty ground to change its contents

## Game structure

Complete three constrained levels by connecting homes and shops to both the road entrance and the underground utility hub. Trees and hills block surface construction; hills also contain underground bedrock. Choose a persistent upgrade between levels.

## Source architecture

The authoritative source is split across `src/` into renderer-neutral state/simulation, semantic input, viewport, audio, diagnostics, Pixi presentation, and startup. `dist/index.html` is generated output and must not be edited directly.

## Intended SFHS commands

```text
pnpm sfhs inspect --json --project .
pnpm sfhs validate --json --project .
pnpm sfhs check --json --project . --changed <path>
pnpm sfhs pack --json --project .
pnpm sfhs verify --json --project .
```

## Candidate commands used in the constrained build runtime

```text
tsc -p tsconfig.json --noEmit
tsc -p tsconfig.simulation.json
node tests/simulation.test.full2.mjs
node scripts/build-candidate.mjs
node scripts/verify-candidate.mjs
```

The candidate packer exists only because the canonical SFHS repository/CLI and its required Node 24 runtime were unavailable here. The source remains structured for bounded SFHS intake.

## Assets and licenses

The supplied pixel-art PNGs are in `public/assets/`. PixiJS v8.19.0 is MIT licensed; its license is included at `vendor/PIXI-LICENSE.txt`.

## Current focused repair

Main Street is now a straight four-cell district containing three connected road cells and one two-job shop. Incoming road cells may reuse existing road cells; road-on-road placements merge shared ownership while all non-road surface overlap remains blocked. Queue positions, objectives, and job output are unchanged. See `MAIN-STREET-I4-ROAD-MERGE-REPAIR.md`.

Road Remix remains available for Row Homes and Green Strip through their authored connected-road plans. See `ROAD-REMIX-REPAIR.md`.

## Utility overlap

Underground conduit may overlap existing conduit. Overlapping directional masks
merge into a shared junction while any existing surface building is preserved.
Surface districts still cannot overlap other surface districts.
