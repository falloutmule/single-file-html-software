# Blockfolk Assets and Puzzle Color Report

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

- Added a built-in Blockfolk category containing all 30 unchanged game-ready PNG stickers: six characters, ten blocks, and fourteen creatures/scenery pieces.
- Added the unchanged 1448×1086 Blockfolk Valley PNG as a built-in Make a Picture background.
- Added aspect-preserving background layout metadata. Blockfolk Valley fills the portrait page height and takes 10% of the required horizontal crop from the left and 90% from the right.
- Applied the approved sky/yellow/mint/lilac/pink/purple palette across the full Make a Puzzle flow while retaining the existing SFHS tactile control mechanics.
- Recorded user-supplied provenance and the explicit public-redistribution authorization without making a broader ownership claim.
- Published the exact canonical single-file artifact as the sole GitHub Pages application file.

## What was verified

- All 30 sticker SHA-256 values match the supplied game-ready archive manifests; the background SHA-256 matches the supplied PNG.
- Focused tests pass with 11 backgrounds, 114 stickers, 8 categories, 30 Blockfolk stickers, 125 unique built-in asset IDs, and 31 declared raster assets.
- Phone-sized Chromium verifies the background at equal X/Y scale, an 84 px rendered left crop, all 30 Blockfolk controls, representative character/block/creature placement, Bigger, Turn, Copy, Undo, save, reopen, and PNG export.
- Visual screenshots confirm readable puzzle color treatments on the source and play screens and a clean Blockfolk composition in the editor.
- The existing reusable Snap and Race workflow passes unchanged at 384×854, including release-without-snap, repeated Snap, wrong-cell rejection, reload continuation, keyboard activation, final-Snap completion, and Race freeze/reset.
- Chromium reported no console errors, page errors, or unexpected runtime requests.
- Focused source/static checks, lint, typecheck, 315 tests, one-shot validation, the supported SFHS check lane (including browser smoke), canonical pack, exact verification, and a byte-identical repeat pack pass.
- The live Pages response is byte-for-byte identical to the final canonical artifact.

## What failed

- The first direct puzzle-browser invocation omitted its sentinel and interpreted the test script as an image. The package script now supplies the sentinel; the supported command passes.
- `sfhs check --depth deep` is not a valid command shape in this CLI. The supported `sfhs check --project ...` command passed every lane.
- The first live Pages read occurred before CDN propagation and returned the previous artifact. A cache-busted retry returned the exact new bytes and SHA-256.
- No product or final verification failure remains. Physical Samsung testing remains explicitly waived.

## Current exact state

- Build ID: `the-imaginarium-f9d432389d43`
- Bytes: `10347008`
- SHA-256: `127b536c21da2f9c48fb9d16e40e4fcb08dcb51d33589bd647106d3658b0154a`
- Source SHA-256: `f9d432389d430c18ea5553a2dd33199702d08ddc685144d07d394694b944b83c`
- Exact verification: PASS with zero findings
- Repeat pack: byte-identical PASS
- Pages commit: `0e6c20aef420b6011a5c0852d6497b9622841130`
- Public exact-byte verification: PASS

## Remaining blockers

None for the requested implementation or deployment.

## Next actionable step

Open the live build on the Samsung when convenient and make a Blockfolk scene; this is optional observation, not a release gate for this card.

## Evidence

- `test-results/blockfolk-puzzle-color/index.before-blockfolk-puzzle-color.html`
- `test-results/blockfolk-puzzle-color/index.first-pack.html`
- `test-results/blockfolk-puzzle-color/blockfolk-editor-phone.png`
- `test-results/blockfolk-puzzle-color/puzzle-source-colors-phone.png`
- `test-results/blockfolk-puzzle-color/puzzle-play-colors-phone.png`
- `tests/blockfolkBrowserScenario.mjs`
- `tests/puzzleBrowserScenario.mjs`

## Failure-mode audit

- A/B/C: one-file offline delivery retained; the manifest, static audit, exact verifier, request guard, and public hash check pass.
- D/T: changes are limited to Blockfolk assets/metadata, background layout, puzzle tones, tests, provenance, and this report.
- F: existing picture IDs and save schema remain unchanged; built-in asset IDs reopen without embedding duplicate asset payloads.
- H/N/P: phone layout, category scrolling, modal ownership, puzzle header bounds, board size, and tray reachability remain accepted.
- Q: source, exact artifact, repeat build, browser screenshots, live bytes, and hashes are recorded.
- S: public documentation uses relative paths and records authorization without exposing local attachment paths or private data.

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/?v=0e6c20a`

Final result: PASS.
