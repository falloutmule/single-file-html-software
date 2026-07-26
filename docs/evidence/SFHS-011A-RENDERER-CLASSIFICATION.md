# Goal

Implement static and runtime renderer classification that proves the real primary presentation and fails closed. This card does not convert a renderer.

# What was done

## Pre-edit boundary record

- Repository: `C:\tmp\sfhs-011a`
- Branch: `codex/sfhs-011a-renderer-classification`
- Verified base HEAD: `2d604d4138403cf094134d4a2a2f6b587f721bbc`
- Verified initial status: clean
- Allowed files: `packages/renderer-classifier/**`, `docs/evidence/SFHS-011A-RENDERER-CLASSIFICATION.md`, `docs/evidence/sfhs-011a/**`, and `pnpm-lock.yaml` only for the package's existing Playwright dependency registration.
- Forbidden files: all existing adapters, contracts, CLI, browser runner, examples, generated artifacts, preserved HOMEOSTASIS worktree/evidence, Pages checkout, SNC, remotes, and all other worktrees.
- Baseline commands: `git status --short --branch`, `git rev-parse HEAD`, repository `AGENTS.md` read, and repository inventory with `rg --files`.

The new `@sfhs/renderer-classifier` package provides:

- static evidence inventory for Canvas2D, WebGL/WebGL2, Pixi initialization, SVG, DOM animation, canvas creation, animation frames, render intervals, and known entrypoints;
- pre-navigation browser instrumentation for context acquisition, meaningful draw calls, clear-only activity, dimensions, style, stacking, hit testing, event evidence, resize evidence, and frame ownership fields;
- fail-closed primary-surface scoring based on combined runtime evidence;
- the exact classification and verdict vocabularies required by the handoff;
- a JSON Schema for durable classification reports;
- ten requested renderer scenarios plus declaration-override and preserved-HOMEOSTASIS regression coverage.

# What was verified

- verified: Canvas2D-only returns `CANVAS_2D / MIGRATION_REQUIRED`.
- verified: a meaningful Pixi surface returns `PIXI / ANALYSIS_PASS`.
- verified: DOM, SVG direction, and generic WebGL do not receive Pixi acceptance.
- verified: multiple equally meaningful canvases return `BLOCKED_ON_RENDERER_AMBIGUITY`.
- verified: a canvas that never changes and a clear-only canvas fail closed.
- verified: a hidden Canvas2D surface cannot override visible meaningful Pixi.
- verified: manifest/source Pixi declarations cannot override runtime Canvas2D evidence.
- verified: a real Chromium fixture records Canvas2D draws and a clear-only WebGL surface, then returns `BLOCKED_ON_ADAPTER_MISMATCH`.
- verified: the preserved HOMEOSTASIS fixture returns primary `CANVAS_2D`, secondary `PIXI` with no meaningful contribution, relationship `MIXED_REDUNDANT`, verdict `BLOCKED_ON_ADAPTER_MISMATCH`.

# What failed

- verified: the first sandboxed `pnpm install --frozen-lockfile --offline` could not create temporary dependency files (`EPERM`). It was rerun with narrowly scoped worktree permission.
- verified: the first frozen retry correctly rejected the newly declared package dependency because the lockfile needed registration. The lockfile was updated offline using the already locked Playwright `1.61.1` version.
- verified: the first Chromium test used `page.setContent`, which does not execute the pre-navigation init script. The fixture was corrected to navigate to a self-contained data document; the instrumentation and test then passed.
- untested: physical Samsung behavior is outside this analysis-only card.
- inferred: the previously reported root-check ignored-evidence lint issue does not exist in this canonical-base worktree because preserved HOMEOSTASIS evidence is not part of this branch. No historical evidence was changed or deleted.

# Current exact state

- verified: implementation is isolated to the allowed file list.
- verified: no renderer conversion or Canvas compatibility API exists.
- verified: the classifier reports analysis only; it never claims conversion.
- verified: no push, publication, merge, remote change, or Pages modification occurred.

