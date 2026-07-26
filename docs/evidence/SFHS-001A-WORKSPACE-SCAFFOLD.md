# SFHS-001A — Minimal Workspace Scaffold

**Date:** 2026-07-20  
**Status:** PASS  
**Autonomy used:** bounded local writes and dependency installation; no remote mutation

## Goal

Create the smallest reusable SFHS monorepo baseline with explicit package boundaries, strict TypeScript, linting, placeholder tests, a committed pnpm lockfile, and minimal continuous integration.

## What was created

- Root pnpm workspace with eight packages and one PixiJS adapter boundary.
- Root TypeScript, ESLint flat-config, Vitest, Git ignore, MIT license, and README baselines.
- One `src/index.ts` plus one passing placeholder test for each package boundary.
- Minimal GitHub Actions quality workflow that installs from the lockfile and runs `pnpm check`.
- `pnpm-lock.yaml` generated from pinned development-tool versions.

## Package boundaries

```text
@sfhs/contracts
@sfhs/core
@sfhs/builder
@sfhs/packer
@sfhs/verifier
@sfhs/browser-runner
@sfhs/evidence
@sfhs/cli
@sfhs/adapter-pixi-v8
```

The Pixi adapter is a package boundary only. It does not yet contain PixiJS, renderer, asset, input, viewport, or runtime code.

## Toolchain lock

| Tool | Locked version |
|---|---|
| pnpm | `11.9.0` |
| TypeScript | `5.9.3` |
| Vitest | `4.1.10` |
| ESLint | `9.39.5` |
| typescript-eslint | `8.64.0` |

TypeScript 5.9 was selected for mature compatibility with the lint and test stack rather than adopting the newly released TypeScript 7 line during the first scaffold.

## What was verified

```text
pnpm.cmd install --reporter=append-only
pnpm.cmd check
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

Results:

- The initial install generated `pnpm-lock.yaml` and installed all 10 workspace projects.
- `pnpm check` passed linting, strict type checking, and 9 tests.
- Frozen, offline install completed with `Already up to date`.
- No `pixi.js`, Phaser, Three.js, Codex plugin, marketplace, MCP, or runtime asset dependency was added.

## What was not done

- No schemas, project discovery, hashing, CLI command, builder, packer, verifier, browser runner, Pixi runtime, Codex plugin, or Hermes adapter implementation.
- No source, asset, test, or configuration file was read from or written to the SNC workspace.
- No commit, push, pull request, marketplace installation, or remote workflow execution.

## Current exact state

```text
repository: C:/Users/fallo/Documents/SFHS
branch: main
remote: none
workspace packages: 9
lockfile: present
quality gate: PASS (9 tests)
next cards: SFHS-001B and SFHS-001C
```

## Next actionable step

Assign either `SFHS-001B — Project and evidence schemas` or `SFHS-001C — Core discovery, path, and hash utilities` as one bounded task. They may proceed in parallel only when each task owns its declared package files.
