# SFHS Control Editor

Standalone offline-first authoring and acceptance app for renderer-neutral SFHS controls.

## Capabilities

- Appearance: geometry, shape, gradient/fill, border, depth/shadow, portable text/icon content, selected/disabled/focus/status treatments.
- Motion: press travel, scale/squash, rebound timing/easing, bounded field or activation ripple, shine/glow, reduced-motion preview, optional slow-frame simulation.
- Cues: generated Web Audio families, volume, mute, pitch variance, voice limit, and best-effort haptics. Portable sample assets are intentionally deferred until the editor can embed them under the SFHS asset contract.
- State preview: idle, hover, pressed, focused, selected, disabled, loading, success, and error.
- Torture tests: rapid taps, release outside, drag-out/re-enter, pointer cancellation, concurrent pointers, keyboard activation, repeated toggle with external state authority, disable-while-pressed, focus loss, mute, reduced motion, and a slow-frame stall.
- Portable output: deterministic preset and full-pack JSON, member-selectable multi-preset load/save with topology-preserving inspector edits, used-preset notices, DOM/Pixi v8 configuration, and a playable self-contained demo HTML containing the real DOM/shared runtime plus only the selected preset and its notice closure.

The live preview mounts `@sfhs/control-feedback-dom`, which uses the shared runtime. It is not a separate mock implementation.

## Verify

```powershell
corepack.cmd pnpm@11.9.0 --filter @sfhs/example-control-feedback-editor run browser-proof
```

The proof packs twice, compares exact bytes, exercises the editor/torture matrix under HTTP and `file://`, reopens the exported demo under `file://`, blocks unexpected requests, and captures desktop plus Samsung S21 Ultra emulation screenshots. Emulator evidence is not a physical-device verdict.
