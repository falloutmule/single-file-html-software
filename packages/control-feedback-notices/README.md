# `@sfhs/control-feedback-notices`

Deterministic third-party notice closure for the control presets actually used by a product.

The generator validates every preset, ignores `sfhs-original` provenance, deduplicates donor sources, sorts donors/presets/paths, preserves frozen commits and blob SHAs, retains Uiverse per-file author attribution, and emits both canonical JSON and readable text with the exact frozen MIT license text. Products do not receive notices for unused donors.
