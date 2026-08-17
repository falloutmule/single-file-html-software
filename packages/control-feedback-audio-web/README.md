# `@sfhs/control-feedback-audio-web`

Renderer-independent browser transport for SFHS symbolic control cues.

It creates one shared `AudioContext` per `Window` with `latencyHint: "interactive"`, resumes only from a trusted gesture, caches deterministic generated `AudioBuffer`s, schedules cheap one-shot sources, and supports master volume, mute, per-cue volume, deterministic pitch variance, voice limits, and explicit retrigger policy. Short imported samples are decoded once and capped at three seconds.

The seven built-in families are soft click, plastic click, heavy click, toggle on, toggle off, success, and error. No network request, DOM adapter, PixiJS API, or vibration API is owned here. Automated scheduling proof is not a physical latency claim.
