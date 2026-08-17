# `@sfhs/control-feedback-dom`

Native DOM rendering and input normalization for SFHS control feedback.

The adapter renders renderer-neutral solid and linear/radial/conic gradient
paints as native CSS, distinguishes checkbox-style toggles from switches, and
allows a visual label distinct from the accessible name for icon controls.

- Momentary presets use a real `button`.
- Toggle presets use a native checkbox with switch semantics.
- Choice presets use native radio inputs with contract group/value data.
- The native control remains the hit target and focus owner; visual geometry is a separate non-interactive layer tree.
- Pointer capture, release-inside activation, cancellation, keyboard input, visible focus, disabled state, external selected/status authority, reduced motion, and bounded ripple rendering all delegate to `@sfhs/control-feedback-runtime`.
- Audio and haptics connect only through symbolic `onCue` transport hooks.
- Bounded layers map to anchored CSS position and dimensions while state transforms remain composable.
- Active content slots render real text/icon/status content and suppress the legacy combined label so content is never duplicated.

The adapter injects one small document-local stylesheet and makes no external runtime requests.
