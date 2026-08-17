# Make a Puzzle v1 Report

Status: EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## Product result

The Imaginarium now turns either a saved sticker-book creation or a device photo into a private, offline puzzle. The child can fit, crop, and zoom a fixed 3:4 frame, choose Easy (2x2), Fun (3x3), or Tricky (4x4), optionally start Race, drag pieces over their matching cells, press the reusable Snap button to lock all correctly positioned pieces, ask for a temporary picture hint, shuffle the same picture, resume after reload, replay, or start another puzzle.

The canonical puzzle board is 600x800. Rounded grid boundaries cover every source pixel exactly, including the non-divisible 3x3 case. A puzzle stores its normalized source image, shuffled order, loose-piece positions, locked pieces, completion state, and layout aspect in the product-local IndexedDB database. No image or puzzle data is uploaded.

## Verification

- Focused source scenarios and static offline audit: PASS.
- Repository lint and TypeScript check: PASS.
- Repository suite: 46 files PASS; 315 tests PASS; 2 intentional skips.
- Easy, Fun, and Tricky model coverage: PASS (4, 9, and 16 unique pieces with exact board coverage).
- Wrong-slot rejection, correct placement, no duplicate placement, completion, restart, hint timing, and reload persistence: PASS in phone-sized Chromium.
- Gallery-to-puzzle and existing gallery-to-editor regression smoke: PASS.
- Portrait 390x844: PASS; all loose pieces remain within the viewport.
- Landscape 844x390: PASS after reflow repair; Tricky bounds were left 245, right 825, top 74, bottom 383 with body height 390.
- Console warnings/errors during final workflow: none.
- Runtime dependencies: none; static audit confirms the single-file offline contract.

## Evidence limits

The in-app browser security policy declined local-file chooser injection, so the Photo button and decoder/normalizer implementation are present but an actual user-selected device file was not accepted by that automation surface. The saved-creation route exercised the same framing, normalization, storage, grid, and play pipeline.

The latest exact-artifact Chromium regression invokes the same release-position product path on rendered pieces and activates the native Snap control. It proves that release never locks, empty and repeated presses remain available, one press locks every qualifying piece, wrong-cell pieces remain loose, keyboard activation works, obsolete one-use state is removed without losing position, and completion occurs once. Pointer capture, cancellation, and cleanup remain covered by source integration and the shared SFHS input tests. No new physical Samsung verdict is claimed; the user previously waived the unavailable Windows-link session in favor of GitHub Pages delivery.

## Canonical artifact

- Build ID: `the-imaginarium-abb5ce5e503d`
- Bytes: `639570`
- SHA-256: `53ba88e5f3e54c728efa220bca6dbf3f910a62377a8c8f376e8a2f81c6ab8c6b`
- Exact verification: PASS
- Local repeat pack: byte-identical PASS
- Isolated determinism helper: BLOCKED by the restricted network while trying to repopulate a clean pnpm store; this does not invalidate the successful local repeat-build comparison.
- GitHub Pages commit: `57850678d3cfe3f44684000a704a26c0d6d069df`
- Live URL: `https://falloutmule.github.io/single-file-html-software/`
- Live byte/SHA verification: PASS; the public response is exactly 639570 bytes with the canonical SHA-256.
- Live phone-sized boot and Make a Puzzle source-screen smoke: PASS with no console logs.
