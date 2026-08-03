# SFHS-003D - Clean-Build Determinism Proof

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `a1f7088`

> **Historical runtime note (2026-08-03):** This report honestly records the
> Node 24 environment and CI baseline used for the original determinism card.
> It is not current runtime authority. Current SFHS `main` requires Node 22.18
> or newer with pnpm 11.9.0.

## WHAT WAS DONE

- Added a repository-owned `sfhs.determinism@1` harness that copies the complete unignored candidate source into two isolated temporary directories.
- Ran a frozen dependency install, one-file pack, static scan, output-directory audit, byte count, and SHA-256 calculation independently in both copies.
- Added an exact byte comparator for artifacts produced by different environments.
- Added a Windows/Ubuntu GitHub Actions matrix that uploads each verified HTML artifact and a dependent job that compares their exact bytes.
- Updated GitHub Actions to current Node 24-compatible majors and pinned Node 24 and pnpm 11.9.0.
- Added a repository LF checkout policy with explicit PNG/WAV binary handling.
- Replaced the pnpm workspace's placeholder esbuild policy with explicit permission for the pinned build dependency.
- Made unknown v0.1 asset extensions fail with `SFHS_BUILD_ASSET_UNSUPPORTED` instead of silently becoming `application/octet-stream`.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/builder/src/index.test.ts
pnpm run determinism -- --offline --artifact-file .sfhs-determinism/windows/index.html --report-file .sfhs-determinism/windows/report.json
pnpm check
pnpm install --frozen-lockfile --offline --reporter=append-only
node tools/compare-artifacts.mjs .sfhs-determinism/windows/index.html .sfhs-determinism/windows/index.html
```

- Focused builder gate passed 1 file and 5 tests, including explicit unsupported-asset rejection.
- Full gate passed ESLint, strict TypeScript, and 15 files with 83 tests.
- Frozen offline install passed for all 11 workspace projects.
- Two isolated Windows x64 builds each performed their own frozen offline install and static scan.
- Both artifacts were exactly 572,264 bytes with SHA-256 `a1e12e6161cf35ae7c2947fc74c1e354e7f735d1289f4cbac357693bae03695e`.
- Both used build ID `pixi-minimal-7bcfc7d301c9`, source SHA-256 `7bcfc7d301c94372daa58d742573f9fef24420725055e8e5ca3b219b2603eb6d`, and zero static findings.
- Exact byte equality was true.
- The comparator returned `identical: true` for the retained verified artifact.

## WHAT FAILED

- The first tools lint run required explicit Node global imports in `.mjs` files.
- The first Windows harness run could not spawn the pnpm command shim directly. A shell-based retry worked but produced a Node security warning; the final implementation invokes `cmd.exe` explicitly with fixed arguments and no shell interpolation.
- Repository inspection found `core.autocrlf=true` with no tracked line-ending policy. `.gitattributes` now fixes text checkouts to LF and marks binary proof assets explicitly.

All corrected focused, full, frozen-install, and local two-copy determinism gates pass.

## CURRENT EXACT STATE

```text
local environment: Windows x64, Node v24.14.0, pnpm 11.9.0
clean source copies: two isolated temporary directories
install mode: frozen lockfile, offline for local proof
outputs per copy: exactly examples/pixi-minimal/dist/index.html
static scan per copy: PASS, zero findings
same-platform byte identity: PASS
cross-platform workflow: implemented, not remotely executed
```

## REMAINING BLOCKERS

- There is no remote repository, so the Windows/Ubuntu matrix and cross-platform comparison have not run. No cross-platform PASS is claimed yet.
- The full artifact descriptor/source-binding verifier is not implemented.
- Browser, screenshot, context-loss, `file://`, desktop Chromium, and physical Samsung Galaxy S21 Ultra evidence remain unimplemented.

## NEXT ACTIONABLE STEP

Assign `SFHS-004A - Exact-artifact static verifier` as the next bounded card.

## EVIDENCE

| Failure mode | Guard in this card |
|---|---|
| Nondeterministic build | Two isolated installs and packs compare exact HTML bytes and SHA-256. |
| Cross-platform drift | LF checkout policy plus Windows/Ubuntu artifact upload and dependent byte comparison are committed. |
| Unsupported asset ambiguity | Unknown v0.1 extensions fail with a stable explicit code. |
| Hidden output | Each build asserts that its output directory contains only `index.html`. |
| External dependency leak | Each clean build must pass the independent static scanner. |
| Proofless success | Canonical reports bind environment, source, build ID, bytes, hashes, and scan result. |
| AI overreach | No remote run, browser, plugin, Hermes, SNC, publication, or release action occurred. |

## GITHUB PAGES URL

Not applicable. No remote or deployment exists.

## VERDICT

PASS
