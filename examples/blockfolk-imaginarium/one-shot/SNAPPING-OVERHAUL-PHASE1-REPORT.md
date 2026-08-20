# BlockFolk Snapping Overhaul — Phase 1 Report

Status: **PASS**

## WHAT WAS DONE

- Added versioned, renderer-neutral profile, transform, port, connection-checker, candidate-search, graph, and transaction modules under `src/model/snap/`.
- Enumerated all ten block IDs, both doors, and both windows. Their real profile shells are uncalibrated and production-disabled.
- Grouped raw compatible port pairs by equivalent final transform before scoring. Supporting correspondences strengthen one pose, but each planned Snap stores exactly one canonical edge.
- Added centralized provisional policy values clearly marked uncalibrated; no scattered production constants or replacement of the existing 80-pixel compatibility path.
- Added a frozen packed diagnostic boundary: `page@3-compatibility`, schema versions `1`, zero production-enabled typed profiles.
- Kept `ImaginariumApp.js` orchestration on the accepted compatibility model. No door, persistence, formation, or visual behavior changed.

## WHAT WAS VERIFIED

- Independent fixtures cover source-to-local/world/viewport transforms, Flip normals and wall-plane mapping, reciprocal types, orientation, opposing normals, scale tolerance, capacity, duplicate pairs, same-component rejection, finite relative transforms, deterministic candidate selection, distinct-pose ambiguity, and screen/world separation.
- Two matching port pairs that imply one transform produce one pose, two supporting correspondences, one deterministic canonical pair, and one transaction edge.
- Transaction planning is immutable and rejects changed connection counts or sticker transforms as stale.
- Graph coverage includes validation, adjacency, loop-safe BFS, selected-member Unsnap splits, fresh-ID cloning, and generated chains up to 20 members with reversed endpoints/order.
- The permanent controller and current block/window snapping pass the unchanged native-touch browser regression.

## WHAT FAILED

- No product or verification failure remains. SFHS `check` emits its established path-map review warning; explicit product source, static, packed, and browser lanes cover the changed paths.

## CURRENT EXACT STATE

- Starting commit: `5111da10beb902a00ed3e7da96e5472d18170542`
- Implementation commit: `44413de1079401a633ca88f054ab0d95b6bc285c`
- Pages commit: `e343c0c5741e26ae1325d83374dec10525d58353`
- Branch: `feature/blockfolk-imaginarium-001`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?v=e343c0c-1`
- Build ID: `blockfolk-imaginarium-c1d4b89dc6f8`
- Artifact: `12,275,714` bytes; SHA-256 `7cbe5c67fb2cd3e2dbadc12f6e172b22f24da10724b65e2225cba9db17531842`
- Live artifact: byte-identical.

## EVIDENCE

| Lane | Result |
|---|---|
| Focused source/static and renderer-neutral core | PASS |
| Lint and typecheck | PASS |
| Complete repository tests | PASS — 46 files; 316 passed, 2 skipped |
| SFHS inspect/validate/test/check/pack/verify | PASS; one known path-map warning |
| Packed/offline audit | PASS |
| Deterministic double pack | PASS |
| Local/live phone Chromium | PASS at `400 × 844` and `844 × 400`; zero runtime requests/errors |

Integrity: Original Imaginarium tree `1369fc6e6e76bb204a9cfaf99cb6cb4f3c69d5a7`; original artifact SHA-256 `85ab852ea947b7132877650725cd966383da3a8dfc09dabc4ec70597d5b1a75b`; production Valley `25b795d7b9914b56bd2dfb4a444594f63f4146d8490dd0127850b749b4a2c25c`; Classic Valley `72cc98a59b8d4e123f720a84aa1782a3e7928d0697c54f28244562f5683088eb`; 30-sticker hash-list aggregate `7faf96032388e45cafb132bc548f3335b85c039c213ff471764c6d59b64d149b`; Pages root unchanged.

Failure modes guarded: A, B, C, D, F, Q, S, and T directly; H, I, K, M, N, and P through the unchanged phone browser regression.

## NEXT ACTIONABLE STEP

Phase 2: build the non-shipping calibration harness and derive reviewed Brick/Log visible bounds, origins, wall-plane basis, ports, and canonical insertion scale without enabling production snapping.
