# Puzzle One-Shot Snap Assist Report

Superseded by `PUZZLE-PERSISTENT-SNAP-BUTTON-REPORT.md`. The user rejected the one-use mode interpretation.

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What changed

- Replaced the always-on forgiving drop radius with a close manual-placement threshold of 9–10 CSS pixels.
- Changed `Snap 1` from automatic placement into a one-press assist that arms the forgiving legacy radius for one successful near-drop.
- A far miss leaves the assist armed; a close manual placement does not waste it; the first placement that needs the larger radius consumes it.
- Persisted both armed and spent states and exposed clear `Snap 1`, `Ready!`, and `Used` visual states with descriptive accessible names.
- Kept the enlarged phone board and non-interactive answer cells unchanged.

## What was verified

- Focused model tests cover manual and assisted thresholds plus fresh/restarted assist state.
- Exact-artifact Chromium at 384x854 proves an unarmed 30 px offset stays loose, pressing Snap places nothing, an armed 80 px miss stays loose without consuming the assist, and the next 30 px near-drop locks exactly one piece and consumes it.
- Reload preserves the spent state; Shuffle restores one new press.
- The Tricky board remains approximately 300x400, all sixteen loose pieces remain reachable, the page does not scroll, and board cells remain non-interactive.
- Chromium reported no console errors, page errors, or unexpected runtime requests.
- Root lint, typecheck, 315 tests, static audit, and one-shot validation pass.
- Two consecutive canonical packs are byte-identical.

## What failed

Nothing in the implemented correction. The user previously waived the unavailable Windows-link physical session; no new physical verdict is claimed.

## Canonical artifact

- Build ID: `the-imaginarium-bbc3298ba628`
- Bytes: `636585`
- SHA-256: `967c180ef24a91d8cc7c9ec3a7926300adc575ee6ecf85d6d7052cf293ca8f87`
- Exact verification: PASS with zero findings
- Repeat pack: byte-identical PASS

## GitHub Pages

- URL: `https://falloutmule.github.io/single-file-html-software/`
- Pages commit: `c3664e04836afa5906c99d439886c4ff4de50be8`
- Public bytes: `636585`
- Public SHA-256: `967c180ef24a91d8cc7c9ec3a7926300adc575ee6ecf85d6d7052cf293ca8f87`
- Public exact-byte verification: PASS

## Evidence

- `test-results/puzzle-one-shot-snap-assist/index.before-one-shot-snap-assist.html`
- `test-results/puzzle-one-shot-snap-assist/phone.png`
- `test-results/puzzle-one-shot-snap-assist/live-index.html`
- `tests/puzzleBrowserScenario.mjs`

## Relevant SFHS failure modes

- D Logic entropy: the two tolerances and persisted assist state are centralized.
- F Persistence and H/N layout: armed/spent state survives reload without changing the proven larger-board geometry.
- L Input ambiguity: ordinary and assisted drops have explicit, separately tested rules.
- Q Proofless success: source, exact artifact, deterministic pack, Chromium, live bytes, and SHA-256 are recorded.

## Next actionable step

Open the live Pages build on the Samsung and confirm the new normal-drop precision and one-use `Ready!` assist feel with a finger.
