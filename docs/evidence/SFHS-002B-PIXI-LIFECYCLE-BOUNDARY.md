# SFHS-002B - Pixi Simulation, Render, and Lifecycle Boundary

**Date:** 2026-07-20  
**Status:** PASS (source/runtime-boundary scope)  
**Autonomy used:** bounded local fixture, adapter, test, and documentation changes

## WHAT WAS DONE

- Added immutable, serializable fixture state with a pure simulation transition. Simulation state contains only phase, visual revision, and tick count; it contains no Pixi object.
- Added a pure, frozen state-to-presentation projection. The renderer receives presentation values only and has no state reference to mutate.
- Added an SFHS-owned 60 Hz fixed-step runtime with a 250 ms maximum frame delta and a one-microsecond tolerance for browser timestamp floating noise.
- Added explicit lifecycle ownership for start, stop, scheduled-frame cancellation, idempotent disposal, and Pixi resource destruction.
- Changed the Pixi adapter to run with `autoStart: false` and `sharedTicker: false`; it renders only when the SFHS lifecycle calls its renderer interface.
- Wired the authored fixture to construct the renderer once, start the lifecycle on user action, and dispose it on `pagehide`.

## WHAT WAS VERIFIED

```text
pnpm.cmd exec vitest run adapters/pixi-v8/src/index.test.ts examples/pixi-minimal/src/fixture.test.ts examples/pixi-minimal/src/runtime.test.ts
pnpm.cmd check
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

- Focused adapter/fixture/runtime gate: 3 test files and 8 tests passed.
- The fixed-step test proves one 60 Hz tick, clamps a 10-second frame delta to 15 simulation steps, and leaves the prior state unchanged.
- The lifecycle test uses a fake frame scheduler and fake renderer to prove start scheduling, stop cancellation, idempotent disposal, renderer destruction, and frozen presentation-only render inputs.
- Full workspace gate: ESLint, strict TypeScript, and all 11 workspace test files passed (31 tests total).
- Frozen offline install passed across all 11 workspace packages.

## WHAT FAILED

The first focused run exposed timestamp floating-point drift: subtracting two nominal 60 Hz browser timestamps can land just below the exact step duration. The runtime now applies an explicit 0.000001 ms tolerance, and the regression test passes.

No browser, artifact, or release verification was attempted.

## CURRENT EXACT STATE

```text
simulation: immutable, serializable, Pixi-free state
loop: SFHS-owned fixed 60 Hz step; 250 ms maximum input delta
render boundary: frozen presentation values only
Pixi ticker: disabled for fixture ownership (autoStart false; sharedTicker false)
lifecycle: start, stop, frame cancellation, pagehide disposal
generated artifact: none
browser verification: not yet implemented
```

## REMAINING BLOCKERS

- No keyboard, pointer, action-map, pause/resume, audio, resize, safe-area, asset, or DOM HUD behavior is implemented yet.
- No builder, one-file packer, static artifact scanner, or browser runner exists.
- This card therefore makes no claim that the Pixi scene booted in a real browser or that lifecycle behavior was exercised against browser page events.

## NEXT ACTIONABLE STEP

Assign `SFHS-002C - Pixi action input boundary` as one bounded card. It should map keyboard and pointer events to explicit actions without allowing DOM/Pixi event handlers to mutate simulation state directly.

## EVIDENCE

Failure-mode audit:

| Mode | Guard in this card |
|---|---|
| B - external dependency leak | No URL, asset, or dependency change; existing static source scan remains green. |
| C - inline handler/eval creep | Existing event-listener-only source pattern and static checks remain intact. |
| D - logic entropy | One new fixture runtime module isolates fixed-step/lifecycle ownership. |
| E - render mutates simulation | Simulation is immutable/Pixi-free; renderer receives only a frozen presentation object. |
| Q - proofless success | Fake-scheduler/renderer tests, focused gate, complete workspace gate, and frozen install. |
| T - AI overreach | No input, viewport, assets, browser runner, builder, packer, plugin, Hermes, or SNC scope was added. |

Explicitly N/A this card: save schema, harness state, mobile controls, multi-touch, custom controls, menu routing, browser layout, screenshots, CI, and deployment.

## GITHUB PAGES URL

Not applicable. No remote, deployment, or generated release artifact exists.

## Scope held

- No SNC source, names, assets, runtime behavior, or tests were read or changed.
- No external runtime URL, CDN, WebGPU path, Canvas fallback path, browser runner, builder, packer, verifier, Codex plugin, Hermes adapter, marketplace, remote, or release action was added.
- No commit, push, pull request, release, or plugin installation occurred.
