# `@sfhs/control-feedback-contract`

Renderer-neutral data contract for tactile SFHS buttons and small controls.

This package intentionally contains no DOM, CSS, PixiJS, React, Tailwind, Motion,
audio transport, haptic transport, editor, or donor source implementation.

## Scope

- strict `sfhs.control-preset@0` data types;
- strict `sfhs.control-pack@0` portable pack data;
- fail-closed validation with unknown-field rejection;
- frozen provenance validation for all 25 vetted donor presets;
- explicit `sfhs-original` provenance for editor-authored controls;
- renderer-neutral solid and linear/radial/conic gradient paints;
- eight normalized P0 fixtures;
- canonical JSON serialization through `@sfhs/contracts`;
- contract tests.

Application state remains authoritative. Presets describe presentation and
feedback only; they cannot mutate product state. Runtime signal processing,
release-inside activation, pointer ownership, cancellation, adapter mapping,
sound playback, haptics, and authoring UI remain separate packages.

## P0 fixtures

- `uv-plastic-inset-press`
- `uv-simple-drop-press`
- `uv-diagonal-offset-press`
- `uv-basic-toggle`
- `uv-skeuo-icon-choice`
- `an-pointer-field-ripple`
- `an-status-cycle`
- `mu-multi-activation-ripple`

The P0 fixtures remain stable compatibility exports. The complete inventory is
published by `@sfhs/control-feedback-presets`. All donor provenance is frozen by
repository, commit, path, blob SHA, and MIT license identity. Shared preset data
rejects renderer/framework source strings. `@sfhs/control-feedback-notices`
derives deterministic used-preset attribution closure.
