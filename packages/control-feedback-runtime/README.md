# `@sfhs/control-feedback-runtime`

Renderer-neutral deterministic interaction and presentation state for SFHS control presets.

Adapters normalize pointer and keyboard input into timestamped runtime signals. The runtime owns only transient contact feedback. Toggle, choice, selected, and status values remain authoritative in the host application and enter through `model-set` signals.

## Guarantees

- One contact owner at a time; unrelated pointers cannot steal or end ownership.
- Release inside emits exactly one activation proposal. Release outside and cancellation emit none.
- Each state change retargets from the adapter's current presentation; no completed-animation queue is represented.
- Effect instances are deterministic, monotonic, expiring, and capped by the preset.
- Reduced motion is an explicit deterministic path.
- Audio and haptic behavior is represented only by symbolic cue events.
- No DOM, PixiJS, Web Audio, vibration, asset, or hit-testing API appears in the package.

Logical timestamps are supplied by the adapter. Signals with decreasing or non-finite timestamps fail closed.
