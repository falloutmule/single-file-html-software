# SFHS-011B — Pixi-native runtime contract

## Goal

Establish one SFHS-owned Pixi game chassis without introducing Canvas compatibility.

## Allowed files recorded before editing

- `packages/pixi-runtime/**`
- `adapters/pixi-v8/src/index.ts`
- `adapters/pixi-v8/package.json`
- `packages/contracts/src/project-manifest.ts`
- `packages/contracts/schemas/sfhs.project.schema.json`
- `packages/contracts/src/index.test.ts`
- `examples/pixi-runtime-native/**`
- `pnpm-lock.yaml`
- this report and its machine-readable evidence

## Forbidden files

- preserved HOMEOSTASIS source, artifacts, reports, and evidence
- Pages checkout and publication configuration
- SNC files
- importer/classifier code
- Canvas compatibility or conversion code
- remotes, release artifacts, and existing generated `index.html` files

## What was done

- Added the typed `@sfhs/pixi-runtime` lifecycle, action, viewport, snapshot, diagnostics, and presentation boundaries.
- Added an SFHS-owned Pixi v8 application/stage implementation with one canvas and the standard layer hierarchy.
- Added fixed and adaptive viewport schema modes with extensible scale policies.
- Added a Pixi-native fixture whose game owns neither the Pixi application nor browser frame loop.

## What was verified

- Scoped lint and TypeScript checks pass.
- Four focused test files pass with 17 tests covering contracts, fixed-step ownership, semantic input, resize, pause/resume, diagnostics, and cleanup.
- The complete repository test suite passes with 125 tests and two intentional skips.
- The fixture snapshot is frozen and renderer-neutral.

## What failed

The initial sandboxed pnpm attempt failed with Windows `EPERM` before tests ran. The approved identical offline/scoped commands ran successfully. No implementation test remains failed.

## Current exact state

Branch `codex/sfhs-011b-pixi-runtime`, based on verified `2d604d4138403cf094134d4a2a2f6b587f721bbc`.

## Remaining blockers

HOMEOSTASIS Pixi presentation, compatibility conversion, physical Samsung acceptance, and release remain outside this card.

## Next actionable step

Review this bounded runtime contract together with SFHS-011A and SFHS-HOMEOSTASIS-013A.

## Branch and commit

Implementation commit: `a4c20cc8fd3e83f3bea731fb83222d26907f93b9`.

## Changed files

See allowed-file list and final commit.

## Commands and results

- `pnpm install --lockfile-only --offline` — PASS.
- `pnpm exec eslint packages/pixi-runtime adapters/pixi-v8 examples/pixi-runtime-native packages/contracts/src/project-manifest.ts packages/contracts/src/index.test.ts` — PASS.
- `pnpm run typecheck` — PASS.
- `pnpm exec vitest run packages/pixi-runtime/src/index.test.ts examples/pixi-runtime-native/src/game.test.ts packages/contracts/src/index.test.ts adapters/pixi-v8/src/index.test.ts` — PASS, 17 tests.
- `pnpm run test` — PASS, 123 tests and two intentional skips.

## Evidence paths

- `docs/evidence/SFHS-011B-PIXI-RUNTIME-CONTRACT.md`
- `docs/evidence/sfhs-011b/runtime-contract.json`

## Hashes

Base commit: `2d604d4138403cf094134d4a2a2f6b587f721bbc`. Final commit recorded in Git history.

## Verdict

`AUTOMATED_PASS`

HOMEOSTASIS presentation remains `NOT_STARTED`; renderer migration remains `MIGRATION_REQUIRED`; physical Samsung remains `BLOCKED_ON_PHYSICAL_SAMSUNG`; final release remains `BLOCKED`.
