# BlockFolk Stone Doorway Geometry Repair

## WHAT WAS DONE

- Replaced new Stone Door center-overlay snapping with one authored, one-wide, two-tier doorway topology.
- Defined the accepted scale-1 construction unit as `420 / 1.1^10 = 161.928181560403` world units, with a `96.1322435461142` world-unit column pitch and `68.8194771631714` world-unit tier rise.
- Stored the approved source-pixel visible bounds and bottom-center origins for Stone Door, Brick Block, and Log Block. Authored points now follow Fabric scale, horizontal/vertical flip, and rotation.
- Added five unique Stone Door sockets: two lower jambs, two upper jambs, and one lintel. The two cells inside the doorway are forbidden to complete blocks.
- Added matching authored role sockets only to Brick Block and Log Block. Other blocks keep their accepted isometric sockets; Wooden Door and both windows are unchanged.
- Added 1% construction-scale compatibility, screen-space catch tolerance, deterministic distance/layer/socket ordering, occupied-socket rejection, duplicate-pair rejection, duplicate-slot rejection, opening/behind-door rejection, and atomic multi-socket connection discovery.
- Kept legacy Stone Door `backFace` connections validation-only. Existing saves load unchanged, but no new centered Stone Door overlay can be created.
- Preserved the existing connection serialization and `blockfolk-imaginarium.page@3`; no save-schema bump or destructive migration occurred.
- Ordered authored doorway members inside their assembly as upper/lintel blocks, lower jambs, then the Stone Door frame. No object outside the connected assembly is reordered by that doorway-specific pass.
- Kept the permanent `snap-context` DOM node, SFHS controller, control ID, focus target, and duplicate-click suppression path unchanged. Intentional Unsnap feedback is now exactly `Sticker detached.`

## WHAT WAS VERIFIED

- Model coverage proves exact authored bounds, unit calculations, transformed points, 1% scale compatibility, occupied sockets, duplicate slots, forbidden opening cells, deterministic crowded-scene selection, legacy connection preservation, and six-member door-first/wall-first graphs.
- The dedicated actual-Fabric browser scenario builds complete Brick and Log doorways, both door-first and wall-first. It rejects duplicate slots, a complete block behind the door, incompatible targets, mismatched sizes, and nondeterministic crowded targets.
- Dragging from the door and from a jamb moves every assembly member by one identical world-space delta.
- Whole-assembly resize, flip, Copy, Trash, Behind/In Front, Undo/Redo, save/reload, orientation continuity, puzzle input, and PNG export remain operational.
- Native touch still produces exactly one Snap activation and a persistent connection after 900 ms. The same DOM node/control ID becomes Unsnap. A later deliberate touch detaches exactly once, displays `Sticker detached.`, and returns the same controller to Snap.
- Twelve local screenshots were visually inspected: six required scenes at `400 x 844` and `844 x 400`. The completed Brick and Log scenes show a clear opening, the five authored positions remain registered after both drag paths, and the detached member is visibly independent. No complete block appears behind either door.
- The same twelve-scene doorway suite and the full production browser suite pass against the byte-identical live GitHub Pages artifact.

## WHAT FAILED

- The pre-repair Stone Door was a generic `building-face`; its centered `backFace` anchor placed a complete Brick/Log block directly behind the frame.
- No automated lane fails after the repair. SFHS `check` retains the known `SFHS_TEST_SELECTION_REVIEW_REQUIRED` warning for the sibling example directory; its lint, typecheck, and complete unit steps pass, and the explicit source/static/browser/packed lanes cover the changed files.
- Physical Samsung acceptance has not happened yet. Automated doorway acceptance is PASS, but final product status remains FAIL until the user confirms the deployed doorway and lock behavior on the real phone.

## CURRENT EXACT STATE

- Starting feature commit: `b639f72866a39efd13de9c2fa0057cfee9973dc5`
- Implementation/test commit: `fe3735fba5eb50d9b4f59b856e92d92aee9e0b68`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Fetched Pages authority: `ab5d35bfa2337e5b1c0a77e0fbaad321de9721e7`
- Pages commit: `e981cc5c1b75c7bb170e503505b67964b8024264`
- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-119b61d7d836`
- Bytes: `12,281,064`
- SHA-256: `8b3c217d3c6aa937c26a6c9a57dce94a16c88ec792bbdb049b5344375ab7be8d`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e981cc5-2`
- Live response: `12,281,064` bytes and the exact artifact SHA-256 above.
- Pages scope: only `blockfolk-imaginarium/index.html` changed.

## TESTS AND EXACT RESULTS

