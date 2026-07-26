# SFHS-002C - Pixi Action Input Boundary

**Date:** 2026-07-20  
**Status:** PASS (source/input-boundary scope)  
**Base commit:** `8164aed`

## WHAT WAS DONE

- Added an immutable action snapshot between browser events and simulation.
- Mapped WASD, arrow keys, four DOM direction controls, and canvas pointer activation into named actions.
- Added independent source ownership, concurrent pointer support, pointer capture, `pointercancel`/lost-capture cleanup, blur/visibility cleanup, and one-shot activation consumption.
- Changed the fixed-step loop to sample actions once per simulation step. Event handlers do not mutate simulation state.
- Added a movable logical player and activatable target to prove the action-to-simulation-to-render path.
- Added `touch-action: none` to the game surface and controls.
- Preserved the pre-card authored HTML at `reports/backups/index.before-sfhs-002c.html`.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run adapters/pixi-v8/src/index.test.ts examples/pixi-minimal/src/fixture.test.ts examples/pixi-minimal/src/input.test.ts examples/pixi-minimal/src/runtime.test.ts
pnpm check
```

- Focused gate: 4 files and 13 tests passed.
- Full gate: ESLint, strict TypeScript, and 12 test files with 36 tests passed.
- Tests cover independent held sources, opposing directions, activation draining, coordinate clamping, concurrent movement plus activation, capture, cancellation, disposal, per-step sampling, and non-repeated one-shot activation.

## WHAT FAILED

The first focused run found one stale expected initial-state object after player and activation fields were added. The expected immutable state was updated; no runtime behavior changed. The corrected focused and full gates pass.

No browser, packed artifact, audio, resize, safe-area, or physical-device verification was attempted.

## CURRENT EXACT STATE

```text
input: keyboard + DOM direction pointer controls + canvas pointer activation
boundary: browser events -> action store -> immutable per-step snapshots -> simulation
multi-pointer: independent pointer IDs with cancellation cleanup
simulation: serializable player coordinates and activation count
render: frozen presentation values only
generated artifact: none
browser verification: not yet implemented
```

## REMAINING BLOCKERS

- No `visualViewport`, safe-area, portrait/landscape layout, or visibility-driven pause/resume behavior exists yet.
- Assets, audio unlock, DOM diagnostics, builder, packer, verifier, and browser runner remain unimplemented.
- Physical Samsung Galaxy S21 Ultra acceptance is deferred until the exact-artifact browser runner exists.

## NEXT ACTIONABLE STEP

Assign `SFHS-002D - Mobile viewport and lifecycle` as the next bounded card.

## EVIDENCE

Failure-mode audit:

| Mode | Guard in this card |
|---|---|
| C - inline handler/eval creep | All browser input uses `addEventListener`; the authored-source guard remains green. |
| D - logic entropy | Input ownership lives in one module and exports data-only snapshots. |
| E - render mutates simulation | Input reaches simulation before presentation; rendering still receives frozen values only. |
| H - stuck mobile input | Pointer up, cancel, lost capture, blur, visibility, stop, clear, and dispose paths release input. |
| I - multi-touch conflict | Sources are keyed independently, allowing movement and activation from different pointers. |
| Q - proofless success | Focused and full automated gates are recorded above. |
| T - AI overreach | Viewport, assets, audio, build, browser, plugin, Hermes, SNC, remote, and release scope were not added. |

## GITHUB PAGES URL

Not applicable. No remote, deployment, or generated release artifact exists.

## VERDICT

PASS
