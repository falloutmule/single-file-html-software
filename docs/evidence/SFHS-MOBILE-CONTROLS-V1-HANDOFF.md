# SFHS Mobile Controls v1 — frozen local handoff

**Status:** ACCEPTED — automated and physical Samsung acceptance passed
**SFHS base:** `4248c67021e930b7fb4a882f73dfd8ab87df0ee7`  
**Local branch:** `feature/sfhs-mobile-controls-v1`  
**Remote action:** none

## Outcome

SFHS now has one renderer-neutral DOM input package, one declarative control
model, one normalized output surface, one versioned profile, and one explicit
consumer flush boundary. A neutral single-file Mobile Controls Lab exercises
the package without Pixi, Canvas, Doom, SNC state, or any game mechanic.

Final acceptance recorded on 2026-08-07:

- Automated verification: **PASS**
- Exact single-file artifact: **PASS**
- Samsung emulation: **PASS**
- Physical Samsung Chrome: **PASS**
- Mobile Controls v1 overall acceptance: **PASS**
- Frozen implementation: **ACCEPTED**

The donor extraction is recorded separately in
`SFHS-MOBILE-CONTROLS-V1-EXTRACTION.md`. The implementation uses SNC's accepted
behavioral seams without copying the donor's 65 KB game module.

## Donor identity

- Repository: `falloutmule/solidarity-not-charity-can-run`
- Commit read: `ae0cba08b647ebff5db533f1dedff1b46f789412`
- Primary source: `src/js/game-06-section-2b-mobile-touch-input.js`
- Primary source identity: 65,347 bytes, Git blob
  `f50ef5e957a4fb7a5cf2e9b1a01bb061276b169b`
- Supporting sources and focused tests: exactly those listed in the task
  handoff, read through the commit tree rather than the dirty SNC checkout.

## Extraction map

### Portable as behavior

Pointer-first capability selection; exclusive Touch fallback; independent
contact ownership; chronological exact-once coalesced samples; capture as a
recoverable optimization; terminal-event and lifecycle cleanup; normalized
stick math; accumulated relative input; consumer-owned cadence; active-surface
scroll suppression; safe-area/visualViewport layout; normalized geometry;
draft edit/commit/cancel; and fail-soft independent persistence.

### Portable after neutralization

SNC's action table became declarations of `stick2d`, `relative1d`, `hold`,
`pulse`, and `toggle`. SNC's pixel-to-radian look path became control-extent
normalization plus a dimensionless multiplier. Its fixed-step consumption seam
became `flush()`. Options, layouts, editor state, and diagnostics became one
generic profile and immutable snapshot.

### SNC-only

Give/sprint/menu behavior, player and pause state, radians, cannedRun storage,
legacy SNC settings, HUD/minimap policy, product styling, BUILD_ID conventions,
performance probes, renderer history, and game-aware tests were excluded.

### Adapter-only

Product meanings, product gain/units, keyboard/gamepad merging, the authoritative
update call to `flush()`, mount/visibility policy, renderer overlay placement,
theme, persistence key, and product diagnostics stay outside the package.

## Architecture

1. `@sfhs/mobile-controls` owns browser events, contact ownership, normalized
   state, layout/editing, profiles, and lifecycle cleanup.
2. A consumer supplies renderer-neutral declarations and DOM styling.
3. Event handlers accumulate continuous and discrete output. Subscriptions are
   observational and never define simulation cadence.
4. `read()` observes without draining. `flush()` returns one immutable snapshot
   and then drains only `relative1d` delta and `pulse` count.
5. The consumer adapter maps IDs and normalized values into its own mechanics.

`dom-interactive` is a small SFHS project adapter identity for ordinary DOM
applications whose required renderer is `none`. It does not wrap the mobile
controls runtime and does not introduce a second input path.

## Public API

The package exports:

