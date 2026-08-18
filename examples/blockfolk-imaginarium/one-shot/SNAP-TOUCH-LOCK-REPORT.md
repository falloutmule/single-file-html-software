# BlockFolk Snap Touch Lock 002

## WHAT WAS DONE

- Disabled Fabric's independent native object movement for every sticker. BlockFolk's pointer system is now the sole owner of sticker and assembly dragging.
- Replaced incremental movement from mutable object positions with absolute movement from immutable gesture-start positions.
- Pointer-up reapplies the complete connected component from those origins before committing. A second touch transform can no longer pull only the touched sticker away while leaving the logical connection behind.
- Clamping now corrects the complete assembly by one shared offset, preserving its internal geometry at world edges.
- A snapped door or window is moved above its supporting block in z-order so the attached face remains visible.
- The prior transactional connection validation, explicit Snap command, and `Snapped and locked` / Unsnap behavior remain in place.

## WHAT WAS VERIFIED

- The pre-repair build was made to reproduce the reported failure deterministically: after BlockFolk moved a two-piece assembly, a simulated competing single-object touch transform displaced only the active member. The old pointer-up committed unequal member deltas and the regression failed.
- The repaired build overwrites that single-member drift on pointer-up. Both assembly members finish with identical world-space deltas.
- A Chrome DevTools Protocol native-touch drag also moves both members by the identical delta.
- The exact photographed Stone Door / Brick Block case now proves: no auto-snap during drag, at least 60 CSS pixels of visible movement on Snap, painted-face registration, one two-member assembly, Snap hidden, Unsnap shown, and the Stone Door rendered above the Brick Block.
- Local and live HTTPS Chromium pass at `400 × 844` and `844 × 400`, with zero console errors, page errors, or unexpected requests.
- Focused source/static tests and packed audit: PASS.
- Lint and typecheck: PASS. Complete repository suite: 46 files passed; 316 tests passed and 2 skipped.
- SFHS inspect, validate, check, pack, and exact verify: PASS. The known changed-path review warning is covered by the explicit product source, native-touch, rendered-phone, and packed lanes.
- Two canonical packs are byte-identical.
- Original Imaginarium tracked files are unchanged; its accepted artifact remains 10,349,547 bytes with SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`. Ueye is untouched.

## WHAT FAILED

The previous repair validated only the connection graph. It did not prevent Fabric's still-enabled native touch transform from moving the active Fabric object independently of BlockFolk's connected-component movement. That explains the physical report: the data could remain “locked” while the touched artwork visibly separated immediately.

The building-face test also used a favorable object order. In the photographed reverse order, the Brick Block could cover the snapped Stone Door, making a successful face attachment visually disappear.

## CURRENT EXACT STATE

- Starting feature commit: `809aea69fd24af829dd28d0336f5ab365dddd46a`
- Implementation commit: `cc2f8ed59ba057bde02c4fe25da2c5ad953b90fe`
- Pushed branch: `origin/feature/blockfolk-imaginarium-001`
- Pages commit: `0f0f390328db287aed174d0a5d94d183a9f5e776`
- Artifact: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-e1aaca287e0c`
- Bytes: `12,271,836`
- SHA-256: `00ffedbe9c2258bc6782f79282e8ac042696c4a058f4e8b6fccddd2a447c0a90`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=0f0f390`
- Live download: byte-identical to the accepted local artifact.
- Pages scope: only `blockfolk-imaginarium/index.html` changed. The fetched Pages root remained unchanged at SHA-256 `c27a8e4dadc7e2d94ad1c94f85d6316d0a8ad6ee9a00b05b2024c675df34e456`.

## REMAINING BLOCKERS

None in automated verification. A physical Samsung retest remains the authority for the original touch sequence, because the defect appeared specifically on that handset's real browser event path.

## NEXT ACTIONABLE STEP

Open the cache-busted live URL, place a Stone Door near a Brick Block, press Snap once, and drag either visible piece. The toolbar must show Unsnap and both pieces must remain together.

## EVIDENCE

- Ignored pre-edit backups and failing reproduction: `test-results/snap-touch-lock-002/`.
- Local and live phone proof: `examples/blockfolk-imaginarium/test-results/snap-touch-lock-002/`.
- Exact rendered case: `stone-door-brick-block-locked-400x844.png` in the local and live evidence directories.

## GITHUB PAGES URL

`https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=0f0f390`

**PASS — the shipped touch path now keeps snapped artwork rigid instead of preserving only a logical connection.**
