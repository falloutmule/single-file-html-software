# `@sfhs/control-feedback-dom`

Native DOM rendering and input normalization for SFHS control feedback.

- Momentary presets use a real `button`.
- Toggle presets use a native checkbox with switch semantics.
- Choice presets use native radio inputs with contract group/value data.
- The native control remains the hit target and focus owner; visual geometry is a separate non-interactive layer tree.
- Pointer capture, release-inside activation, cancellation, keyboard input, visible focus, disabled state, external selected/status authority, reduced motion, and bounded ripple rendering all delegate to `@sfhs/control-feedback-runtime`.
- Audio and haptics connect only through symbolic `onCue` transport hooks.

The adapter injects one small document-local stylesheet and makes no external runtime requests.
