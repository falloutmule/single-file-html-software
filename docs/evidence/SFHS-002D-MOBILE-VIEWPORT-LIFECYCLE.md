# SFHS-002D - Mobile Viewport and Lifecycle

**Date:** 2026-07-20  
**Status:** PASS (source/mobile-boundary scope)  
**Base commit:** `bbbc33d`

## WHAT WAS DONE

- Added a pure fixed-contain viewport model for the 960x540 logical scene with adaptive portrait/landscape classification and a device-pixel-ratio cap of 2.
- Added a controller that prefers `visualViewport`, falls back to window dimensions, observes resize/orientation/visual scrolling, updates CSS variables, and disposes its listeners.
- Added explicit Pixi viewport application without changing logical simulation coordinates.
- Added `viewport-fit=cover`, `100dvh`/visual-viewport sizing, CSS safe-area padding, a contained 16:9 game surface, scroll containment, and a compact landscape layout.
- Added visibility ownership that stops the fixed-step loop while hidden, clears input through the existing lifecycle boundary, and resumes without a catch-up timestamp.
- Preserved the pre-card authored HTML at `reports/backups/index.before-sfhs-002d.html`.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run adapters/pixi-v8/src/index.test.ts examples/pixi-minimal/src/fixture.test.ts examples/pixi-minimal/src/input.test.ts examples/pixi-minimal/src/runtime.test.ts examples/pixi-minimal/src/viewport.test.ts
pnpm check
```

- Focused gate: 5 files and 16 tests passed after the correction below.
- Full gate: ESLint, strict TypeScript, and 13 test files with 39 tests passed.
- Viewport tests cover Galaxy-class 384x854 portrait and 854x384 landscape dimensions, fixed containment, DPR capping, visual viewport preference, CSS-state updates, and listener disposal.
- Lifecycle tests prove hidden pause, visible resume, frame cancellation, and no hidden-time catch-up step.

## WHAT FAILED

The first focused run compared a repeating floating-point containment value exactly. The assertion was corrected to use numerical tolerance; runtime calculations were unchanged. The full gate passes.

No real browser, packed artifact, screenshot, safe-area measurement, or physical-device test was attempted.

## CURRENT EXACT STATE

```text
viewport: visualViewport-first, fixed-contain 960x540, adaptive orientation
DPR: capped at 2 and applied explicitly to the Pixi renderer
safe areas: CSS env() bands with viewport-fit=cover
lifecycle: visibility stop/resume with timestamp reset and action clearing
layout: portrait flow plus compact landscape grid
generated artifact: none
browser verification: not yet implemented
```

## REMAINING BLOCKERS

- Assets, atlas loading, audio unlock, DOM diagnostics, and `window.CR` self-check are not implemented.
- Layout is mathematically and statically covered but not browser-rendered or measured for overlap yet.
- Galaxy S21 Ultra physical acceptance remains deferred until the exact-artifact browser runner exists.

## NEXT ACTIONABLE STEP

Assign `SFHS-002E - Assets, audio, HUD, and diagnostics` as the next bounded card.

## EVIDENCE

Failure-mode audit:

| Mode | Guard in this card |
|---|---|
| F - viewport/layout drift | Pure portrait/landscape containment tests plus explicit CSS orientation state. |
| H - stuck mobile input | Hiding the document routes through lifecycle stop and action clearing. |
| J - hidden-tab catch-up | Resume resets the prior frame timestamp before scheduling new simulation work. |
| K - unsafe phone bands | `viewport-fit=cover` and all four `env(safe-area-inset-*)` bands are applied. |
| Q - proofless success | Focused and full source-level gates are recorded; browser claims remain explicitly deferred. |
| T - AI overreach | Assets, audio, build, browser, plugin, Hermes, SNC, remote, and release scope were not added. |

## GITHUB PAGES URL

Not applicable. No remote, deployment, or generated release artifact exists.

## VERDICT

PASS
