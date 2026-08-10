# `@sfhs/control-feedback-pixi-v8`

PixiJS v8 presentation and event normalization for the renderer-neutral SFHS control feedback runtime.

The adapter owns Pixi `Container`, `Graphics`, `Text`, federated pointer events, and deterministic rectangular hit areas. The contract and runtime remain free of those APIs. Hosts may provide a focusable keyboard target and lifecycle window; selected, choice, toggle, and status state remain externally authoritative.

Call `update(atMs)` from the product render loop. Layer transforms retarget from their current interpolated value, so rapid input does not queue completed animations. Ripple instances use runtime IDs/timestamps and remain bounded by the preset.

`pixiV8ControlApproximations` explicitly records the flat-Graphics shadow, content-slot, and canvas accessibility limitations. Audio and haptics connect only through symbolic cue hooks.