| Lane | Result |
| --- | --- |
| Focused source/static | PASS: authored geometry, scale, occupancy, legacy, graph, identity, catalog, backgrounds, emoji, and offline static audit |
| Dedicated doorway browser, local | PASS: 12 screenshots; actual Fabric Brick/Log doorways; door-first/wall-first; rejection, assembly, persistence, export, and native-touch proof; zero runtime requests/errors |
| Full BlockFolk browser, local | PASS at `400 x 844` and `844 x 400`; 30 stickers, native emoji, camera, import, puzzle, persistence, export, stable controller; zero runtime requests/errors |
| Lint and typecheck | PASS |
| Complete repository unit suite | PASS: 46 files, 316 passed, 2 skipped |
| SFHS inspect/validate | PASS, zero findings |
| SFHS changed-path check | PASS; one expected path-map review warning; lint/typecheck/full unit steps passed |
| SFHS pack/verify | PASS, zero findings |
| Packed/offline audit | PASS: isolated identity, six categories, both accepted worlds, 30 exact stickers, no external script/stylesheet |
| Deterministic double pack | PASS: identical Build ID, byte count, and SHA-256 on both packs |
| Dedicated doorway browser, live | PASS: all local doorway/native-touch checks repeated; zero runtime requests/errors |
| Full BlockFolk browser, live | PASS at both phone orientations; zero runtime requests/errors |

## INTEGRITY PROOF

- No changed tracked path exists under `examples/the-imaginarium`; its accepted artifact remains `10,349,547` bytes with SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`.
- The full local/live product browser scenario preserves the original Imaginarium localStorage and IndexedDB sentinel values.
- Ueye is unchanged.
- All BlockFolk artwork assets are unchanged. Categories remain Animals, People, Building, Nature, Magic, and Emoji; all 30 stickers and native Unicode emoji behavior remain present.
- Production Valley master: `e5ea7c4077ddfac7c343fd7b1b4a903774bfeb59f4dbd9c28bf12cf630ad9933`.
- Production Valley WebP: `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`.
- Classic Valley PNG: `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`.
- Revised authority JPEG: `4aa0bb1fb66e3c4101a0e4aa2dad1cf0ebf6adf7a5b484453a9cddd9bb0d7911`.
- The stable controller source/markup, catalog registration, world model, and all backgrounds were unchanged by this card.

## FAILURE-MODE AUDIT

- Actively guarded: **A** deliverable drift, **B** external dependency leak, **C** inline handler/eval creep, **D** unrelated breakage, **E** render/state separation, **F** save corruption, **G** harness pollution, **H** orientation continuity, **I** render alignment, **K** browser gesture ownership, **L** stuck input, **M** multi-touch conflict, **N** control-layout drift, **P** input trap, **Q** proofless success, **R** repository clutter, **S** private-data leak, and **T** scope overreach.
- N/A: **J** safe-area geometry and **O** custom-control persistence were not changed; their accepted implementation was exercised by the phone browser lanes.
- Unchanged by contract: page schema, persistence namespaces, categories, catalog art, emoji, both Valley assets, camera/bookmarks, puzzle rules, stable contextual controller identity, original Imaginarium, Ueye, Pages root, and non-BlockFolk Pages routes.

## EVIDENCE

- Ignored pre-edit backups: `test-results/doorway-geometry-repair/backups/`
- Local screenshots and browser proof: `examples/blockfolk-imaginarium/test-results/doorway-geometry-repair/local/`
- Live screenshots and doorway proof: `examples/blockfolk-imaginarium/test-results/doorway-geometry-repair/live/`
- Live full-product proof: `examples/blockfolk-imaginarium/test-results/doorway-geometry-repair/live-full/`
- Required screenshot stems in each doorway proof directory:
  - `01-unsnapped-door-near-blocks`
  - `02-completed-brick-doorway`
  - `03-completed-log-doorway`
  - `04-assembly-moved-by-door`
  - `05-assembly-moved-by-block`
  - `06-deliberately-unsnapped-member`

## REMAINING BLOCKER

Physical Samsung review is authoritative. The user must confirm that the deployed Stone Door visibly forms a one-wide, two-tier opening and stays locked when either the door or a jamb is dragged.

## NEXT ACTIONABLE STEP

Open the live URL on the Samsung, add one Stone Door plus Brick or Log Blocks, press Snap near each of the five intended positions, then drag first the door and then a block. Confirm the opening remains clear and all six pieces move together until Unsnap is intentionally pressed.

## GITHUB PAGES URL

`https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e981cc5-2`

**FAIL - automated doorway acceptance passes, but physical Samsung acceptance is still required.**
