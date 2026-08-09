# `@sfhs/control-feedback-contract`

Renderer-neutral data contract for tactile SFHS buttons and small controls.

This package intentionally contains no DOM, CSS, PixiJS, React, Tailwind, Motion,
audio transport, haptic transport, editor, or donor source implementation.

## Scope

- strict `sfhs.control-preset@0` data types;
- fail-closed validation with unknown-field rejection;
- frozen P0 donor provenance validation;
- eight normalized P0 fixtures;
- canonical JSON serialization through `@sfhs/contracts`;
- contract tests.

Application state remains authoritative. Presets describe presentation and
feedback only; they cannot mutate product state. Runtime signal processing,
release-inside activation, pointer ownership, cancellation, adapter mapping,
sound playback, haptics, and authoring UI are later packages/cards.

## P0 fixtures

- `uv-plastic-inset-press`
- `uv-simple-drop-press`
- `uv-diagonal-offset-press`
- `uv-basic-toggle`
- `uv-skeuo-icon-choice`
- `an-pointer-field-ripple`
- `an-status-cycle`
- `mu-multi-activation-ripple`

All donor provenance is frozen by repository, commit, path, blob SHA, and MIT
license identity. Shared preset data rejects renderer/framework source strings.