- `createMobileControls(options)`
- controller lifecycle: `mount(root)`, `destroy()`, `releaseAll(reason?)`
- output: `read()`, `flush()`, `subscribe(listener)`
- live settings/layout: `updateConfig()`, `updateLayout()`
- editing: `beginEdit()`, `commitEdit()`, `cancelEdit()`
- profiles: `exportProfile()`, `importProfile()`, `resetProfile()`
- `defaultMobileControlsSettings`, `serializeProfile`, and the public TypeScript
  declaration/output/profile types.

The supported primitive outputs are:

- `stick2d`: signed `x`, `y`, normalized `magnitude`, and `active`
- `relative1d`: `rawNormalizedDelta`, sensitivity-applied `delta`, and `active`
- `hold`: `pressed`
- `pulse`: `fired` and lossless pre-flush `count`
- `toggle`: `state`

For `relative1d`, one full gesture across the actual declared control width (or
height for axis `y`) is approximately `1.0`. The package contains no angle,
mouse-count, or engine-specific gain.

## Profile schema

Only `sfhs.mobile-controls-profile@1` is accepted:

```json
{
  "schema": "sfhs.mobile-controls-profile@1",
  "settings": {
    "opacity": 0.6,
    "stickDeadZone": 0.08,
    "relativeSensitivity": 1
  },
  "layouts": {
    "portrait": {
      "move": { "x": 0.04, "y": 0.72, "width": 0.3, "height": 0.23 }
    },
    "landscape": {
      "move": { "x": 0.03, "y": 0.57, "width": 0.23, "height": 0.36 }
    }
  }
}
```

Ranges are opacity `0.1..1`, stick dead zone `0..0.5`, and relative sensitivity
`0.25..4`. Every declared control must have a bounded normalized rectangle in
both orientations. Unknown versions/controls and malformed profiles are
rejected atomically. Storage absence, denial, corrupt JSON, and failed writes
leave the runtime usable with defaults. Mirroring is a profile transformation,
not hardcoded mechanics.

## Files changed

- `packages/mobile-controls/`: package, runtime, types, profile validation,
  documentation, and focused unit tests.
- `adapters/dom-interactive/`: renderer-none SFHS adapter descriptor and test.
- `examples/mobile-controls-lab/`: canonical source, styles, manifest, package,
  exact-artifact browser proof, and generated `dist/index.html`.
- `packages/contracts/`: `dom-interactive` / renderer `none` schema, types,
  validation, and tests.
- `packages/browser-runner/`: renderer-neutral desktop and Samsung-emulation
  exact-artifact scenarios.
- `packages/cli/`: release scenario dispatch and proportional path selection.
- `docs/adr/0011-dom-interactive-adapter.md`: adapter boundary decision.
- `docs/evidence/SFHS-MOBILE-CONTROLS-V1-EXTRACTION.md`: donor extraction map.
- `eslint.config.mjs`, `pnpm-lock.yaml`: lab harness globals and workspace
  importers.

## Automated evidence

All commands ran from the isolated SFHS worktree.

| Gate | Result |
|---|---|
| Focused Vitest lane | PASS — 7 files; 35 passed, 2 skipped |
| Proportional `sfhs check` for lab source | PASS — lint, typecheck, dom-interactive, runner |
| `pnpm check` | PASS — 43 files; 270 passed, 2 skipped; one-shot validation passed |
| `pnpm determinism` | PASS — two 574,268-byte Pixi baseline artifacts, identical SHA-256 |
| Existing `pnpm browser-smoke` | PASS — Chromium 149, no findings |
| Existing `pnpm browser-scenarios` | PASS — all 9 scenarios |
| Lab inspect / validate / pack / verify | PASS — no findings |
| Lab exact-artifact proof | PASS — deterministic double pack and all focused browser assertions |
| Visual screenshot review | PASS — portrait and landscape controls contained and readable |
| Physical Samsung Chrome | PASS — user-reported real-device acceptance on 2026-08-07 |

