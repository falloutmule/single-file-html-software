# Flip + Depth Controls Report

Status: PASS — EXACT-VERIFIED, PHONE-CHROMIUM-ACCEPTED, AND LIVE ON GITHUB PAGES.

## What was done

- Added Flip to horizontally mirror the selected Fabric sticker around its own center without changing its position, size, angle, or selection.
- Added Behind and In Front to move the selected sticker exactly one position through the existing Fabric object stack.
- Kept backgrounds outside the editable sticker stack and retained the current object as the active selection after Flip and depth changes.
- Preserved the active layer across Undo/Redo when that layer still exists.
- Extended normalization for existing optional `flipX`, `flipY`, `opacity`, and `zIndex` fields without changing the picture schema.
- Added the three actions to the shared clicky tool-button integration with native disabled boundaries.
- Converted the eight-action tool tray to a 70 px-wide horizontal phone scroller with `pan-x` touch behavior instead of shrinking controls.
- Published the exact canonical single-file artifact as the sole GitHub Pages application file.

## What was verified

- Focused model tests cover Flip toggling, invariant center/scale/rotation, Copy inheritance, one-step depth changes, stable front/back boundaries, deterministic `zIndex`, legacy defaults, save/reopen, and saved-project duplication.
- The phone-sized 384×854 Chromium workflow uses Wood Door, Stone Block, Broadleaf Tree, and Farmer with Pitchfork to verify Flip twice, Turn + Flip, Behind twice, In Front, Copy, independent copy editing, Undo/Redo, save/reopen, and PNG export.
- The asymmetric Farmer character also flips and returns to its original orientation.
- The phone tray measures 360 px visible by 616 px scrollable, with every tool at least 70 px wide and horizontal touch scrolling enabled.
- The selected sticker remains active through depth changes and applicable Undo/Redo operations; Behind and In Front disable at their respective stack boundaries.
- Existing Blockfolk and puzzle Chromium workflows pass unchanged.
- Chromium reported no console errors, page errors, or unexpected runtime requests.
- Focused source/static checks, lint, typecheck, 315 tests, one-shot validation, supported SFHS check, canonical pack, exact verification, and a byte-identical repeat pack pass.
- The public GitHub Pages response is byte-for-byte identical to the final canonical artifact.

## What failed

- The first browser run assumed the SFHS wrapper kept visible text inside the native button and exposed `aria-disabled`; the integration correctly used accessible labels and native `disabled`. The assertions were corrected.
- A concurrent browser run exposed missing waits around asynchronous Undo/Redo rendering. The scenario now waits for the full object stack and active selection and passes consistently.
- The first SFHS check stopped on two lint globals in the new tests. The test annotations were repaired; lint and the full check now pass.
- The first public Pages read arrived before CDN propagation and returned the previous artifact. The cache-busted retry returned the final exact bytes.
- No product or final verification failure remains. Physical Samsung testing remains waived by the existing user instruction.

## Current exact state

- Build ID: `the-imaginarium-08caa6e20c38`
- Bytes: `10349488`
- SHA-256: `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e`
- Source SHA-256: `08caa6e20c38f8c82ec2fb2ec76273f71d8c4274adccec71613ab0b8507d5884`
- Exact verification: PASS with zero findings
- Repeat pack: byte-identical PASS
- Pages commit: `260829515804fb49dc5ffd56576824d2cd371248`
- Public exact-byte verification: PASS

## Evidence

- `test-results/flip-depth-controls/index.before-flip-depth-controls.html`
- `test-results/flip-depth-controls/flip-depth-phone.png`
- `test-results/flip-depth-controls/pages-2608295-2.html`
- `tests/flipDepthBrowserScenario.mjs`
- `tests/focusedScenarios.mjs`

## Failure-mode audit

- A/B/C: one-file offline delivery is retained; static audit, request blocking, manifest checks, exact verification, and public hash comparison pass.
- D/T: the change is bounded to sticker transforms/order, toolbar presentation, focused tests, and evidence; existing picture/puzzle behaviors remain accepted.
- F: `imaginarium.page@1` remains compatible, missing optional transform fields receive safe defaults, and combined Flip/Turn/depth state survives all tested round trips.
- H/N/P: the phone tray scrolls horizontally, retains minimum touch width, prevents the canvas from owning toolbar gestures, and keeps boundary states visible.
- Q: source tests, exact artifact, deterministic pack, local browser evidence, Pages commit, public bytes, and hashes are bound in this report.
- S: the public artifact and report contain no private attachment paths or runtime external dependencies.

## GitHub Pages URL

`https://falloutmule.github.io/single-file-html-software/?v=2608295`

## Next actionable step

Build one doorway scene on the phone and confirm that children understand the words Behind and In Front without coaching.

Final result: PASS.
