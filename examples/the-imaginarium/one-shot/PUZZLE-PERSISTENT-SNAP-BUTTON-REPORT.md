# Puzzle Persistent Snap Button Report

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

- Removed all automatic locking from pointer release, cancellation, and piece-key activation. Those paths only save loose-piece positions.
- Replaced `Snap 1`, `Ready!`, and `Used` with one persistent `Snap` button that remains available until completion.
- Each press scans every loose piece and locks all pieces whose centers lie inside their own matching cells; wrong-cell pieces remain untouched.
- Removed one-use state from new puzzles and diagnostics. Existing `snapUsed` and `snapArmed` fields are ignored, deleted, and saved away when a puzzle resumes.
- Batched multi-piece locking into one progress/save/completion update and removed per-piece product cues so the tactile button press is not duplicated.

## What was verified

- Pure model tests cover inclusive cell boundaries and one-pixel failures outside all four edges.
- Exact-artifact Chromium at 384x854 proves: empty Snap changes nothing; release over the correct cell does not lock; successful and repeated presses remain enabled; wrong-cell pieces remain loose; one press locks multiple eligible pieces; legacy state is cleaned without losing position; keyboard movement plus header-button activation works; one final press locks all remaining pieces and completes once.
- The product cue probe records no extra per-piece Snap cue during ordinary successful presses.
- The enlarged Tricky board remains approximately 300x400, all loose pieces stay reachable, and the page does not scroll.
- Chromium reported no console errors, page errors, or unexpected runtime requests.
- Focused source/static checks, root lint, typecheck, 315 tests, one-shot validation, canonical pack, exact verify, and byte-identical repeat pack pass.

## What failed

- The first Chromium attempt found an ambiguous text selector because both the visible progress field and accessibility live region contained the same count. The test was corrected to address the visible progress element; the exact-artifact scenario then passed.
- No product failures remain. The unavailable Windows-link physical session remains waived; no new Samsung PASS is claimed.

## Current exact state

- Build ID: `the-imaginarium-f0432fa27760`
- Bytes: `636305`
- SHA-256: `9ebbc6a1d2c09cc25cbda084bec1a5bca2a81eede52822461696ba6dfea9c4b3`
- Exact verification: PASS with zero findings
- Repeat pack: byte-identical PASS

## Remaining blockers

None for implementation or deployment. Finger feel is available for optional Samsung observation through the live Pages route.

## Next actionable step

On the Samsung, drag one or more pieces over their matching cells, release them, and press Snap repeatedly to judge the center-inside-cell rule with a finger.

## Evidence

- `test-results/puzzle-persistent-snap-button/index.before-persistent-snap-button.html`
- `test-results/puzzle-persistent-snap-button/phone.png`
- `test-results/puzzle-persistent-snap-button/browser-evidence.json`
- `test-results/puzzle-persistent-snap-button/live-index.html`
- `tests/puzzleBrowserScenario.mjs`

## Failure-mode audit

- A/B/C: one-file offline artifact retained; static audit and exact verifier pass.
- D/T: the card is limited to puzzle positioning, Snap activation, compatibility state, tests, and evidence.
- F: legacy armed/spent fields are migration-tested and cannot disable the new button.
- L/P: piece release and header activation have separate ownership; pointer cleanup and keyboard paths are tested.
- N: proven phone board and tray geometry are unchanged and remeasured.
- Q: source, exact artifact, repeat pack, Chromium, live bytes, and SHA-256 are recorded.

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/`

- Pages commit: `f7393edbb5a88b927abc2404bf24c4ad922b531a`
- Public bytes: `636305`
- Public SHA-256: `9ebbc6a1d2c09cc25cbda084bec1a5bca2a81eede52822461696ba6dfea9c4b3`
- Public exact-byte verification: PASS

Final result: PASS.
