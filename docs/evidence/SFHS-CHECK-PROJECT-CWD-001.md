# SFHS-CHECK-PROJECT-CWD-001

Status: VERIFIED

## Affected behavior

The `sfhs check --project <project-root>` and `sfhs test --project <project-root>` commands discovered the requested project's test plan, but executed each generated `pnpm` command with the SFHS workspace directory as its current working directory when SFHS was invoked from that checkout. `sfhs release prepare` had the same propagation error for its release test plan.

This caused an external project's `lint`, `typecheck`, `test`, and browser commands to resolve the SFHS workspace scripts instead of the project's scripts. The defect is present at the affected Cat Paw pin `68ef8f021eea2ab90a57ca6e2f608d8166a39859`.

## Fix

Test-plan execution now receives `discovery.projectRoot` at every CLI caller. The command executor uses that root as its `cwd`. The configured SFHS workspace root remains available for SFHS discovery, materialization, and tooling resolution; only project-owned test commands change working directory.

There is no Cat Paw-specific behavior and no test-plan selection, command, or failure-handling change.

## Compatibility

- External and disposable projects now run their own package scripts as intended.
- Explicit in-workspace `--project` checks and tests continue to run from that project root.
- Release preparation runs its project-owned test plan from the discovered project root.
- Default in-workspace invocations remain rooted at the discovered project, which is the same directory in the normal case.

Projects that accidentally depended on SFHS workspace scripts being executed for an external `--project` target will now correctly expose that configuration error instead of silently testing SFHS.

## Regression coverage

`packages/cli/src/index.test.ts` covers:

- a real external disposable project with distinct `lint`, `typecheck`, `test`, and `browser-smoke` scripts, executed through the default command executor while the CLI itself is invoked from the SFHS workspace;
- explicit in-workspace `check --project` and `test --project` execution roots;
- release-preparation test-plan execution roots when the SFHS workspace root differs from the project root.

The external-project test proves project scripts execute in the supplied root while the pinned SFHS CLI tooling remains loaded from its own workspace.
