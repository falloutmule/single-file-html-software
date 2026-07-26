# SFHS-002E - Assets, Audio, HUD, and Diagnostics

**Date:** 2026-07-20  
**Status:** PASS (authored-source vertical-slice scope)  
**Base commit:** `d40445e`

## WHAT WAS DONE

- Added deterministic local PNG atlas and WAV generation plus checked-in atlas JSON, target SVG, and asset manifest entries.
- Changed the Pixi adapter to load the local atlas and SVG, parse two sprite frames, and render asset-backed player/target sprites.
- Added a Web Audio controller that creates/resumes its context only from the Start interaction, loads and decodes the local WAV, reports honest failure, and disposes cleanly.
- Added a throttled DOM HUD for phase, ticks, player position, activations, audio status, and orientation.
- Added the sole runtime global, frozen `window.CR`, with `getSnapshot()` and state-isolated `runFullSelfCheck()`.
- Preserved the pre-card authored HTML at `reports/backups/index.before-sfhs-002e.html`.

## WHAT WAS VERIFIED

```text
node examples/pixi-minimal/tools/generate-fixture-assets.mjs
pnpm exec vitest run adapters/pixi-v8/src/index.test.ts examples/pixi-minimal/src/audio.test.ts examples/pixi-minimal/src/diagnostics.test.ts examples/pixi-minimal/src/fixture.test.ts examples/pixi-minimal/src/input.test.ts examples/pixi-minimal/src/runtime.test.ts examples/pixi-minimal/src/viewport.test.ts
pnpm check
```

- Repeated asset generation produced identical bytes.
- `fixture-atlas.png`: 208 bytes, SHA-256 `1d4e88985e7923105e846e4d74c97306d6f4927678b8f4d5bbb29c0432db70a6`.
- `audio-unlock.wav`: 5,336 bytes, SHA-256 `e84a9693abfa267495c64324a90bc206808c7564137909893788b9ec170e0990`.
- Focused gate: 7 files and 21 tests passed.
- Full gate: ESLint, strict TypeScript, and 15 test files with 44 tests passed.
- Tests cover asset declarations/signatures, audio unlock/ready/failure/disposal, frozen diagnostics, self-check isolation, and honest audio failure classification.
- The generated PNG was visually inspected and contains the intended two-frame marker atlas.

## WHAT FAILED

The first full gate found one `prefer-const` issue and a missing explicit Node `Buffer` import in the deterministic generator. Both static issues were corrected. The focused and full gates pass.

No source was served in a browser and no packed artifact, screenshot, external-request audit, or physical-device claim was made.

## CURRENT EXACT STATE

```text
Pixi fixture: complete authored-source vertical slice
assets: local PNG atlas + JSON + SVG + WAV
audio: explicit user-interaction unlock with honest status
HUD: DOM diagnostics with throttled updates
harness API: frozen window.CR only
self-check: serializable state, frozen state, logical bounds, viewport, audio, isolation
generated release artifact: none
browser verification: not yet implemented
```

## REMAINING BLOCKERS

- TypeScript, CSS, Pixi, JSON, SVG, PNG, and WAV are still split authored sources.
- No builder, one-file packer, static scanner, artifact descriptor, or exact-artifact browser runner exists.
- Browser asset loading and audio behavior remain unproven until the packed artifact is served and tested.

## NEXT ACTIONABLE STEP

Assign `SFHS-003A - Deterministic builder` as the next bounded card.

## EVIDENCE

Failure-mode audit:

| Mode | Guard in this card |
|---|---|
| B - external dependency leak | All declared assets are local; the manifest contains no runtime URL. |
| C - inline handler/eval creep | Existing authored-source guard includes audio and diagnostics modules. |
| E - render mutates simulation | Asset sprites receive frozen presentation values only. |
| L - autoplay/audio failure | Audio context creation/resume begins only in the Start interaction and reports failure. |
| P - harness pollution | `runFullSelfCheck()` compares pre/post state and exposes immutable copies. |
| Q - proofless success | Asset hashes, focused tests, full tests, and visual atlas inspection are recorded. |
| T - AI overreach | Build, browser, plugin, Hermes, SNC, remote, and release scope were not added. |

## GITHUB PAGES URL

Not applicable. No remote, deployment, or generated release artifact exists.

## VERDICT

PASS
