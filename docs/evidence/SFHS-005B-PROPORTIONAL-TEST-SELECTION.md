# SFHS-005B - Proportional Test and Check Selection

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `961e9a6`

## WHAT WAS DONE

- Added deterministic `sfhs.test-plan@1` path-to-test selection.
- Added real `sfhs test` and `sfhs check` commands with repeated `--changed <repo-relative-path>` inputs.
- Added explicit path families for contracts/core, build/pack/verify, browser runner, Pixi adapter/authored source, workspace/tooling, CLI/evidence, CI, and docs.
- Added conservative unknown-runtime handling: lint, typecheck, static/build verification, all units, one exact-artifact browser smoke, and `SFHS_TEST_SELECTION_REVIEW_REQUIRED`.
- Added ordered step results with command, exit code, and passed/failed/skipped status.
- Made a failed step stop later execution and return `SFHS_TEST_STEP_FAILED` without false success.
- Kept subprocess arguments array-based. Windows invokes pnpm's JavaScript entrypoint through Node instead of interpolating through a shell.
- Disabled cross-file Vitest parallelism because builder read-only assertions and packer write tests intentionally share the ignored fixture output path; serial files remove that race.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/cli/src/test-selection.test.ts packages/cli/src/index.test.ts
pnpm sfhs check --json --project examples/pixi-minimal --changed new-runtime/widget.ts
pnpm check
git diff --check
```

- Five selection cases cover Pixi, contracts, unknown runtime, docs, and no-path defaults.
- CLI injection tests cover passing steps, warning-only review, fail-fast behavior, and skipped later steps.
- The real unknown-runtime check executed and passed lint, typecheck, 58 focused build/pack/verifier tests, all repository unit tests, and one exact-artifact browser smoke.
- The real command returned exit 0 with one review warning and no error finding.
- Full quality passed 19 files with 113 tests and 2 intentional browser skips.

## WHAT FAILED AND WAS CORRECTED

- Node on Windows rejected direct spawning of the `pnpm.cmd` shim with `EINVAL`. The executor now invokes the pnpm JavaScript entrypoint with `process.execPath` and an argument array.
- The first focused-script form passed a literal `--` to Vitest, causing every test file to run. The command definition now passes filters directly through the pnpm script.
- That accidental all-file run exposed a race between builder no-write assertions and packer output tests. Test files now execute serially for deterministic ownership of the shared ignored output.

## NEXT ACTIONABLE STEP

Assign `SFHS-005C - Run-contained evidence and release preparation` as the next bounded card.

## VERDICT

PASS
