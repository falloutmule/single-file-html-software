---
{"schema":"sfhs.one-shot-report@1","status":"VERIFIED","facts":{"artifact":{"classification":"canonical","path":"dist/index.html","sha256":"5ab0f8eee0098b89759718fc10b24ab65a30d856ee26362d39b8c0012acb4b14","buildId":"blockfolk-imaginarium-b7ef8a62c5b3"},"physicalDevice":"UNTESTED"}}
---
# Grid-Snap Recovery Phase 0 Verification Report

Local recovery verification is complete against `blockfolk-imaginarium-b7ef8a62c5b3` (12,279,999 bytes; SHA-256 `5ab0f8eee0098b89759718fc10b24ab65a30d856ee26362d39b8c0012acb4b14`). Physical Samsung acceptance remains untested, so this report does not set `PHASE_0_RECOVERY: PASS`.

## Passed local lanes

- Source-focused scenarios, historical fixture canonical hashes, and static offline audit.
- Root lint, typecheck, repository tests, and browser smoke through `sfhs check`.
- SFHS inspect, validate, build, test, check, pack, and exact verify.
- Full BlockFolk browser scenario: controller exact-once proofs, page@3 save/reload, connected assembly movement, deliberate Unsnap, ordinary Door/Window behavior, catalog/emoji/camera/puzzle/PNG/storage coverage, portrait 400×844, and landscape 844×400.
- Page@4 browser boundary: zero read-write transactions across gallery rendering/open/camera/PNG/close/reopen, unchanged IndexedDB version/key/schema/timestamps/deep contents, canonical hash `c265065b580daebeddb353bbe45ee50090a775620bcae067bbc4ff20c33a798f`, fail-closed malformed record, and zero unexpected requests/errors.

## Evidence

- `test-results/production-catalog-001/local/`
- `test-results/grid-snap-recovery-phase0/page4-read-only/`
- `tests/fixtures/historical/manifest.json`

## Publication gate

- Recovery source commit: `c36d7574bf50d91184fe992ad9da23c39d0a4c06`
- Published Pages commit: `f7e15856d76009f1783d4b7b922b9d5b3da183a5`
- Live URL: `https://falloutmule.github.io/single-file-html-software/blockfolk-imaginarium/index.html?phase0=f7e1585`
- Local/Pages-blob/live identity: 12,279,999 bytes; SHA-256 `5ab0f8eee0098b89759718fc10b24ab65a30d856ee26362d39b8c0012acb4b14`
- Pages diff: only `blockfolk-imaginarium/index.html`
- Unrelated Pages tree-listing SHA-256 before/after: `7b5b94f761c802e1185b1fa312ac38f4901a7056a5907f3865a17f183221ead1`
- Live Chromium: portrait 400×844 and landscape 844×400 passed; zero console errors, page errors, and unexpected requests.

## Current independent results

- `PHASE_0_RECOVERY: FAIL` — Samsung verdict is still required against the exact published artifact hash.
- `GRID_CONSTRUCTION_ROADMAP: PENDING`
