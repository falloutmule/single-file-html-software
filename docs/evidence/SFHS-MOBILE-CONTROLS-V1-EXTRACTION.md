# SFHS Mobile Controls v1 — SNC extraction audit

**Status:** read-only donor audit complete; no SNC source was changed  
**SFHS base:** `4248c67021e930b7fb4a882f73dfd8ab87df0ee7`  
**SNC donor:** `ae0cba08b647ebff5db533f1dedff1b46f789412`  
**Primary source:** `src/js/game-06-section-2b-mobile-touch-input.js`  
**Source identity:** 65,347 bytes; Git blob `f50ef5e957a4fb7a5cf2e9b1a01bb061276b169b`

## Authority and method

The donor was read through the exact `origin/main` Git tree, not through SNC's
dirty local checkout. The audit used the primary input module, supporting HTML,
CSS, persistence, menu, update, and fixed-step sources, the P7-010B ownership
map, and the three focused donor tests named in the handoff.

This is a behavior extraction. It is not permission to copy SNC's 65 KB module,
its game state, its styling, or its product settings into SFHS.

## A. Portable as behavior

- Prefer Pointer Events when available; install Touch gameplay listeners only
  when Pointer Events are unavailable. Never run both gameplay routes.
- Give each control an independent pointer/touch owner so movement, look, and
  discrete buttons can operate concurrently.
- Consume the chronological coalesced sample list instead of the parent Pointer
  Event when the list is non-empty. Consume the parent once otherwise.
- Treat pointer capture as an optimization, not an assumption. Capture failure
  must retain tracked ownership and recover through terminal document/window
  events.
- Make pointer up, cancellation, lost capture, blur, hidden visibility, and
  pagehide cleanup idempotent and incapable of leaving held state behind.
- Normalize a virtual stick into signed axes and magnitude, apply a dead zone,
  and return to exact zero on release.
- Accumulate relative gesture input between consumer reads and drain it once at
  a consumer-controlled update boundary. Browser event cadence does not become
  simulation cadence.
- Scope `touch-action: none`, non-passive prevention, overscroll suppression,
  and selection suppression to the active control surface and owned contacts.
- Express user layout in normalized geometry, clamp it inside safe bounds, and
  recompute it against `visualViewport`, safe-area, resize, and orientation.
- Edit a draft layout, then commit or cancel atomically. Persist separately from
  product/game saves and fail soft when storage is absent, corrupt, or denied.

## B. Portable after neutralization

| SNC concept | Neutral SFHS responsibility |
|---|---|
| `INPUT_CONFIG` with MOVE/GIVE/LOOK/SPRINT/MENU actions | A declaration list whose IDs have no mechanics and whose primitives are `stick2d`, `relative1d`, `hold`, `pulse`, or `toggle`. |
| `joy`, `lookTouch`, and button flags | Immutable normalized outputs keyed by declaration ID plus read-only ownership diagnostics. |
| Pixel-to-radian look sensitivity | Finger travel divided by the actual control axis extent, followed by a dimensionless profile multiplier. Product gain is outside the package. |
| `crApplyPendingInputActions()` | `flush()`, which drains accumulated relative and pulse output only when the consumer chooses. |
| SNC options fields and UI menu | One versioned profile containing opacity, normalized stick dead zone, relative sensitivity, and portrait/landscape layouts. |
| Fixed element IDs and hand-authored control DOM | Generated DOM with stable package data attributes and customizable CSS variables/classes. |
| SNC control edit mode | Generic draft/commit/cancel dragging and resizing, with gameplay output released while editing. |
| `cannedRun.controls.v1` | A consumer-supplied storage key and optional Storage implementation. |
| Mutable diagnostic globals/probes | One immutable state snapshot; detailed profiling stays product-owned. |

The generic profile starts at schema v1, so there is no prior generic data to
migrate. Unknown versions fail soft and leave defaults active. SNC-specific
legacy tables are not a generic migration contract; an actual future v2 must
provide evidence before a migrator is added.

## C. SNC-only

- `give`, sprint bursts/costs, map, pause, menus, minimap overlap policy, runner
  name, onboarding, fullscreen UI, sound cues, saves, and menu redraw behavior.
- `STATE.PLAY`, `paused`, `player.angle`, radians, movement booleans, and all
  product state gating.
- `cannedRun.*` storage names and SNC's settings aliases/legacy lookup tables.
- SNC BUILD_ID and generated-artifact policy.
- SNC control labels, colors, sizes, portrait dashboard, HUD, and visual style.
- Raw-look cadence histories, performance probes, renderer histories, and SNC
  diagnostic adapters.
- Tests whose assertions require SNC levels, player state, menus, or renderer.

## D. Consumer adapter responsibilities

- Give each declaration ID product meaning and combine mobile output with the
  product's keyboard, mouse, or gamepad abstraction.
- Supply normal gain and convert normalized relative output into degrees,
  radians, mouse counts, or another engine-specific unit.
- Call `flush()` at the product's authoritative update boundary.
- Decide whether controls are mounted, visible, paused, or released during
  menus, scene changes, and product suspension.
- Place the DOM overlay relative to the renderer without making the shared
  package depend on that renderer.
- Choose the persistence key, default layouts, labels, product theme, analytics,
  and any diagnostics beyond the package snapshot.

## Extraction boundary

The v1 implementation will have one input runtime, one declaration model, one
normalized state/output surface, one profile schema, and one consumer boundary.
It will not add gameplay actions, renderer adapters, compatibility aliases,
parallel input paths, or speculative primitives.

## Guarded failure modes

Actively guarded: A, B, C, D, G, H, J, K, L, M, N, O, P, Q, R, S, and T from
the single-file failure-mode catalog. Game-save corruption and render mutation
are not direct module behaviors, but the lab still keeps profile storage
separate and follows INPUT -> ACTIONS -> SIMULATION -> RENDER.