# Remaining blockers

- proposed: integrate this package into the importer/scaffold only in a later authorized task.
- proposed: future runtime evidence runners may add independent screenshot-region pixel differencing; the contract already records changed-pixel evidence supplied by the runner.
- verified: HOMEOSTASIS remains `BLOCKED_ON_ADAPTER_MISMATCH`.

# Next actionable step

Review SFHS-011A alongside the independent SFHS-011B and SFHS-HOMEOSTASIS-013A lanes. Do not start SFHS-012A, SFHS-012B, SFHS-012C, or HOMEOSTASIS-013B from this branch.

# Branch and commit

- Branch: `codex/sfhs-011a-renderer-classification`
- Base: `2d604d4138403cf094134d4a2a2f6b587f721bbc`
- Implementation commit: `fd658db07261400d79c2df6355ee8605a472144b`.

# Changed files

- `packages/renderer-classifier/package.json`
- `packages/renderer-classifier/schemas/sfhs.renderer-classification.schema.json`
- `packages/renderer-classifier/src/index.ts`
- `packages/renderer-classifier/src/index.test.ts`
- `packages/renderer-classifier/src/runtime.test.ts`
- `packages/renderer-classifier/fixtures/homeostasis-dual-render.json`
- `docs/evidence/sfhs-011a/homeostasis-classification.json`
- `docs/evidence/SFHS-011A-RENDERER-CLASSIFICATION.md`
- `pnpm-lock.yaml`

# Commands and results

- `pnpm install --no-frozen-lockfile --offline` — verified PASS; reused the existing locked Playwright version.
- `pnpm exec eslint packages/renderer-classifier` — verified PASS.
- `pnpm exec tsc --noEmit` — verified PASS.
- `pnpm exec vitest run packages/renderer-classifier/src/index.test.ts packages/renderer-classifier/src/runtime.test.ts` — verified PASS, 2 files and 14 tests.
- `pnpm exec vitest run packages/browser-runner/src/index.test.ts packages/browser-runner/src/pixi-scenarios.test.ts` — verified PASS, 4 tests passed and 2 environment-gated tests skipped; existing Pixi browser-runner fixtures remain accepted.
- `git diff --check` — verified PASS.

# Evidence paths

- Schema: `packages/renderer-classifier/schemas/sfhs.renderer-classification.schema.json`
- Preserved-arrangement fixture: `packages/renderer-classifier/fixtures/homeostasis-dual-render.json`
- Machine report: `docs/evidence/sfhs-011a/homeostasis-classification.json`
- Technical report: `docs/evidence/SFHS-011A-RENDERER-CLASSIFICATION.md`

# Hashes

- verified preserved HOMEOSTASIS released artifact identity (read-only handoff input): `e8f94463a2851c322c395541cb47d7518ddce32e0870c77ab8c3dd889fb5e469`.
- verified canonical SFHS base: `2d604d4138403cf094134d4a2a2f6b587f721bbc`.
- classifier implementation: `4cde3c4bf0a412a4793745eee7df1c2956d48331f8d52faaf2a229d4d797e036`.
- classifier tests: `747b74647f4158319e9013df7fdac6c09f2613a48d8b3fbc19e1d6220f05c52c`.
- Chromium runtime test: `a3fb60d3775fee747d03cc1b2f083dac047cf8ea789d22ba7a61b52cd6d92630`.
- classification schema: `7ec4f3d7ac72e2e4b00fb775b4d9d68199bc32987efa663e19ec306468d0f144`.
- HOMEOSTASIS blocking fixture: `70151daeedf37a536176f44ced63b54ea381e8e6c52fd7fd5fd8ba5dce162b49`.
- HOMEOSTASIS machine report: `325c7e3064c3c5f9522129e8bd281840e5453bcdc74cb00378f5dc710e5bc29c`.

# Verdict

`AUTOMATED_PASS`

The classifier itself passes. The preserved HOMEOSTASIS renderer integration remains `BLOCKED_ON_ADAPTER_MISMATCH`.
