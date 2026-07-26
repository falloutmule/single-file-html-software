# SFHS-012B1 - Pixi compatibility geometry core

## Goal

Implement the approved geometry-only portion of the SFHS Pixi Canvas compatibility contract through Pixi Graphics, without implementing assets, text, gradients, composition, pooling expansion, import scaffolding, or HOMEOSTASIS presentation.

## Allowed files

- `packages/pixi-canvas-compat/**`
- `examples/pixi-compat-geometry/**`
- `docs/evidence/SFHS-012B1-PIXI-GEOMETRY-CORE.md`
- `docs/evidence/sfhs-012b1/**`
- `pnpm-lock.yaml`

HOMEOSTASIS source and artifacts, Pages, SNC, remotes, publication settings, the 012A analyzer, the 012B0 contract, and the generic Pixi runtime are forbidden and unchanged.

## What was done

- Added `@sfhs/pixi-canvas-compat`, a Pixi v8 Graphics-backed, command-buffered geometry context. It creates one reusable Graphics object for its assigned Pixi layer and exposes no browser Canvas2D context.
- Implemented the verified B1 subset: `save`, `restore`, `globalAlpha`, fill/stroke style, width and cap, translate/rotate/scale/setTransform, paths, `moveTo`, `lineTo`, `quadraticCurveTo`, `arc`, `ellipse`, `fill`, `stroke`, `fillRect`, and `strokeRect`.
- Kept commands inspectable before presentation. Each command carries immutable state; present replays the normalized buffer through Pixi Graphics in order.
- Added fail-closed errors for unsupported APIs and restore-stack underflow. `drawImage`, gradients, text, blend modes, smoothing, masks, clipping, clear semantics, and pixel APIs remain absent from the B1 public surface.
- Added a minimal self-contained Pixi geometry fixture and exact-artifact Chromium test. It draws circles, a transformed quadratic stroke, and an ellipse entirely through the compatibility layer, with no game-owned frame loop.

## What was verified

- **verified:** the B1 surface is a 22-operation subset of the 012B0 contract; it does not claim B2 or B3 operations.
- **verified:** unit conformance fixtures cover state stack, style inheritance, alpha, path construction, fill/stroke, transform order, frame reset, bounded one-Graphics reuse, destruction, unsupported operations, and restore underflow.
- **verified:** the exact Chromium artifact contains one connected, non-zero-sized presentation canvas. Its context is WebGL; it does not request a `2d` context on that visible canvas.
- **verified:** Pixi internally requests Canvas2D contexts for non-presenting setup buffers. The browser assertion records those separately and does not misclassify them as a visible Canvas2D renderer.
- **verified:** the geometry fixture makes one document request and reports `graphicsAllocated: 1`, `graphicsReused: 1`.

## What failed

The first fixture build used top-level `await`, which the SFHS IIFE packer rejects. It was moved into an explicit asynchronous boot function; the final exact-artifact browser test passes.

An initial renderer assertion rejected any Pixi-internal Canvas2D request. Direct Chromium evidence showed those requests were non-visible setup buffers, not a presentation surface. The assertion was corrected to the SFHS rule: exactly one visible Pixi/WebGL presentation canvas and no visible Canvas2D world surface.

## Current exact state

- B1 geometry core: `AUTOMATED_PASS`
- B0 full contract conformance: `NOT_STARTED` (B2/B3 contract areas are intentionally unimplemented)
- B2 assets/text/gradients/composition: `NOT_STARTED`
- B3 pooling expansion/performance gates: `NOT_STARTED`
- HOMEOSTASIS Pixi presentation: `NOT_STARTED`
- Renderer migration: `MIGRATION_REQUIRED`
- Physical Samsung: `BLOCKED_ON_PHYSICAL_SAMSUNG`
- Final release: `BLOCKED`

## Remaining blockers

- B2 must add only the 012A-proven `drawImage`, gradient, text, blend, and smoothing behavior, then submit the B0 approximation measurements.
- B3 must add broader pooling/diagnostics/performance gates and complete whole-contract conformance.
- No existing HOMEOSTASIS Canvas2D presentation has been converted or reclassified by this task.

## Next actionable step

Review the B1 geometry boundary and authorize SFHS-012B2 only if the 012B0 approximation register remains accepted.

## Branch and commit

- Worktree: `C:\tmp\sfhs-012b1-geometry-core`
- Branch: `codex/sfhs-012b1-geometry-core`
- Base: `f93b151d953680c1b88cbdd9891ec0eaa1549c00`

## Commands and results

- `pnpm install --lockfile-only --offline` - PASS
- `pnpm install --frozen-lockfile --offline` - PASS
- `pnpm run typecheck` - PASS
- scoped ESLint - PASS
- geometry unit and Chromium exact-artifact fixtures - PASS

## Evidence paths

- [Geometry-core evidence](sfhs-012b1/geometry-core.json)
- [B0 contract](sfhs-012b0/compatibility-contract.json)
- [012A capability matrix](sfhs-012a/homeostasis-capabilities.json)

## Hashes

- Authoritative B0 contract: `d50338c73f22ceb2f25ddeddf87f71058bb68db7e24aa04cc4d46211f3f03894`
- B1 geometry-core evidence: `304a3874b7d5197a1aaba83b3b7220e49328a50ec37165daf9d029e64ca5b0e0`

## Verdict

- SFHS-012B1: `AUTOMATED_PASS`
- Full compatibility contract: `NOT_STARTED`
- Final release: `BLOCKED`
