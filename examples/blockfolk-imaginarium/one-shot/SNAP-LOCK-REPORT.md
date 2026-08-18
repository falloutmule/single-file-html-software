# BlockFolk Snap Lock 001

## WHAT WAS DONE

- Changed the explicit Snap command into a verified transaction: it moves the selected piece to the proposed socket, validates and stores the connection, then proves that both endpoints resolve to the same connected assembly.
- Success now reads `Snapped and locked` only after that proof. A failed lock restores the complete pre-command picture instead of leaving a moved but unattached piece or reporting false success.
- The locked assembly keeps the existing behavior: dragging either member moves the complete connected component until the user chooses Unsnap.
- No category, sticker, background, camera, scale, storage namespace, or automatic-snap behavior changed.

## WHAT WAS VERIFIED

- Focused source/static tests and packed-content audit: PASS.
- The phone Chromium construction scenario waits 350 ms after Snap, verifies one stored connection, and proves both endpoints resolve to the identical two-member assembly.
- The scenario selects and drags the opposite (formerly stationary) member; both pieces move by the same world-space delta.
- Save/reload preserves the connection, and selecting the opposite member after reload still resolves to both assembly members.
- Door-to-block face snapping receives the same stored-lock proof and success message.
- Local and live Chromium: PASS at `400 × 844` and `844 × 400`, with zero console errors, page errors, or unexpected network requests.
- Lint and typecheck: PASS. Complete repository test suite: 46 files passed; 316 tests passed and 2 skipped.
- SFHS inspect, validate, check, pack, and exact verify: PASS. The `check` command emitted its known path-map review warning; the explicit focused product lanes above cover both changed files.
- Two canonical packs were byte-identical.
- Original Imaginarium tracked files are unchanged. Its accepted artifact remains 10,349,547 bytes with SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`. Ueye is untouched.

## WHAT FAILED

The prior command displayed `Snapped together` immediately after requesting a connection. It did not verify the post-serialization connected-component invariant before reporting success, and the browser proof only established continued movement from one side. That allowed a false or ambiguous success state to look like a connection that immediately let go.

## CURRENT EXACT STATE

- Starting feature commit: `86afca17927d490ef63c00849a70a7bdf130a7d9`
- Implementation commit: `3e64042c903026ebed3a0e5d8c42dc1e54f963d8`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Dedicated Pages commit: `2ad0eca84f7c47f44cd67f61c1b50fad2ed2a8a3`
- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-9f41cbe47b57`
- Bytes: `12,270,994`
- SHA-256: `170b85d3ed08d1e995d1e37f8634f7f81cd5e01c7478c61b277005d8b12c5595`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=2ad0eca`
- Live download: byte-identical to the local accepted artifact.
- Pages scope: only `blockfolk-imaginarium/index.html` changed. The fetched Pages root remained byte-identical at SHA-256 `c27a8e4dadc7e2d94ad1c94f85d6316d0a8ad6ee9a00b05b2024c675df34e456`.

## REMAINING BLOCKERS

None in automated verification. Physical-phone testing remains the authority for subjective placement feel and for confirming that a particular finger gesture lands on the intended nearby construction piece in a crowded scene.

## NEXT ACTIONABLE STEP

On the phone, move one compatible piece near another and press **Snap** once. Confirm the message says **Snapped and locked**, the button changes to **Unsnap**, and dragging either piece moves both together.

## EVIDENCE

- Ignored pre-edit backups: `test-results/snap-lock-001/`.
- Ignored local and live phone proof: `examples/blockfolk-imaginarium/test-results/snap-lock-001/`.
- Rendered snap proof: `terrain-isometric-snap-400x844.png` in each local/live evidence directory.

**PASS — explicit Snap now reports success only after the pieces are stored as one locked assembly.**
