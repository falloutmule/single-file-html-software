# BlockFolk Stable Snap Controller

## WHAT WAS DONE

- Replaced the two sibling Snap and Unsnap buttons with one permanent `snap-context` button, one permanent SFHS controller, and one control ID.
- The permanent control changes its icon, visible label, accessible name, tooltip, state marker, and mint/lilac presentation in place. Its DOM node, focus target, controller, and duplicate-click suppression window do not change.
- The action checks current assembly state: an independent compatible selection runs Snap; a connected selection runs Unsnap.
- A deliberate Unsnap now displays `Sticker detached`, replacing the stale `Snapped and locked` toast.
- The shared SFHS control package was not changed. Categories, stickers, backgrounds, construction geometry, save schema, storage namespaces, scale, camera, and puzzle behavior were not changed.

## ROOT CAUSE

The old toolbar mounted Snap and Unsnap as separate SFHS controls in the same position. Snap activated on `pointerup` and synchronously hid itself while exposing Unsnap. Android Chrome then emitted its browser-generated activation `click` at the same coordinates. Because re-hit-testing found the newly exposed Unsnap control, that second event reached a different controller whose private 800 ms suppression window had never been set. It immediately detached the connection while leaving the Snap success toast visible.

The graph transaction and rigid-assembly repairs were functioning; the connection was created and then deleted by this second control activation. The stable controller removes the cross-controller target swap, so the generated click returns to the same controller and is consumed by its existing suppression window.

## WHAT WAS VERIFIED

- A CDP native touch on Snap activates exactly once, creates exactly one connection, retains the same DOM node and `data-sfhs-control-id`, and changes that control to accessible Unsnap state.
- The test waits 900 ms, longer than the 800 ms suppression window, and the assembly remains connected.
- A coordinate-based regression explicitly calls `document.elementFromPoint(x, y)` after the state change and sends the delayed click to that result. It resolves to the same control ID and does not activate Unsnap.
- A later deliberate native touch Unsnaps exactly once, retains the same DOM/control identity, returns to Snap state, and displays `Sticker detached`.
- Keyboard Enter and assistive `click` activation each perform exactly one contextual action without remounting the control.
- Dragging either snapped member still moves the complete assembly; save/reload, copy, delete, undo/redo, face snapping, layering, emoji, import, puzzle, and export coverage remain green.
- Local and live touch-enabled Chromium pass at `400 x 844` and `844 x 400` with zero console errors, page errors, and unexpected runtime requests.
- Focused source/static tests, packed audit, lint, typecheck, the full repository suite, SFHS inspect/validate/check/pack/verify, and two byte-identical canonical packs pass.
- Original Imaginarium tracked files are unchanged. Its accepted artifact remains 10,349,547 bytes with SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`. Ueye is untouched.

## WHAT FAILED

The pre-repair physical behavior failed because control identity changed between `pointerup` and the browser-generated activation `click`. Earlier automated tests sent both events to one stored element or used Playwright mouse-style `.click()`, so they did not reproduce coordinate re-hit-testing on a touch-enabled browser.

No automated lane failed after the stable-controller repair. SFHS `check` retained its known path-map review warning for the product directory; the explicit product source, static, packed, and browser lanes cover the changed files.

## CURRENT EXACT STATE

- Starting feature commit: `853ca23ee6044300e4725f9e33517504b455405b`
- Implementation commit: `1757d050ca21d747440174bc6bd6df42ce9a1dea`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Pages commit: `ab5d35bfa2337e5b1c0a77e0fbaad321de9721e7`
- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-673c6918144e`
- Bytes: `12,272,785`
- SHA-256: `c1de5b58ccca3d4477e5b94a93b8e6aab32522f69ea76fee9e33358ca25e1280`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=ab5d35b`
- Live download: byte-identical to the accepted local artifact after Pages propagation.
- Pages scope: only `blockfolk-imaginarium/index.html` changed.

## FAILURE-MODE AUDIT

- Actively guarded: **A** deliverable drift, **B** external dependency leak, **C** inline handler/eval creep, **D** unrelated breakage, **F** save corruption, **K** browser gesture/input interop, **L** stuck input, **M** multi-touch conflict, **N** control-layout drift, **P** input trap, **Q** proofless success, **S** private-data leak, and **T** scope overreach.
- N/A: rendering-state mutation, harness pollution, viewport/backing-resolution changes, safe-area changes, custom-control persistence, and repository reorganization were outside this controller-only repair and remained untouched.
- Unchanged by contract: BlockFolk Valley and Classic Valley assets, all 30 stickers, category order, world/camera model, page schema, persistence namespaces, original Imaginarium, Ueye, Pages root, and every non-BlockFolk Pages route.

## REMAINING BLOCKERS

None in automated verification. Physical Samsung confirmation remains the authority for the exact device/browser path that originally exposed the defect.

## NEXT ACTIONABLE STEP

On the Samsung, place two compatible construction pieces close together and press Snap once. The button should become Unsnap and dragging either piece should move both. Press Unsnap only when intentionally detaching them.

## EVIDENCE

- Ignored pre-edit backups and local/live browser output: `examples/blockfolk-imaginarium/test-results/snap-context-stable/`
- Local and live screenshots include `terrain-isometric-snap-400x844.png`, `construction-toolbar-and-assembly-400x844.png`, and `stone-door-brick-block-locked-400x844.png`.

## GITHUB PAGES URL

`https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=ab5d35b`

**PASS - Snap and Unsnap now share one stable controller, and the native-touch duplicate activation is covered by a direct regression.**
