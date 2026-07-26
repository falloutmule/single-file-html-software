# SFHS-001B - Project and Evidence Schemas

**Date:** 2026-07-20  
**Status:** PASS  
**Autonomy used:** bounded local contract, fixture, test, and documentation changes; local dependency installation only

## Goal

Define the first versioned SFHS project, artifact, and evidence manifests with deterministic serialization and stable validation findings.

## Delivered contract surface

- `sfhs.project@1`, `sfhs.artifact@1`, and `sfhs.evidence@1` JSON Schema 2020-12 documents under `packages/contracts/schemas/`.
- Public manifest validators, canonical JSON helpers, and finding types in `@sfhs/contracts`.
- Stable finding codes for malformed schema, unknown fields, unknown adapters, invalid paths, and forbidden runtime URLs.
- Valid fixtures for all three manifest types and focused negative fixtures for each policy boundary.
- `ajv@8.17.1` pinned as the contracts package's schema validator.

## Policy decisions encoded

- The only known adapter at this point is `pixi-v8`; other structurally valid adapter IDs report `SFHS_ADAPTER_UNKNOWN`.
- Source paths must remain project-relative and cannot enter `.git`, `dist`, `evidence`, or `node_modules`; build output must be below `dist/`.
- Runtime external URLs are structurally representable for an explicit diagnostic, but any non-empty list reports `SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN`.
- Unknown project properties are warnings in development validation, enabling forward-compatible authored manifests. They are errors in release validation. Other schema violations are always errors.
- Canonical JSON accepts only JSON values, sorts object keys recursively, and rejects non-finite numbers and non-JSON object values.

## Verification

```text
pnpm.cmd install --reporter=append-only
pnpm.cmd exec vitest run packages/contracts/src/index.test.ts
pnpm.cmd check
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

Observed results:

- Focused contracts gate: 1 test file and 7 tests passed.
- `pnpm.cmd check`: ESLint, strict TypeScript, and all 9 workspace test files passed (15 tests total).
- Frozen offline install: passed with `Already up to date` using pnpm `11.9.0`.
- Dependency scan: no PixiJS, Phaser, or Three.js package was introduced.

## Scope held

- No project discovery, filesystem containment, symlink handling, or SHA-256 utility was added; those belong to SFHS-001C.
- No CLI command, builder, packer, verifier, browser runner, PixiJS runtime, Codex plugin, Hermes adapter, marketplace, or remote was added.
- No SNC source, names, assets, runtime behavior, or tests were read or changed.
- No commit, push, pull request, release, or plugin installation occurred.

## Current repository state

```text
repository: C:/Users/fallo/Documents/SFHS
branch: main
remote: none
commit authority: not granted
working tree: all scaffold and SFHS-001B files remain uncommitted
```

## Next actionable step

Assign `SFHS-001C - Core discovery, path, and hash utilities` as one bounded card. It must consume these public contracts without widening their scope.
