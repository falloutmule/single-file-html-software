# SFHS Node 22.18 Compatibility Evidence

## Goal

Support Node.js 22.18 and newer without removing Node 24 support or weakening
SFHS type, test, determinism, artifact, browser, plugin, or adapter safeguards.

## What was changed

Verified:

- The root engine is `node >=22.18.0` and `@types/node` is pinned to `22.20.1`.
- The lockfile was regenerated with pnpm `11.9.0`; the package-manager version
  was not changed.
- CLI doctor parses a complete `v?major.minor.patch` runtime version, accepts
  Node 22.18+, 23, 24, and higher majors, and rejects malformed input safely
  with `SFHS_NODE_VERSION_UNSUPPORTED`.
- TypeScript enables `erasableSyntaxOnly` and `verbatimModuleSyntax`.
- Skyline Drop's numeric `Direction` API remains `North/East/South/West` with
  values `1/2/4/8`, implemented as a frozen object plus an erasable union type.
- CI matrices cover Node `22.18.0` and `24`; browser and determinism artifact
  names include the Node version, and cross-platform comparisons match the
  same Node version across Windows and Linux.
- The existing README setup authority now documents Node 22.18+ and the
  direct-runtime-safe TypeScript constraint.

## What was verified

Verified:

- Local environment: Windows x64, Node `v24.14.0`, pnpm `11.9.0`.
- Focused CLI suite: 1 file passed, 21 tests passed.
- Full unit suite: 39 files passed, 244 tests passed, 2 skipped.
- Lint, typecheck, One-Shot validation, aggregate `pnpm check`, SFHS plugin
  validation, and Hermes adapter validation passed.
- Two isolated local builds were byte-identical: 574,268 bytes, SHA-256
  `4487a0b1d1aec53625ebff9706312f90d734fee9e55fb2a7aa7de8288d0367b2`.
- Chromium `149.0.7827.55` browser smoke passed with self-check true, no
  findings, and no unexpected runtime requests.
- All nine browser scenarios passed with no unexpected requests or page
  errors, including boot/assets/audio, context-loss classification,
  `file://`, fixed-step visibility, keyboard, pointer, resize, and activation.
- Runtime-sensitive search found only `import.meta.dirname` uses, which are
  available before Node 22.18, plus prose matches. The compiler found no
  remaining non-erasable syntax.
- The final diff scan found no home-directory paths, tokens, secrets, API keys,
  or `.env` paths.

Inferred:

- Injected-version doctor tests prove the version-selection logic for Node
  `v22.18.0`, Node 23, and Node 24 independently of the host executable.
- The CI job graph is configured to supply the missing real Node-22 and
  Windows/Linux per-version evidence when the branch is run by GitHub Actions.

Untested:

- No Node 22 executable or version manager is installed locally, so the full
  command set was not executed by an actual Node 22.18 runtime in this run.
- CI was not executed because this card explicitly forbids pushing or remote
  publication.

## What failed

Verified:

- `pnpm add -D @types/node@22 --save-exact` stopped at the workspace-root
  safety check. The required retry, `pnpm add -Dw @types/node@22 --save-exact`,
  passed.
- The first noninteractive frozen install stopped because pnpm required
  confirmation before rebuilding `node_modules`. The same frozen install with
  `CI=true` passed.
- Before that rebuild, `pnpm exec vitest` used a stale Windows shim and could
  not resolve Vitest. The direct locked shim passed, then the required
  `pnpm exec vitest run packages/cli/src/index.test.ts` command passed after
  the frozen dependency refresh.
- The first lint attempt encountered the same noninteractive dependency-status
  prompt. The command passed with `CI=true`, as used in CI.
- Running doctor from the repository root reported the expected missing
  project manifest. Running it against `examples/pixi-minimal` passed on Node
  `v24.14.0` with no findings.

## Current exact state

Verified:

- Branch: `codex/sfhs-node-22-18-compat`.
- Base: refreshed `origin/main` at
  `5fcb00e154c216014dd668d344dc496d2a062222`.
- Intended source, configuration, documentation, workflow, and lockfile changes
  are present; generated browser and determinism proof directories remain
  ignored.
- No push, publish, deploy, release, marketplace install, profile edit, or
  GitHub Pages change occurred.

## Remaining blockers

Untested:

- Actual Node 22.18 execution and both per-version cross-platform comparisons
  remain pending until the committed GitHub Actions matrix is run.

Proposed:

- Run the normal pull-request CI after a separately authorized push. Do not
  compare Node 22 artifact bytes to Node 24 artifact bytes; compare Windows and
  Linux within each matching Node version.

## Commands run

Verified:

- `git fetch origin --prune`
- `git switch -c codex/sfhs-node-22-18-compat origin/main`
- `pnpm add -Dw @types/node@22 --save-exact`
- `CI=true pnpm install --frozen-lockfile`
- `CI=true pnpm exec vitest run packages/cli/src/index.test.ts`
- `CI=true pnpm run lint`
- `CI=true pnpm run typecheck`
- `CI=true pnpm run test`
- `CI=true pnpm run one-shot-validate`
- `CI=true pnpm check`
- `CI=true pnpm plugin-validate`
- `CI=true pnpm hermes-adapter-validate`
- `CI=true pnpm determinism`
- `CI=true pnpm run determinism -- --artifact-file .sfhs-ci/local-node-24/index.html --report-file .sfhs-ci/local-node-24/report.json`
- `CI=true pnpm browser-smoke`
- `CI=true pnpm browser-scenarios`
- `CI=true pnpm sfhs doctor --json --project examples/pixi-minimal`
- Runtime-sensitive syntax/API search, diff check, scope check, and sensitive
  pattern scan.

## Evidence paths/files/logs

Verified:

- This report: `docs/results/NODE22/SFHS-NODE22-18-COMPAT.md`.
- Local determinism report: `.sfhs-ci/local-node-24/report.json` (ignored).
- Local deterministic artifact: `.sfhs-ci/local-node-24/index.html` (ignored).
- Browser scenario output: `.sfhs-browser/scenarios/` (ignored).
- CI definition: `.github/workflows/ci.yml`.
- Runtime contract and lock resolution: `package.json`, `pnpm-lock.yaml`, and
  `tsconfig.json`.
- CLI implementation and focused proof: `packages/cli/src/index.ts` and
  `packages/cli/src/index.test.ts`.

## Failure-mode audit

Verified:

- Guarded A (deliverable drift), B (external dependency leak), D (unrelated
  breakage), Q (proofless success), R (repo-root clutter), S (private-data
  leak), and T (scope overreach).
- Modes C and E-P are not applicable because this card does not change the
  shipped HTML, rendering, simulation, save, input, viewport, layout, or menus.
- The exact-artifact browser checks remained green and generated evidence stayed
  in ignored, scoped directories.

## Commit SHA

Proposed:

- The exact final commit SHA is post-commit evidence and cannot be embedded in
  the commit that creates it. It will be returned in the final Codex handoff.

## Result

**PASS** for the complete available local verification set on Node 24, with
actual Node 22.18 execution and remote CI explicitly **Untested** rather than
claimed.
