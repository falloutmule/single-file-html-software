# Puzzle Whole-Photo Fit Report

Status: PASS — EXACT-VERIFIED, CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

Changed the puzzle framing baseline from cover to contain. A landscape or tall photo is now fully visible at Zoom 1, centered on a lavender puzzle matte. Zoom 1–3 and drag positioning remain available for an intentional crop. The framing screen now explains the behavior and the former Recenter control is named Fit Whole Picture.

## What was verified

- The reported 16:9-style input geometry renders at the full 600 px puzzle width, with both side edges and the complete source height visible.
- Tall inputs render at the full 800 px puzzle height without losing their top or bottom.
- Zoom 3 still exceeds the frame and therefore supports deliberate cropping.
- The matte is painted before the photo and becomes part of the normalized offline puzzle image.
- Focused Imaginarium scenarios and static audit pass.
- Repository lint, typecheck, 46 test files, 315 tests, and one-shot validation pass; two tests remain intentionally skipped.
- Exact artifact phone layout at 390x844 keeps the new instruction, Zoom, all difficulties, Fit Whole Picture, and Make Puzzle reachable without page overflow.
- Chromium recorded no warnings or errors.
- Two consecutive canonical packs are byte-identical.

## What failed

Nothing in the implemented correction. Browser security still prevents automated selection of the supplied local photo, so exact photo pixels were not injected through the browser chooser. The focused renderer test uses the same wide aspect ratio and the user’s Samsung screenshot is the physical failure evidence that motivated this card.

## Current exact state

- Build ID: `the-imaginarium-3f85919f4abd`
- Bytes: `634353`
- SHA-256: `cef05fae409dfc701182b781a9dd65c7dfc0bf304a66ca3724ceb6aacfe6ee3e`
- Exact verification: PASS
- Repeat pack: PASS

## Remaining blockers

An already-created cropped puzzle contains only the previously normalized crop and cannot recover discarded source pixels. Select the original photo again and make a new puzzle to receive the corrected whole-photo framing.

## Next actionable step

Select the original photo again on the live page and make a new puzzle. Zoom 1 will preserve the complete image; the old normalized puzzle cannot recover pixels previously cropped away.

## Evidence

- Before artifact: `test-results/puzzle-whole-photo-fit/index.before-whole-photo-fit.html`
- Focused renderer assertions: `tests/focusedScenarios.mjs`
- Canonical artifact: `dist/index.html`

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/`

- Pages commit: `448acb29b1af2e4495d75ad5307d5a7045176cbb`
- Live bytes and SHA-256: exact match
- Live home and puzzle-source smoke: PASS with no browser warnings or errors
