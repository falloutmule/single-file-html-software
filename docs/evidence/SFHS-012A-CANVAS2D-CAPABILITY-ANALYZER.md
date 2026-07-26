# SFHS-012A — Canvas2D capability analyzer

## Goal

Measure the exact Canvas2D behavior HOMEOSTASIS uses before any Pixi compatibility or presentation conversion is designed.

## What was done

- Added the generic `@sfhs/canvas-capability-analyzer` package.
- Implemented AST-based source analysis over HOMEOSTASIS presentation source, including direct contexts, simple aliases, object-property aliases, function parameters, canvas creation, offscreen creation, save/restore state, properties, paths, image calls, and explicit unknown-alias reporting.
- Implemented test-only browser instrumentation that records Canvas2D method/property activity, normalized argument categories, text length/hash rather than full text, scene labels, per-frame maxima, save depth, context dimensions, generated-canvas visibility, and exceptions.
- Ran the analyzer against the read-only HOMEOSTASIS 013A worktree at `C:\tmp\sfhs-homeostasis-013a\examples\homeostasis`; no HOMEOSTASIS source or artifact was modified.

## What was verified

- **verified:** 6 production source files were statically analyzed; 2 canvas-creation locations, 4 Canvas2D acquisitions, no `OffscreenCanvas`, no statically provable direct canvas-to-canvas alias, no unbalanced restore, and no unresolved context aliases were found.
- **verified:** Chromium recorded one visible 768×1708 Canvas2D world canvas and 28 generated hidden Canvas textures: 20 at 96×96, 5 at 48×48, and 3 at 6×1.
- **verified:** runtime `drawImage` source categories include `HTMLCanvasElement`, proving generated canvas textures are used by the visible world renderer.
- **verified:** all 13 required presentation states received honest coverage: title, normal Engage, and pause were executed; the remaining ten states were exercised through existing development diagnostics and marked simulated.
- **verified:** 31 production Canvas features were observed: paths, transforms, fills/strokes, drawImage, generated textures, linear/radial gradients, alpha, source-over composition, text, and image smoothing.
- **verified:** no production-path `UNKNOWN` operations and no production-path `BLOCKING_UNSUPPORTED` operations remain.
- **verified:** the HOMEOSTASIS capability verdict is `ANALYSIS_PASS`.

## What failed

The pre-existing `renderer.ts` `readCenterPixel()` test diagnostic invokes `getImageData` once. It is retained as observed `BLOCKING_UNSUPPORTED` behavior in the raw trace, but marked `productionObserved: false`: it is reached through the existing render-proof/test façade rather than production presentation. It must not be copied into the future Pixi presentation.

The first sandboxed Vitest launch could not create Vite's temporary config directory. The same focused tests were rerun with permission constrained to this isolated worktree and passed.

The historical root lint issue involving ignored HOMEOSTASIS evidence remains untouched and out of scope. This generic analyzer branch does not claim to repair it.

## Current exact state

The minimum first-conversion capability surface is now evidence-based:

- Exact-compatible candidates: state stack, alpha, source-over composition, transforms, paths, curves, fills, strokes, rects, arcs, ellipses, generated-canvas `drawImage`, texturing, and image smoothing.
- Declared-approximation candidates: linear/radial gradients and Canvas text/font alignment. Their future Pixi tolerance must be explicit and approved in `SFHS-012B0`.
- Native-Pixi priority: generated tissue/bacteria textures, pooled particles, player/Resolve field, boss, background/grid, camera trauma transform, and high-frequency world objects.
- No production clipping, patterns, shadows, filters, pixel reads/writes, conic gradients, image bitmaps, video, SVG images, Blob/data/network image sources, offscreen canvases, partial clears, or Canvas-to-canvas source aliases were statically observed. Runtime confirms only generated `HTMLCanvasElement` texture sources.

Highest-frequency operations in the final controlled run were `globalAlpha` (14,502), `save`/`restore` (13,078 each), `translate` (12,991), `rotate` (12,870), and `drawImage` (12,867). These are compatibility and pooling risks, not a justification to implement conversion in this task.

## Remaining blockers

- Pixi compatibility contract and conformance tolerances are not designed.
- Gradients and text are `SUPPORTED_APPROXIMATION`; their allowed visual/measurement differences require the next contract review.
- HOMEOSTASIS remains visibly Canvas2D above an empty Pixi surface and therefore remains `BLOCKED_ON_ADAPTER_MISMATCH`.
- Physical Samsung acceptance and final release remain blocked.

## Next actionable step

Review the capability matrix, then authorize `SFHS-012B0` only. Its contract must cover the verified minimum surface and explicitly exclude the unobserved/bocked APIs rather than building a broad Canvas emulator.

## Branch and commit

- Worktree: `C:\tmp\sfhs-012a-canvas-capability-analyzer`
- Branch: `codex/sfhs-012a-canvas-capability-analyzer`
- Base: `a011e5cac79ed5be2b87b23e4019fb228675a285`
- HOMEOSTASIS read-only analysis source: `C:\tmp\sfhs-homeostasis-013a`, `25cfe74dbf7120d97abdb8701bbe59faec4b3a5b`

## Changed files

- `packages/canvas-capability-analyzer/**`
- `pnpm-lock.yaml`
- this report and `docs/evidence/sfhs-012a/**`

No Canvas-to-Pixi renderer, compatibility context, HOMEOSTASIS presentation, Pages artifact, SNC file, remote, or publication configuration changed.

## Commands and results

- `pnpm install --lockfile-only --offline` — PASS
- `pnpm install --frozen-lockfile --offline` — PASS
- scoped ESLint — PASS
- `pnpm run typecheck` — PASS
- analyzer fixtures and browser instrumentation — PASS, 8 tests
- controlled Chromium HOMEOSTASIS analyzer — PASS, one document request only

## Evidence paths

- Static analyzer evidence: `docs/evidence/sfhs-012a/analyzer.json`
- Complete capability matrix: `docs/evidence/sfhs-012a/homeostasis-capabilities.json`
- Raw runtime aggregate and frequency summary: `docs/evidence/sfhs-012a/runtime-trace-summary.json`
- Scene coverage: `docs/evidence/sfhs-012a/scene-coverage.json`

## Hashes

- HOMEOSTASIS source analyzed: `6e1ce97ec76dea50eab58466ef71b18fb57ce627ae7da5f732bc8563b1381b65`
- In-memory analyzed artifact: 545,533 bytes, build ID `homeostasis-6e1ce97ec76d`
- Analyzer evidence: `7600c7717bf13adb6d5da887d0ed869ba877d566ad0e2dfe0f7b7f1a3959e094`
- Capability matrix: `dc703c95f7028ec2104f103013de423ae376491e9e026395116bdbb86702d39a`
- Runtime summary: `8fd105279d7288c85353c8c22709065ebe74f2a9c96a022bc447f8c5ef6d2140`
- Scene coverage: `900a55f9a94af25598785522c37b77ed4e9b7f8ed4a673c1b739f88fa9202cb7`

## Verdict

- Task implementation: `AUTOMATED_PASS`
- HOMEOSTASIS capability analysis: `ANALYSIS_PASS`
- Pixi compatibility layer: `NOT_STARTED`
- HOMEOSTASIS Pixi presentation: `NOT_STARTED`
- Physical Samsung: `BLOCKED_ON_PHYSICAL_SAMSUNG`
- Final release: `BLOCKED`
