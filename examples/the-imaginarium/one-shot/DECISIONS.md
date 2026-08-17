# Decisions

## IMG-DEC-001 — Existing dirty work

Status: VERIFIED. Treat all pre-existing shared SFHS modifications, adapter work, and the untracked Ueye project as user-owned baseline. Restrict implementation to `examples/the-imaginarium` and generated evidence.

## IMG-DEC-002 — Technical lane

Status: VERIFIED. Reuse Ueye's Fabric.js, local ZIP, transparent trim, bounded history, serialization, and export approaches through the current `dom-canvas-fabric` adapter. Do not expose Ueye professional controls.

## IMG-DEC-003 — Built-in art

Status: VERIFIED. Use coherent original procedural paper-cut SVG assets generated locally from source for ten 3:4 backgrounds and the original six-category, 72-sticker starter library. Emoji is a separate seventh category using real Unicode characters rendered by the device's installed emoji font. No runtime network or downloaded character art.

## IMG-DEC-004 — Persistence

Status: VERIFIED. Store preferences in the product-local localStorage namespace and gallery/packs in product-local IndexedDB. Embed imported assets actually used by a picture so pack removal cannot damage saved work.

## IMG-DEC-005 — Imported sticker categorization

Status: VERIFIED. Grown-Up Tools lets an adult preserve the pack manifest/folder category, assign all imported stickers to any built-in category, use a general Imported category, or name a new custom category. Imported backgrounds remain backgrounds. Category assignment is local metadata and does not alter image bytes.

## IMG-DEC-006 — “Public stickers” interpretation

Status: SUPERSEDED. The briefly added generated Community category was removed at the user's request. Preserve the no-account, no-public-gallery, and no-runtime-network contract. Future externally sourced packs must be explicitly selected, downloaded separately, and carry compatible license records.

## IMG-DEC-007 — Real emoji and authored-art boundary

Status: VERIFIED. Remove the generated emoji-face and Community artwork added in the preceding card. Use actual Unicode emoji glyphs through Fabric text with the device's native color-emoji font. Do not generate or invent more sticker artwork unless the user explicitly asks for it.

## IMG-DEC-008 — Auto-save cadence and cues

Status: VERIFIED. Offer Quick (1 second), Relaxed (4 seconds), and Only when leaving choices in Grown-Up Tools, with Relaxed as the default for new or previously unconfigured devices. Background auto-saves remain visually informative but silent; Done remains the intentional save action that can announce and play the success cue. Navigation and document visibility continue to save quietly regardless of the selected timing mode.

## IMG-DEC-009 — Puzzle source and persistence

Status: VERIFIED. Normalize each chosen photo or saved creation to a self-contained 600x800 JPEG and store one current resumable puzzle in the existing product-local IndexedDB database. Keep source bytes and play state private and offline; replacing the current puzzle is an intentional child-facing action.

## IMG-DEC-010 — Puzzle input model

Status: SUPERSEDED IN PART. Preserve direct piece dragging as the primary toy interaction and native focusable piece buttons for accessibility. Matching-cell activation was later removed because it exposed each answer. Focused pieces use Arrow/Shift+Arrow movement; locking is owned exclusively by the native header Snap button for pointer and keyboard users.

## IMG-DEC-011 — Responsive loose-piece layout

Status: VERIFIED. Store normalized wrong-drop positions within an orientation, but reflow loose pieces into the tray when the workspace aspect changes materially. This preserves child intent during ordinary play while preventing portrait coordinates from clipping pieces after a phone rotation.

## IMG-DEC-012 — Whole-photo framing baseline

Status: VERIFIED. Use contain rather than cover at Zoom 1 so a child never loses the sides of a landscape photo or the top and bottom of a tall photo without asking. Center the complete photo on a lavender matte. Retain zoom and drag as explicit cropping controls, and make Fit Whole Picture restore the safe baseline.

## IMG-DEC-013 — One-use Snap hint

Status: SUPERSEDED. The user clarified that Snap is a reusable action button, not a one-use mode or automatic drop behavior. See IMG-DEC-015.

## IMG-DEC-014 — Larger phone puzzle board

Status: VERIFIED. Increase the portrait board to approximately 300x400 CSS pixels on a 384x854 phone while keeping the full tray fixed within the remaining viewport. Preserve the existing landscape split layout with a larger left-side board.

## IMG-DEC-015 — Persistent explicit Snap action

Status: VERIFIED. Dragging and keyboard movement only position and persist loose pieces; releasing or pressing Enter/Space on a piece never locks it. The header button remains labeled `Snap` and can be pressed any number of times while the puzzle is unfinished. Each press locks every loose piece whose center lies inside its own matching cell, leaves all other pieces untouched, persists once, and updates completion once. Obsolete armed/spent fields are ignored and removed when an existing puzzle resumes.

## IMG-DEC-016 — Puzzle Race timer

Status: VERIFIED. Race is an optional one-start stopwatch for the current puzzle attempt. Pressing Race starts at zero and disables only that start control; the visible timer uses persisted wall-clock time, continues through navigation or reload, and freezes before the save that records final Snap completion. Shuffle and Play Again create a new attempt and reset Race. Existing puzzles migrate to an idle race without losing pieces or positions.
