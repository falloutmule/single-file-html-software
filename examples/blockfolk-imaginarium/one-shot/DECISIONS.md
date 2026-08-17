# Decisions

- `VERIFIED`: revised sole authority is the received 1280 × 1280 JPEG with SHA-256 `4aa0bb1fb66e3c4101a0e4aa2dad1cf0ebf6adf7a5b484453a9cddd9bb0d7911`.
- `VERIFIED`: use installed `RTXVideoSuperResolution` in exact target-dimensions mode at ULTRA quality; no prompt, sampler, denoise, diffusion, or generative repair.
- `VERIFIED`: retain authority, lossless master, workflow, and comparison under product `art/`; import only one optimized WebP from `src/assets/backgrounds/` into the runtime.
- `VERIFIED`: restore the 30 PNGs byte-identically from `examples/the-imaginarium/src/assets/blockfolk/`, retaining their existing provenance and excluding the old background and source sheets.
- `VERIFIED`: map the accepted assets only to Animals (2), People (6), Building (6), Nature (12), and Magic (4); Emoji remains native typed Unicode with no illustrated pack.
- `VERIFIED`: preserve the established BlockFolk product/storage schema and use BlockFolk-specific built-in IDs, so empty-world saves gain the catalog without migration or deletion.
- `VERIFIED`: use a 420-world-unit longest edge for restored stickers. This derives from the accepted 285-logical-pixel Imaginarium placement at its approximately 0.30 phone fit scale and retains an approximately 85–103 CSS-pixel starting extent at the Valley's normal bookmark zooms.
- `VERIFIED`: publish only the exact packed artifact at `/blockfolk-imaginarium/index.html` from the freshly fetched Pages tip; the root `index.html` remains byte-identical.
