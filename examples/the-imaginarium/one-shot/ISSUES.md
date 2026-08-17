# Issues

## IMG-ISSUE-001 — Physical Android acceptance

- Phase: acceptance
- Status: WAIVED FOR THIS DEPLOYMENT
- Severity: external gate
- Observed: `adb devices -l` exposes only `emulator-5554`; ADB mDNS and Windows device discovery expose no physical Samsung handset.
- Expected: complete the retained checklist on the exact `SM-G998*` device.
- Resolution: the user explicitly waived the unavailable physical-link session and authorized GitHub Pages publication. The current physical seed targets Build `the-imaginarium-97749f1057bb`, SHA-256 `293fefe2d7befbb20772ab6a1b347e80146cdacabf3d8accb2209ccac9c6247f`.

## IMG-ISSUE-002 — Pre-existing repository changes

- Phase: preflight
- Status: WORKAROUND
- Severity: low
- Observed: shared SFHS files and Ueye/adapter work were already dirty or untracked.
- Expected: isolated product work.
- Resolution: recorded the exact starting state, saved ignored backups, confined product edits to Imaginarium, and restored only the six current SFHS control-feedback package directories from verified `origin/main` without overwriting existing dirty shared files.

## IMG-ISSUE-003 — Declared empty public directory

- Phase: pack
- Status: RESOLVED
- Severity: low
- Observed: the original project pack stopped because the declared `public` directory did not exist.
- Resolution: retained `public/.gitkeep`; the final pack and exact verification pass.

## IMG-ISSUE-004 — Local browser artifact access

- Phase: browser evidence
- Status: RESOLVED
- Severity: acceptance gate
- Observed: direct `file://` navigation had previously been rejected by the in-app browser policy.
- Resolution: served the exact canonical `dist/index.html` through the repository-local HTTP workflow and completed phone-sized and desktop Chromium acceptance with zero console warnings or errors.

## IMG-ISSUE-005 — Determinism cache miss

- Phase: deterministic packaging
- Status: RESOLVED
- Severity: low
- Observed: the first offline isolated build could not find a lockfile-pinned ESLint tarball in the local pnpm store; the sandboxed online retry was also denied network access.
- Resolution: reran the repository determinism command with approved network access. Both isolated builds reused the completed store and produced byte-identical artifacts.

## IMG-ISSUE-006 — Aggressive and noisy auto-save

- Phase: product repair
- Status: RESOLVED
- Severity: medium
- Observed: every editor mutation schedules a save after 550 ms, and the scheduled path invokes the ordinary audible success behavior.
- Expected: grown-ups can choose an appropriate cadence; background saving is quiet; an intentional Done action can still acknowledge success.
- Best explanation: the debounce delay and feedback policy were coupled to the same `saveCurrent()` default used by explicit saving.
- Guard: keep one shared save implementation, pass quiet intent from the scheduler, preserve immediate quiet saves on navigation and visibility loss, and cover the timing policy with focused tests.
- Resolution: added three persisted tactile radio choices, made Relaxed the migration-safe default, changed timed saves to `saveCurrent({ quiet: true })`, and retained quiet saves on Home, gallery transitions, and visibility loss. Focused tests, exact-artifact Chromium cadence checks, and live Pages verification pass.

## IMG-ISSUE-007 — Automated local photo selection

- Phase: browser acceptance
- Status: EXTERNAL LIMITATION
- Severity: evidence gap
- Observed: the in-app browser security policy declined injection of the supplied local photo into the file chooser.
- Expected: select a JPEG/PNG from the phone and enter the framing screen.
- Resolution: retained the native file input and local FileReader/Image normalization implementation. Chromium exercised the saved-creation route through the shared framing, normalization, persistence, and play pipeline. A human file-picker pass remains optional evidence.

## IMG-ISSUE-008 — Automated coordinate drag

