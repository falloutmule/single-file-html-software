# Acceptance

Status values distinguish source and automation proof from visible browser and physical acceptance.

- VERIFIED — Ten fixed 1080×1440 original backgrounds, seven categories, and 84 built-in stickers.
- VERIFIED — Page model, fixed editor actions, bounded history, persistence, gallery, ZIP safety, export, recovery, and child-safe language.
- VERIFIED — One shared Imaginarium control-feedback integration uses the current SFHS contract, runtime, DOM, preset, audio, and haptics packages.
- VERIFIED — Big Toy Buttons, Tool Buttons, Toy Choice controls, and comfort-setting toggles share stable native hit regions and separately moving visual surfaces.
- VERIFIED — Immediate contact, valid release, release-outside cancellation, re-entry, pointer cancellation, disabled state, selected-state synchronization, reduced motion, keyboard activation, and no duplicate activation are covered by focused tests or exact-artifact Chromium interaction.
- VERIFIED — Category choices remain horizontally scrollable, selected categories stay visible, and canvas dragging remains isolated from nearby controls.
- VERIFIED — Sound and haptic cues follow the stored preferences and degrade without blocking activation.
- VERIFIED — Focused source tests and offline/static audit pass.
- VERIFIED — Canonical SFHS inspect, validate, proportional check, pack, exact verify, and two byte-identical isolated Windows builds pass.
- VERIFIED — Exact-artifact Chromium phone and desktop workflows: home, create, editor, category scroll and selection, sticker placement and canvas drag, every editor tool, background choice, save, gallery, reopen, dialogs, Grown-Up Tools, comfort toggles, reduced motion, long press, slide-off cancellation, keyboard focus, and keyboard activation.
- VERIFIED — Chromium emitted no console warnings or errors during the final evidence capture; the packed artifact has no external runtime dependencies.
- VERIFIED — Reported Samsung screenshot defects are repaired: pointer-origin focus leaves no blue focus outline, keyboard focus remains visible, and each control contact emits one click rather than press/activation/action duplicates.
- VERIFIED — GitHub Pages serves the exact canonical bytes at `https://falloutmule.github.io/single-file-html-software/`; live phone-sized boot and pointer-focus smoke pass with zero console warnings or errors.
- WAIVED — The user explicitly waived the remaining physical-link session for this deployment after Windows Link exposed no usable device session. No fabricated physical verdict is claimed.
- SUPERSEDED — Auto-save was reported as too aggressive and noisy; the 550 ms audible background path has been replaced.
- VERIFIED — Grown-Up Tools exposes Quick, Relaxed, and Only when leaving as tactile mutually exclusive choices; Relaxed is the migration-safe default.
- VERIFIED — Background auto-save is silent, while Done keeps its explicit success announcement/cue and navigation/visibility saves remain safe.
- VERIFIED — Home and gallery expose Make a Puzzle; saved creations enter the shared 3:4 framing and normalization workflow.
- VERIFIED — Easy, Fun, and Tricky create 4, 9, and 16 unique pieces whose rounded crop bounds cover the entire 600x800 source exactly.
- VERIFIED — A current puzzle persists its source, difficulty, shuffled order, loose positions, locks, and completion state and resumes after an application reload.
- SUPERSEDED — The native select-piece/select-matching-spot path was removed after physical testing showed that it revealed the answer.
- VERIFIED — Puzzle pieces support pointer dragging plus Arrow/Shift+Arrow movement on native focusable piece buttons; Enter/Space on a piece does not hide a snap action, and keyboard users activate the native header Snap button.
- VERIFIED — Final exact-artifact Chromium acceptance passes at 390x844 portrait and 844x390 landscape; all Tricky pieces remain inside the viewport after orientation reflow.
- VERIFIED — Existing gallery and editor controls remain reachable after puzzle use; final browser diagnostics contain no console warnings or errors.
- LIMITED — Browser policy declined automated local-photo chooser injection, and the embedded coordinate-drag helper did not provide reliable physical-style drag evidence. No physical Samsung verdict is claimed.
- VERIFIED — Physical Samsung evidence exposed unintended cover-cropping of a wide photo; the framing baseline now fits the whole wide or tall photo at Zoom 1 on a visible matte.
- VERIFIED — The framing copy and Fit Whole Picture control explain and restore the non-cropping baseline; zoom and drag remain available for intentional cropping.
- VERIFIED — Matching board cells are non-interactive and ordinary piece taps no longer reveal or place the answer.
- SUPERSEDED — The one-use Snap 1/Ready/Used interaction was rejected by the user.
- VERIFIED — Every piece drop remains loose. Reusable Snap locks every loose piece whose center is inside its own matching cell, leaves wrong-cell pieces loose, stays enabled after empty and successful presses, and disables only on completion.
- VERIFIED — Focused Chromium at 384x854 measures the enlarged Tricky board at approximately 300x400, with every one of sixteen loose pieces inside the viewport and no page scroll.
- VERIFIED — Pointer drag remains primary; focused pieces also support Arrow/Shift+Arrow movement, while the explicit header Snap button is the only placement action.
- VERIFIED — Race starts explicitly at zero, displays tenths beneath progress, cannot restart during the same attempt, survives reload using wall-clock elapsed time, freezes on the final Snap, and resets with Shuffle or Play Again.
- VERIFIED — Back, Hint, Race, Snap, and Shuffle remain fully inside the 384x854 phone header while the enlarged board and all sixteen pieces retain their proven bounds.
