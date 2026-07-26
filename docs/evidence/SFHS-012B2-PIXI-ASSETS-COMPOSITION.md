# SFHS-012B2 - Pixi compatibility assets and composition

## Goal

Implement only the Canvas capabilities verified by SFHS-012A that are outside the B1 geometry core, without beginning HOMEOSTASIS presentation conversion.

## What was done

- Added a registry-only Pixi asset compatibility surface: `drawImage` accepts stable texture IDs only; there is no URL loader or external request path.
- Added bounded sprite and Pixi Text reuse, native `FillGradient` caching for linear/radial gradients, nearest/linear texture sampling, center-aligned `700 16px system-ui` text, and the only observed composition mode, `multiply`.
- Expanded the self-contained Pixi fixture to exercise a registered texture, smoothing, multiply, cached gradient, and text on the existing one visible Pixi/WebGL canvas.
- Left patterns, clipping, shadows, filters, pixel APIs, unobserved composite modes, and unsupported fonts fail-closed.

## What was verified

- **verified:** unit tests cover registry ownership, texture cache limits, sprite reuse, gradient cache hit, unsupported texture/font failure, and the typed public surface.
- **verified:** exact Chromium fixture renders all B2 categories with one visible WebGL canvas, zero visible Canvas2D contexts, and one document request.
- **verified:** the B0 approximation contract remains the acceptance authority. B2 creates the required Pixi mechanisms; it does not claim final Canvas/Pixi screenshot tolerance conformance because HOMEOSTASIS has not been migrated.

## Approximation status

`createLinearGradient`, `createRadialGradient`, `fillText`, `font`, and `textAlign` use the B0-defined strategies and remain `SUPPORTED_APPROXIMATION`. Their screenshot-region, geometry/alpha, glyph-bound, baseline, contrast, and anchor tolerances must be measured during the later genuine HOMEOSTASIS Pixi presentation card. No control or gameplay meaning has been changed because no game presentation was changed.

## Current exact state

- B2 assets/composition: `AUTOMATED_PASS`
- Full B0 parity conformance: `NOT_STARTED`
- B3 diagnostics/performance gates: `NOT_STARTED`
- HOMEOSTASIS Pixi presentation: `NOT_STARTED`
- Final release: `BLOCKED`

## Remaining blockers

- B3 must add sustained-run diagnostics and whole-contract fail-closed evidence.
- HOMEOSTASIS conversion must collect the B0 tolerance measurements before any renderer migration claim.

## Next actionable step

Review and authorize SFHS-012B3 only.

## Evidence

- [Machine-readable B2 evidence](sfhs-012b2/assets-composition.json)
- [B0 contract](sfhs-012b0/compatibility-contract.json)
- [012A capability matrix](sfhs-012a/homeostasis-capabilities.json)

## Verdict

`AUTOMATED_PASS` for B2 only. No release, migration, or physical-device verdict is implied.

## Hash

- B2 machine evidence: `a5ca3ecf471d5113b1d8b8e76a35e16404138894c7c05bbed7b36d03a50b4c76`