- Phase: browser acceptance
- Status: WORKAROUND
- Severity: evidence gap
- Observed: the browser coordinate-drag helper did not reliably deliver a touch drag to a puzzle piece in the embedded browser surface.
- Expected: pointer capture moves the piece, a near drop snaps once, and a far drop remains loose.
- Resolution: focused tests verify snap boundaries and product code retains pointer capture, cancellation, blur cleanup, and wrong-drop persistence. Exact-artifact Chromium completed the puzzle through the equivalent native select-piece/select-spot path. No physical drag verdict is claimed.

## IMG-ISSUE-009 — Landscape clipping

- Phase: browser acceptance
- Status: RESOLVED
- Severity: medium
- Observed: portrait-normalized loose-piece coordinates and a 620 px minimum play height placed Tricky pieces below a 390 px landscape viewport.
- Resolution: removed the landscape minimum-height floor and reflow loose pieces when the workspace aspect changes materially. Final 844x390 bounds keep every piece within the viewport and body height equals 390.

## IMG-ISSUE-010 — Isolated determinism network refill

- Phase: deterministic packaging
- Status: WORKAROUND
- Severity: low
- Observed: the isolated verifier attempted a fresh frozen pnpm install and the restricted network denied package tarball fetches.
- Resolution: the normal source, lint, type, repository, pack, and exact-verify gates pass. Two consecutive local canonical packs produced identical bytes and SHA-256; the network-dependent isolated helper is recorded as blocked rather than misreported as a product failure.

## IMG-ISSUE-011 — Landscape photos cropped by default

- Phase: physical acceptance
- Status: RESOLVED
- Severity: high
- Observed: the Samsung test showed a wide photo losing most of both sides when normalized to the portrait puzzle board.
- Expected: the complete selected image is visible unless the grown-up or child explicitly zooms and repositions it.
- Cause: the framing geometry used the larger cover scale at Zoom 1.
- Resolution: Zoom 1 now uses the smaller contain scale and a lavender matte. Focused tests cover wide, tall, and explicit-zoom geometry; phone-sized Chromium confirms the revised controls fit without overflow. Existing already-cropped puzzle data must be recreated from the original photo because discarded pixels are not recoverable.

## IMG-ISSUE-012 — Matching-cell tap reveals puzzle answers

- Phase: physical acceptance
- Status: RESOLVED
- Severity: high
- Observed: tapping a piece and then its matching board cell placed it automatically, making the puzzle easy to cheat.
- Expected: solving requires spatial placement followed by an explicit reusable Snap button press.
- Resolution: board cells are non-interactive visual targets, piece taps and drops do not auto-fit, keyboard movement does not hide another placement action, and the header Snap button checks positioned pieces without exposing matching cells.

## IMG-ISSUE-013 — Puzzle board too small on phone

- Phase: physical acceptance
- Status: RESOLVED
- Severity: medium
- Observed: the 4x4 board occupied only about 250x333 CSS pixels on the Samsung screenshot.
- Resolution: the phone board is now approximately 300x400 at the tested 384x854 viewport. Automated bounds prove the board and all sixteen loose pieces stay fully inside the non-scrolling play screen.

## IMG-ISSUE-014 — Snap assist active on every drop

- Phase: physical acceptance
- Status: SUPERSEDED
- Severity: high
- Observed: after adding the one-use header hint, every ordinary piece drop still used the old 58%-of-piece snap radius, so the puzzle remained easy to solve without spending the hint.
- Expected at the time: ordinary drops require close manual alignment; `Snap 1` deliberately grants one forgiving placement.
- Resolution at the time: a one-use armed assist was implemented and verified, but the user rejected that interaction interpretation. IMG-ISSUE-015 records the final correction.

## IMG-ISSUE-015 — Snap implemented as a mode instead of a button action

- Phase: physical acceptance
- Status: RESOLVED
- Severity: high
- Observed: dropping near a cell could still lock automatically, while pressing Snap changed an armed one-use state.
- Expected: dragging only positions a piece. Snap can be tapped unlimited times and, on each tap, locks every piece currently centered over its own correct cell.
- Resolution: all drop-time locking and one-use state were removed. Snap remains enabled until completion, checks all loose pieces on every press, ignores wrong-cell pieces, cleans legacy state on resume, and emits no per-piece product cue that could duplicate the tactile button sound.
