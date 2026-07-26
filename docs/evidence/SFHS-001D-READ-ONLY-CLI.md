# SFHS-001D - Read-Only CLI Envelope

**Date:** 2026-07-20  
**Status:** PASS  
**Autonomy used:** bounded local CLI, test, Node-ESM compatibility, dependency-link, and documentation changes

## Goal

Expose the existing contracts and core utilities through the first stable, read-only SFHS CLI commands: `doctor`, `inspect`, and `validate`.

## Delivered CLI contract

```text
pnpm sfhs <doctor|inspect|validate> [--project <path>] [--json]
```

- All three commands discover `sfhs.project.json`, parse it, and release-validate it before they can return success.
- All three commands use the core containment utility to reject declared source, asset-manifest, public, and build paths that escape the real project root through traversal or symbolic links.
- `doctor` additionally verifies the Node.js 24-or-newer baseline.
- `inspect` reports discovered project identity; `validate` reports the same validated project envelope without mutating it.
- JSON output is canonical `sfhs.cli@1` with deterministic key order, stable finding codes, sorted findings, and no stderr content.

## Exit-code table

| Exit | Meaning |
|---|---|
| `0` | Command completed with no error-severity findings. |
| `1` | Project discovery, manifest parsing, contract, core-path, or doctor-runtime validation failed. |
| `2` | CLI arguments were invalid. |

No command reports success on a contract failure. The CLI contains no evidence-writing option and writes no project files.

## Node-native execution decision

The repository runs the authored TypeScript CLI with its existing Node.js `>=24.0.0` baseline:

```text
pnpm sfhs -> node packages/cli/src/main.ts
```

An attempted `tsx` development-runner addition was removed because the workspace supply-chain policy correctly blocked its `esbuild` build script. No policy was overridden. The lockfile retains Vite's optional `tsx` peer declaration through Vitest, but SFHS has no direct `tsx` dependency and the CLI does not invoke it. To let Node resolve the existing contracts source rather than duplicate validation logic, the contracts package now uses explicit `.ts` relative exports and JSON import attributes; validation behavior and schemas are unchanged.

## Test coverage

- Valid projects return a deterministic `sfhs.cli@1` JSON success envelope and leave the project directory unchanged.
- A forbidden runtime URL causes `inspect` to return exit `1` and `SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN`.
- Invalid CLI arguments return exit `2` and `SFHS_CLI_ARGUMENT_INVALID`.
- A manifest-free directory returns `SFHS_PROJECT_MANIFEST_NOT_FOUND`.
- A simulated Node 20 doctor run returns `SFHS_NODE_VERSION_UNSUPPORTED`.
- The real Node entry point and `pnpm sfhs` wrapper were exercised against `C:/tmp`; both returned the expected canonical missing-manifest envelope and exit `1`.

## Verification

```text
pnpm.cmd install --offline --ignore-scripts --reporter=append-only
pnpm.cmd exec vitest run packages/cli/src/index.test.ts
node packages/cli/src/main.ts inspect --json --project C:\tmp
pnpm.cmd sfhs inspect --json --project C:\tmp
pnpm.cmd check
pnpm.cmd install --frozen-lockfile --offline --reporter=append-only
```

Observed results:

- Focused CLI gate: 1 test file and 5 tests passed.
- The direct entry point and `pnpm sfhs` intentionally returned exit `1` for a manifest-free directory with `SFHS_PROJECT_MANIFEST_NOT_FOUND`.
- Full workspace gate: ESLint, strict TypeScript, and all 9 workspace test files passed (24 tests total).
- Frozen offline install passed with pnpm `11.9.0`.

## Scope held

- No `build`, `pack`, `verify`, `test`, `check`, or release command was added beyond the pre-existing workspace quality script.
- No builder, packer, verifier, browser runner, PixiJS runtime, Codex plugin, Hermes adapter, marketplace, remote, or release action was added.
- No SNC source, names, assets, runtime behavior, or tests were read or changed.
- No commit, push, pull request, release, or plugin installation occurred.

## Next actionable step

Assign `SFHS-002A - Pixi minimal fixture` as one bounded card. It should introduce only the minimal non-SNC authored fixture shell and must retain the CLI as a thin caller of the same contracts and core APIs.
