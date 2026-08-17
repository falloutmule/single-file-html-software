# Puzzle Race Timer Report

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

- Added a tactile Race button between Hint and Snap without changing the accepted persistent Snap behavior.
- Race starts an optional stopwatch at zero, displays tenths beneath piece progress, and prevents accidental restart during the same attempt.
- Stored the wall-clock start and final elapsed duration in the current puzzle so a running race continues through navigation or reload.
- Froze the elapsed duration before persisting the final Snap completion. Shuffle and Play Again reset Race with the new attempt.
- Added migration-safe idle defaults for existing puzzles and accessible idle, running, and finished button names.

## What was verified

- Pure tests cover idle/running/frozen elapsed calculations, minute formatting, restart reset, invalid state rejection, and old-puzzle compatibility.
- Exact-artifact Chromium at 384x854 verifies: explicit start, visible tenths, no restart while running, elapsed growth, reload continuation, final-Snap freeze, stable finished time, and Play Again reset.
- Back, Hint, Race, Snap, and Shuffle occupy measured non-overlapping 48 px controls from x=7 through x=377 inside the 384 px viewport.
- The enlarged Tricky board remains 299.52x399.34, every loose piece remains reachable, and body height remains 854 with no page scroll.
- Persistent Snap regression coverage still proves no lock on release, reusable empty/successful presses, all-eligible locking, wrong-cell rejection, legacy-state cleanup, keyboard activation, and exactly-once completion.
- Chromium reported no console errors, page errors, or unexpected runtime requests.
- Focused source/static checks, root lint, typecheck, 315 tests, one-shot validation, canonical pack, exact verify, and byte-identical repeat pack pass.

## What failed

Nothing in the implemented Race card. The unavailable Windows-link physical session remains waived; no new Samsung verdict is claimed.

## Current exact state

- Build ID: `the-imaginarium-abb5ce5e503d`
- Bytes: `639570`
- SHA-256: `53ba88e5f3e54c728efa220bca6dbf3f910a62377a8c8f376e8a2f81c6ab8c6b`
- Exact verification: PASS with zero findings
- Repeat pack: byte-identical PASS

## Remaining blockers

None for implementation or deployment. Physical finger observation remains optional through the live Pages build.

## Next actionable step

On the Samsung, start Race, solve with the reusable Snap button, and compare the frozen result across Play Again attempts.

## Evidence

- `test-results/puzzle-race-timer/index.before-puzzle-race-timer.html`
- `test-results/puzzle-race-timer/race-active.png`
- `test-results/puzzle-race-timer/phone.png`
- `test-results/puzzle-race-timer/browser-evidence.json`
- `test-results/puzzle-race-timer/live-index.html`
- `tests/puzzleBrowserScenario.mjs`

## Failure-mode audit

- A/B/C: one-file offline artifact retained; static audit and exact verifier pass.
- D/T: changes are limited to Race state, header display, lifecycle, tests, and evidence.
- F: missing race fields migrate to idle; start/final state survives reload; restart resets cleanly.
- H/N: the active timer and fifth action retain measured phone header and puzzle bounds.
- L/P: Race is edge-triggered, cannot restart while active, and its ticker is stopped on navigation, completion, and restart.
- Q: source, exact artifact, deterministic repeat pack, Chromium, live bytes, and SHA-256 are recorded.

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/`

- Pages commit: `57850678d3cfe3f44684000a704a26c0d6d069df`
- Public bytes: `639570`
- Public SHA-256: `53ba88e5f3e54c728efa220bca6dbf3f910a62377a8c8f376e8a2f81c6ab8c6b`
- Public exact-byte verification: PASS

Final result: PASS.
