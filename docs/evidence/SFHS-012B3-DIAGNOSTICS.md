# SFHS-012B3 - Compatibility diagnostics and fail-closed behavior

## Goal

Make the completed Pixi compatibility surface measurable and fail-closed without extending its rendering capability or migrating HOMEOSTASIS.

## What was done

- Added a diagnostics collector for actual geometry command buffers plus B1/B2 allocation and cache metrics.
- Added sustained-frame evidence for bounded Graphics, sprite, and text counts.
- Added source/scene/operation attribution for an unsupported operation. It throws `BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES` immediately; it cannot merely log and continue.
- Connected the collector to the exact-artifact Pixi fixture. The fixture reports 19 actual geometry commands, allocation/reuse metrics, and one active compatibility layer.

## What was verified

- **verified:** 20 sustained fixture frames retain one Graphics, two sprites, and one Text object; no unbounded object growth occurs.
- **verified:** diagnostics include every required B3 metric. Mask and RenderTexture counts are honestly zero because B2 did not authorize those capabilities.
- **verified:** `clip` blocks with exact operation, source, and scene attribution.
- **verified:** the real fixture still has one visible Pixi/WebGL canvas and no visible Canvas2D surface.
- **not applicable:** reduced-effects configuration and simulation equality; the generic compatibility fixture owns no game simulation or effects setting.

## Current exact state

- B3: `AUTOMATED_PASS`
- Compatibility mechanism: implemented through B1-B3
- HOMEOSTASIS Pixi presentation: `NOT_STARTED`
- Final release: `BLOCKED`

## Remaining blockers

- SFHS-012C import scaffold generation and the separate HOMEOSTASIS conversion map/presentation cards remain.
- B0 approximation tolerances remain unmeasured against a genuine HOMEOSTASIS Pixi presentation.

## Next actionable step

Authorize SFHS-012C only, or separately authorize the HOMEOSTASIS conversion-map card.

## Evidence

- [Machine-readable B3 evidence](sfhs-012b3/diagnostics.json)

## Verdict

`AUTOMATED_PASS` for SFHS-012B3 only. No renderer-migration, release, or physical-device pass is implied.
