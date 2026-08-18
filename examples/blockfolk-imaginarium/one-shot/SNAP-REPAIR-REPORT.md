# BlockFolk Snap Repair 001

## WHAT WAS DONE

- Changed the creation-time artwork default from six to ten exact Smaller steps below 420 world units: `420 / 1.1^10 = 161.855...`. Existing saved stickers keep their serialized scales.
- Added explicit painted `frontFace` anchors to construction blocks and painted `backFace` anchors to doors/windows. A door or window can now attach to a block's visible face as well as pieces continuing to join edge-to-edge.
- Raised the zoom-corrected snap tolerance from 30 to 44 CSS pixels.
- Made the pre-release target a restrained ring/line, with `Ready to snap` feedback before release and `Snapped together` after a persistent connection is made.

## WHAT WAS VERIFIED

- Source scenarios, lint, typecheck, all repository tests: PASS — 46 files, 316 passed, 2 skipped.
- SFHS inspect, validate, product test, pack, verify, and packed audit: PASS with no findings.
- Chromium at 400 × 844 and 844 × 400: PASS, zero console errors, page errors, or unexpected requests.
- Browser proof uses a real Log Block + Wooden Door placement: the pre-release preview reports `backFace` → `frontFace`, release creates one persisted connection, and the UI reports `Snapped together`.

## WHAT FAILED

The prior implementation only supplied four edge anchors. It could not express the visible block-face attachment shown by the phone use case, and its small target indicator did not make a proposed join clear enough.

## CURRENT EXACT STATE

- Local artifact: `dist/index.html`
- Build ID: `blockfolk-imaginarium-9db3838e1904`
- Bytes: `8,783,105`
- SHA-256: `aead3a14c9509c56659c3fc6f60e8c92298e9719d7f594c608af80c807ef6316`
- The accepted Valley WebP, catalog, categories, emoji behavior, original Imaginarium, and Ueye are unchanged.

## FAILURE-MODE GUARDS

Guarded: A (single artifact), B/C (static/packed audit), D/T (small scope), F (existing saves retain scale/schema), H/I/K/M/N (phone-sized pointer/orientation tests), Q (browser proof). N/A: E/G/O/P/R/S; this card does not change simulation rendering state, harness persistence, custom controls, modal flow, repository root organization, or secrets.

## REMAINING BLOCKERS

Physical Samsung acceptance remains required for real-finger snap feel and the new smaller default. Automated live proof is complete; the remaining question is subjective device feel.

## NEXT ACTIONABLE STEP

Test the cache-busted live URL on the Samsung device, concentrating on starting with a new Log Block or terrain block and attaching a Door/Window or another block.

## EVIDENCE

Ignored browser screenshot: `test-results/production-catalog-001/local/face-snap-preview-400x844.png`.

## GITHUB PAGES URL

Published feature commit: `958a094ec310524bb1f3a890029adbe670117247`.

Dedicated Pages commit: `9a03897a827de787558cb532ff9916a2bd868efc` (parent `1a24fef073fcc9140c59ba2e142e0b24702962e0`) changes only `blockfolk-imaginarium/index.html`.

Live cache-busted artifact: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=9a03897`

The live download is exactly 8,783,105 bytes with SHA-256 `aead3a14c9509c56659c3fc6f60e8c92298e9719d7f594c608af80c807ef6316`; live 400 × 844 and 844 × 400 Chromium pass with zero console errors, page errors, or unexpected requests. The Pages root remains 10,349,488 bytes with SHA-256 `7036de95bd8169dd43994eb2c78ea789476ccbd11a170312744b459d0ac4ea2e`.

**PASS — repair published and live verification complete.**