The lab proof covers capability route exclusivity; Touch fallback; normalized
MOVE/dead-zone/release; fractional, coalesced, full-width normalized LOOK;
MOVE+LOOK+hold concurrency; lossless pulses; pointerup/cancel/lost-capture;
blur/hidden/pagehide cleanup; touch-action/no-scroll; edit drag/resize/cancel;
profile mirror/reload/export/import/reset/corrupt-storage; orientation bounds;
file protocol; no external requests; and the public self-check.

## Neutral lab artifact

- Path: `examples/mobile-controls-lab/dist/index.html`
- Bytes: `31,218`
- SHA-256: `d12ed344823610cc636cd01561629443b7b434f8d97b6cff35d39d39457b1e33`
- BUILD_ID: `mobile-controls-lab-9a565838dc8e`
- Browser result: PASS in Chromium 149 for desktop, Samsung S21 Ultra portrait
  emulation, Samsung S21 Ultra landscape emulation, exact HTTP bytes, and
  `file://` smoke.
- Lab calibration: the consumer maps normalized LOOK `1.0` to 180 degrees; the
  package does not.

## Physical Samsung status

**PASS.** On 2026-08-07 the user reported that the real-device result completed
the missing physical gate and accepted Mobile Controls v1. This verdict applies
to the frozen exact artifact identified above and upgrades the implementation
from automated/emulated proof to accepted Samsung Chrome use. The supplied
verdict is recorded in `SFHS-MOBILE-CONTROLS-V1-SAMSUNG-ACCEPTANCE.md`.

## Failures encountered

No product failure remains in automated verification. During verification:

- sandboxed dependency installation was denied by the network policy and then
  completed with explicit elevated approval;
- elevated determinism initially hit Windows Git ownership protection and then
  passed with a command-scoped safe-directory setting (no global config edit);
- the browser proof's two-pulse assertion raced the lab's legal fixed-step
  drain; the proof now emits both taps in one browser task and reliably tests
  the intended pre-flush contract;
- the lab package lacked forwarding scripts required by the CLI's project-root
  proportional executor; scoped forwarding scripts were added and the lane
  passed.

## Known limitations

- Physical acceptance covers the reported Samsung Chrome device; it is not a
  claim of certification across every Android browser or hardware class.
- v1 has no generic legacy-profile migration because no earlier generic schema
  exists. Unknown schemas fail soft.
- Safe-area CSS values depend on browser support; normalized clamping and
  visualViewport sizing remain the fallback.
- The package does not merge keyboard, mouse, or gamepad input and deliberately
  does not decide product pause/menu policy.
- Editing is rectangle drag/resize only; there is no speculative snapping,
  grouping, or layout solver.

## Future Doom adapter recipe (not implemented)

1. Declare generic IDs such as `move`, `look`, `primary`, `interact`, and
   `modifier`; do not expose SDL or Doom event names to the package.
2. Mount the controller in Doom's DOM overlay and call `releaseAll()` on Doom's
   menu/pause/visibility transitions.
3. At Doom's authoritative fixed update, call `flush()` once. Map move axes to
   forward/strafe, hold/pulse states to the existing product input abstraction,
   and `look.delta * configuredNormalGain` to the existing yaw bridge.
4. If normal gain is 180 degrees per pad width, configure that only in the Doom
   adapter. Keep engine events, key mappings, relative mouse mode, command-line
   flags, assets, and weapon semantics downstream.

## Future generic Pixi recipe (not implemented)

1. Put a DOM control surface beside/over the Pixi canvas and declare generic
   primitive IDs.
2. Let CSS position the surface; do not pass the Pixi Application or renderer
   into `@sfhs/mobile-controls`.
3. In the game's fixed simulation update, call `flush()` once and map normalized
   outputs into the game's existing input/actions layer.
4. Keep camera scale, world units, pause/scene rules, and keyboard/gamepad merge
   in the game adapter. Pixi continues to render only game state.

## Next action

Return to the existing SFHS Doom product thread and plan the downstream adapter
against this accepted frozen module. Keep Doom integration, engine events, and
product gain outside the shared package.
