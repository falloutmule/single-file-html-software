# `@sfhs/control-feedback-presets`

Portable renderer-neutral SFHS interpretations of the 25 presets approved by Design Donor Inventory v1: 11 Uiverse Galaxy, 8 Animata, and 6 Magic UI.

The library contains normalized control data, not donor React/CSS/framework source. Every entry retains its frozen repository, commit, path, blob SHA, MIT license identity, priority, category, and normalized design recipe. The all-presets `sfhs.control-pack@0` export is deterministic and suitable for the editor, products, and notice generation.

DOM renders declared gradients directly. The initial PixiJS v8 adapter explicitly flattens a gradient to its representative middle stop while preserving control geometry and semantics; this is recorded in its approximation register.

`controlFeedbackVisualConformance` records the audited result for the 11 repaired visual recipes. Nine are `FULL`; `uv-dark-capsule-icon` is `PARTIAL` because Pixi flattens its gradient, and `uv-sun-moon-toggle` is `PARTIAL` because its donor vector path morph is represented by deterministic sun/moon glyph travel. No repaired target is `BROKEN`.
