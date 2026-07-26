# SFHS-011I — Phase 1 generic integration

## Goal

Create one local SFHS integration baseline containing the completed generic renderer-classification and Pixi-runtime contracts. No Canvas conversion, HOMEOSTASIS presentation, publication, or remote change is included.

## What was done

- Created `codex/sfhs-phase2-integration` from canonical base `2d604d4138403cf094134d4a2a2f6b587f721bbc`.
- Preserved both parent histories with non-fast-forward merges: first SFHS-011A, then SFHS-011B.
- Resolved the sole predicted conflict, `pnpm-lock.yaml`, by regenerating it offline from the combined workspace manifests.
- Retained the generic `@sfhs/renderer-classifier`, `@sfhs/pixi-runtime`, Pixi adapter extension, adaptive viewport contract, native Pixi fixture, and both original evidence packets.

## What was verified

- **verified:** both parent tips are direct merge parents and their reports remain unchanged.
- **verified:** `pnpm install --frozen-lockfile --offline` succeeds for all 15 workspace projects.
- **verified:** scoped lint and TypeScript checks pass.
- **verified:** renderer classification tests pass: 14/14.
- **verified:** the preserved HOMEOSTASIS fixture remains `MIXED_REDUNDANT`, primary `CANVAS_2D`, non-meaningful secondary `PIXI`, with `BLOCKED_ON_ADAPTER_MISMATCH`.
- **verified:** Pixi runtime, lifecycle, adaptive viewport, contract, adapter, and native-fixture tests pass: 17/17.
- **verified:** full integration suite passes: 139 tests, 2 intentional skips.
- **verified:** Chromium Pixi smoke produces a self-contained artifact, reaches running state, and records no external requests or findings.

## What failed

The first sandboxed Vitest attempts could not create Vite's temporary config directory. The identical focused tests were rerun with permission limited to the isolated worktree and passed. No source or test failure remains.

The historical HOMEOSTASIS root-lint issue remains unresolved and was not edited. It is absent from this generic integration branch because the preserved HOMEOSTASIS evidence directory is intentionally not merged here; the passing root check is not evidence that the historical issue was repaired.

## Current exact state

- Branch: `codex/sfhs-phase2-integration`
- Integration HEAD before this report commit: `843a16b05a8f17c70fe773dc15e36add46fb2f57`
- Parent merges: `ff520867ad3521a0ce2f05b4481dd0907becbfbd` and `843a16b05a8f17c70fe773dc15e36add46fb2f57`
- No HOMEOSTASIS-specific logic is present in the generic packages.

## Remaining blockers

- Canvas capability analysis and compatibility conversion are not started.
- HOMEOSTASIS remains a Canvas2D primary presentation and `BLOCKED_ON_ADAPTER_MISMATCH`.
- Physical Samsung Galaxy S21 Ultra acceptance and final release remain blocked.

## Next actionable step

After review, release only the separately bounded `SFHS-012A` Canvas capability analyzer and `SFHS-012B0` compatibility contract lanes.

## Branch and commit

- Base: `2d604d4138403cf094134d4a2a2f6b587f721bbc`
- SFHS-011A parent: `87672049133c60831b3241b1a181380ce6930741`
- SFHS-011B parent: `0b6712518569984a5960081e98cd6d66f619077c`
- Merge commits: `ff520867ad3521a0ce2f05b4481dd0907becbfbd`, `843a16b05a8f17c70fe773dc15e36add46fb2f57`

## Changed files

This integration retains both parent branches' changed files. The only conflict resolution was the mechanically regenerated `pnpm-lock.yaml`; this report and its machine-readable evidence are the only new integration-specific files.

## Commands and results

- `pnpm install --lockfile-only --offline` — PASS
- `pnpm install --frozen-lockfile --offline` — PASS
- scoped ESLint — PASS
- `pnpm run typecheck` — PASS
- classifier focused Vitest — PASS, 14 tests
- Pixi runtime focused Vitest — PASS, 17 tests
- `pnpm browser-smoke` — PASS
- `pnpm run test` — PASS, 139 passed and 2 skipped
- `pnpm run check` — PASS

## Evidence paths

- `docs/evidence/SFHS-011A-RENDERER-CLASSIFICATION.md`
- `docs/evidence/sfhs-011a/homeostasis-classification.json`
- `docs/evidence/SFHS-011B-PIXI-RUNTIME-CONTRACT.md`
- `docs/evidence/sfhs-011b/runtime-contract.json`
- `docs/evidence/sfhs-011i/integration.json`

## Hashes

- Combined lockfile: `71876caca3c02584eb475e896910d6d55ffdc4ddc35bed980c130ee83bfa41da`
- Renderer classifier implementation: `4cde3c4bf0a412a4793745eee7df1c2956d48331f8d52faaf2a229d4d797e036`
- Pixi runtime implementation: `db0d729deb938e68ccf0a75636824e1baad66ae3db73c66a6b2dc7b126148772`
- Chromium smoke artifact: `9802b0da147789e3c76436ad4335f496de99bd215ff0d4548c533e47c02b0b9e`

## Verdict

`AUTOMATED_PASS`

The generic Phase 1 integration is accepted. HOMEOSTASIS conversion remains `MIGRATION_REQUIRED`; physical Samsung and final release remain blocked.
