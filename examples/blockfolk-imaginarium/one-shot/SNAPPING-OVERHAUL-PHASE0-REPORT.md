# BlockFolk Snapping Overhaul — Phase 0 Report

Status: **FAIL — awaiting physical Samsung acceptance**

## Release identity

- Starting feature commit: `06e900b5cf717ce883acb77a4ac11fdfc3caadb4`
- Implementation commit: `35a94904e83bf5f68212503493c8341fd6ada501`
- Pushed branch: `feature/blockfolk-imaginarium-001`
- Starting Pages commit: `e981cc5c1b75c7bb170e503505b67964b8024264`
- Pages commit: `0897bb987421818eddfd53c166c361e5ff29282c`
- Live phone URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=0897bb9-3`

## What changed

- Reverted the failed doorway-specific geometry and its circular six-piece rendered acceptance scenario without reverting the stable contextual controller.
- Disabled creation of new Wooden Door and Stone Door connections. No centered door-over-block fallback is available.
- Retained failed doorway and historical door-overlay endpoint IDs as validation-only metadata. Existing page@3 connection records still load; validation-only anchors cannot participate in candidate generation.
- Preserved generic snapping for all ten blocks and both windows, component operations, save/reload, camera, puzzle, export, emoji, both backgrounds, and the 30-sticker catalog.
- Kept one permanent `snap-context` DOM node/controller. Native touch still creates one block connection after one activation, remains locked after 900 ms, changes in place to Unsnap, and deliberately detaches once with `Sticker detached.`
- Marked the former Stone Doorway report physically failed and superseded. The large doorway-specific implementation and test were removed rather than carried forward as compatibility slop.

## Artifact

- Path: `examples/blockfolk-imaginarium/dist/index.html`
- Build ID: `blockfolk-imaginarium-e1fdbbfc5738`
- Size: `12,273,880` bytes
- SHA-256: `93918d0ce2b87ea9fd20001586ed9dadb7011abedfae1e71c91f80e75ea73df4`
- Determinism: two canonical packs produced identical bytes and SHA-256.
- Live identity: downloaded Pages HTML is byte-identical to the accepted local artifact.

## Verification

| Lane | Result |
|---|---|
| Focused source and static audit | PASS |
| Lint and typecheck | PASS |
| Complete repository tests | PASS — 46 files; 316 passed, 2 skipped |
| SFHS inspect / validate / test | PASS — zero findings |
| SFHS changed-path check | PASS — known path-map review warning; lint, typecheck, and full unit steps passed |
| SFHS pack / exact verify | PASS — zero findings |
| Packed/offline identity and asset audit | PASS |
| Deterministic double pack | PASS |
| Local Chromium, `400 × 844` and `844 × 400` | PASS — zero console errors, page errors, or unexpected requests |
| Live Chromium, `400 × 844` and `844 × 400` | PASS — zero console errors, page errors, or unexpected requests |
| Native touch stable-controller regression | PASS — one activation/edge after 900 ms; same DOM node/control ID; one deliberate Unsnap |
| Door Phase 0 gate | PASS — same controller remains mounted, but new door snapping is disabled and creates zero connections |

## Isolation proof

- Original Imaginarium tree: `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`; no changed tracked path.
- Original Imaginarium artifact: `10,349,547` bytes; SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`.
- Production Valley WebP: SHA-256 `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`.
- Classic Valley PNG: SHA-256 `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`.
- Pages root `index.html`: SHA-256 `c27a8e4dadc7e2d94ad1c94f85d6316d0a8ad6ee9a00b05b2024c675df34e456`, unchanged.
- Pages commit changes only `blockfolk-imaginarium/index.html`. Ueye and unrelated products are untouched.

## Physical gate

On the Samsung, confirm this honest baseline before Phase 1:

1. Generic block-to-block Snap still activates only on a deliberate Snap press and remains locked while either member is dragged.
2. Unsnap occurs only on a later deliberate press; it does not fire immediately after Snap.
3. Selecting Wooden Door or Stone Door cannot report a new successful snap or overlay the door on a block.
4. Window snapping and ordinary editing remain usable.

Automated Phase 0 is accepted. Overall release status remains **FAIL — awaiting physical Samsung acceptance**. No typed-port engine, calibration harness, page@4 migration, doorway formation, or later phase was started.
