# Puzzle Snap Hint and Board Size Report

Superseded for Snap mechanics by `PUZZLE-PERSISTENT-SNAP-BUTTON-REPORT.md`. The board-size evidence remains current.

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

- Removed the tap-piece/tap-matching-cell answer shortcut. Puzzle cells are now non-interactive visual targets.
- Kept direct pointer drag and forgiving near-destination snapping as the primary solve interaction.
- Added keyboard piece movement: arrow keys move a focused loose piece, Shift+Arrow moves farther, and Enter or Space attempts the drop.
- Added a tactile `Snap 1` button in the puzzle header. It places one loose piece, then changes to `Snap ✓` and disables for that attempt.
- Persisted the spent hint so reload cannot restore it. Shuffle and Play Again create a new attempt with one new Snap hint.
- Enlarged the portrait puzzle board while keeping every loose piece within the phone viewport.
- Added a repeatable focused Chromium scenario using the supplied physical-test screenshot as the source image.

## What was verified

- Puzzle model tests cover a fresh hint, deterministic hinted-piece selection, no second use, and reset on restart.
- Static source audit confirms board slots have no click answer handler.
- Chromium 384x854 Tricky puzzle: board `299.52 x 399.34`, right edge `341.75`, bottom edge `473.34`.
- All loose pieces remain reachable: maximum right edge `364`, maximum bottom edge `845`; body height equals viewport height `854`.
- Sixteen visual slots exist and zero are buttons.
- Ordinary piece tap leaves `0 of 16` placed.
- Snap 1 changes progress to one locked piece, persists `snapUsed: true`, disables, and relabels to Snap checkmark.
- Reload resumes with the hint still spent.
- Shuffle resets locked pieces and grants one new Snap hint.
- No console errors, page errors, or external runtime requests.

## What failed

The in-app browser service was unavailable during this card. The repository-local Playwright Chromium lane completed the exact-artifact phone test instead.

## Current exact state

- Build ID: `the-imaginarium-97749f1057bb`
- Bytes: `636225`
- SHA-256: `293fefe2d7befbb20772ab6a1b347e80146cdacabf3d8accb2209ccac9c6247f`
- Exact verification: PASS
- Repeat pack: byte-identical PASS

## Remaining blockers

None for implementation. Physical finger-drag feel remains a subjective phone check.

## Next actionable step

Use the live phone route. The public artifact is byte-identical to the Chromium-tested canonical build.

## Evidence

- `test-results/puzzle-snap-hint-board-size/index.before-snap-hint-board-size.html`
- `test-results/puzzle-snap-hint-board-size/phone.png`
- `tests/puzzleBrowserScenario.mjs`

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/`

- Pages commit: `766892021a5c36de5ceea664ec30d75a53b9c19c`
- Live bytes: `636225`
- Live SHA-256: `293fefe2d7befbb20772ab6a1b347e80146cdacabf3d8accb2209ccac9c6247f`
- Public exact-byte verification: PASS
