# SFHS-001C - Core Discovery, Path, and Hash Utilities

**Date:** 2026-07-20  
**Status:** PASS  
**Autonomy used:** bounded local core, test, dependency-lock, and documentation changes

## Goal

Provide host-neutral primitives for deterministic project discovery, safe project-contained file paths, and byte-accurate SHA-256 identity.

## Delivered core surface

- `discoverProject(startPath)` walks real parent directories and returns the nearest `sfhs.project.json` plus its real project root.
- `resolveProjectPath(projectRoot, projectRelativePath)` accepts only non-empty relative paths, rejects lexical traversal and absolute paths, and rejects targets whose existing symbolic-link ancestor resolves outside the real project root.
- Broken symbolic links are rejected rather than treated as safely contained.
- `sha256Bytes(bytes)` and `sha256File(filePath)` hash raw bytes only; neither function converts data through text.
- `SfhsCoreError` exposes stable codes for invalid starts, missing manifests, invalid roots, invalid paths, lexical escapes, and symbolic-link escapes.

## Dependency decision

`@types/node@24.13.3` is now a direct root development dependency. This matches the existing `node >=24.0.0` baseline and makes filesystem, path, crypto, and temporary-test typings explicit rather than inherited through Vitest.

## Test coverage

- Finds the nearest manifest from an authored source file when a higher-level manifest also exists.
- Returns `SFHS_PROJECT_MANIFEST_NOT_FOUND` when discovery reaches the filesystem root.
- Resolves a safe Windows-style relative source path and rejects lexical traversal and absolute paths.
- Creates an isolated temporary directory junction/symlink and verifies `SFHS_PATH_SYMLINK_ESCAPE` for an outward path.
- Hashes a binary byte sequence containing `0x00`, `0xff`, CR, LF, and ASCII identically in memory and on disk.

Temporary test directories are created under the operating system temp directory and removed after each test.

## Verification

```text
pnpm.cmd add -Dw @types/node@24.13.3 --reporter=append-only
pnpm.cmd exec vitest run packages/core/src/index.test.ts
pnpm.cmd check
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

Observed results:

- Focused core gate: 1 test file and 6 tests passed.
- Full workspace gate: ESLint, strict TypeScript, and all 9 workspace test files passed (20 tests total).
- Frozen offline install: lockfile accepted and completed with pnpm `11.9.0`.

## Scope held

- No contract schema, CLI command, builder, packer, verifier, browser runner, PixiJS runtime, Codex plugin, Hermes adapter, marketplace, or remote was added.
- No SNC source, names, assets, runtime behavior, or tests were read or changed.
- No commit, push, pull request, release, or plugin installation occurred.

## Next actionable step

Assign `SFHS-001D - Read-only CLI envelope` as one bounded card. It may use the contracts and core APIs above to implement only `doctor`, `inspect`, and `validate` with stable human and JSON output.
