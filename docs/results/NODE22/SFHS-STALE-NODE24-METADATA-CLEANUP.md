# SFHS Stale Node 24 Metadata Cleanup

## Goal

Remove current SFHS/Ueye metadata that incorrectly treats Node 24 as the minimum runtime, while preserving honest historical evidence from runs that used Node 24.

## What was done

Verified: Refreshed `origin`, checked out and fast-forwarded `main`, and confirmed that work began at the merged Node 22 compatibility commit `fc8cbd8fc5d1dbb6bf3251d62954e8558e533619`.

Verified: Created `codex/cleanup-stale-node24-metadata` from that exact commit after confirming that the branch did not already exist.

Verified: Searched tracked files and non-ignored generated/current JSON, Markdown, text, YAML, and YML material for Node 24 requirement language and Node v24.14.0 references. Every remaining match was classified from its path and surrounding context.

## What was changed

Verified: Updated the One-Shot source-pack compatibility metadata from Node `>=24.0.0` to Node `>=22.18.0`, advanced the pack version to `0.2.1`, and included `one-shot/METADATA-CORRECTION.md` in generated kits.

Verified: Updated One-Shot runtime preflight selection to accept a strict `v?major.minor.patch` version when it is Node 22.18+ or any higher major. The current diagnostic now states that Node 22.18+ is required.

Verified: Updated generated graduation pins, tests, and Skyline Drop's package engine to Node `>=22.18.0`. pnpm remains `11.9.0`.

Verified: Updated Skyline Drop handoff text so the supplied Node 24 snapshot is explicitly historical and current SFHS authority is Node 22.18+ with pnpm 11.9.0.

Historical: Added clarification to three old evidence reports whose recorded Node 24 baselines could otherwise be mistaken for the current minimum. Their original run facts were not rewritten.

Stale: Added a tracked correction source at `one-shot/METADATA-CORRECTION.md` and a nearby ignored correction at `.sfhs-one-shot/METADATA-CORRECTION.md` for byte-untouched local kits generated from pre-0.2.1 snapshots.

Stale: Generated `.sfhs-one-shot/sfhs-one-shot-kit-node22-current.json` as the replacement current local kit. Its SHA-256 is `286C5C5D67E135130FF8ACB69F9236205E038277B9E7837D7AE55FAEE9A9D85F`.

## What was left unchanged and why

Historical: Evidence that a past validation actually ran on Node v24.14.0 remains unchanged. This includes environment tables, the merged Node 22 compatibility report, `.sfhs-evidence` output, and `.sfhs-ci/local-node-24/report`.

Historical: Four ignored pre-0.2.1 One-Shot kit JSON files remain byte-for-byte unchanged because they are generated snapshots. The nearby correction identifies them as stale rather than falsifying their contents.

Verified: Node v24.14.0 strings in contract, packer, evidence, and verifier test fixtures remain because they intentionally exercise valid runtime evidence or negative validation behavior, not the current minimum requirement.

Verified: Lockfile peer ranges such as `^20 || ^22 || >=24` remain because they describe third-party dependency compatibility, not SFHS's engine requirement.

Verified: Unrelated gameplay thresholds containing `>=24` remain unchanged.

## What was verified

Verified: Repository authority:

- `git fetch origin --prune` - passed.
- `git checkout main` - passed.
- `git pull --ff-only` - passed; already current.
- `git rev-parse HEAD` - `fc8cbd8fc5d1dbb6bf3251d62954e8558e533619` before cleanup.
- `package.json` - Node `>=22.18.0`, package manager `pnpm@11.9.0`.

Verified: Local toolchain was Node `v24.14.0` and pnpm `11.9.0`.

Verified: Validation commands and outcomes:

- `$env:CI='true'; pnpm exec vitest run packages/one-shot/src/chat.test.ts packages/one-shot/src/graduation.test.ts packages/one-shot/src/index.test.ts` - passed, 41 tests.
- `$env:CI='true'; pnpm sfhs one-shot validate-source` - passed.
- `$env:CI='true'; pnpm sfhs one-shot kit --output .sfhs-one-shot/sfhs-one-shot-kit-node22-current.json --json` - passed; schema `sfhs.one-shot-kit@1`, version `0.2.1`, Node `>=22.18.0`.
- `$env:CI='true'; pnpm install --frozen-lockfile` - passed.
- `$env:CI='true'; pnpm run lint` - passed.
- `$env:CI='true'; pnpm run typecheck` - passed.
- `$env:CI='true'; pnpm run test` - passed, 251 tests, 2 skipped.
- `$env:CI='true'; pnpm check` - passed, including lint, typecheck, tests, and One-Shot source validation; 251 tests, 2 skipped.
- `$env:CI='true'; pnpm exec vitest run packages/one-shot/src/chat.test.ts` after the final test-name clarification - passed, 17 tests.
- `git diff --check` - passed.

Verified: Repeated broad searches found no unclassified current metadata or instruction that requires Node 24. Remaining matches are explicit historical evidence, explicit stale warnings, intentional fixtures, dependency peer ranges, or unrelated numeric thresholds.

Untested: No remote workflow was triggered for this metadata-only branch because the task forbids pushing without separate authorization. The already-merged compatibility proof established Node 22.18 and Node 24 CI on Linux and Windows.

## What failed

Historical: Initial consolidated PowerShell search/review attempts had quoting or spaced-pattern parsing errors. They made no changes and were rerun successfully with PowerShell-safe commands.

Verified: No implementation test, validator, install, lint, typecheck, aggregate check, or final diff check failed.

## Current exact state

Verified: Current SFHS `main` authority is Node `>=22.18.0` with pnpm `11.9.0`.

Verified: The cleanup branch is `codex/cleanup-stale-node24-metadata`, based on `fc8cbd8fc5d1dbb6bf3251d62954e8558e533619`.

Verified: Current source-pack version is `0.2.1`, and its runtime metadata is Node `>=22.18.0`.

Stale: Pre-0.2.1 local generated kits that say Node 24 remain historical snapshots and are explicitly covered by correction notes.

## Remaining blockers

Verified: None for the requested local cleanup and validation.

Untested: The branch is not pushed and therefore has no branch-specific remote CI result, as required by the task's no-push boundary.

## Evidence paths/files/logs

Verified: Tracked authority and correction sources:

- `package.json`
- `one-shot/source-pack-manifest.json`
- `one-shot/METADATA-CORRECTION.md`
- `packages/one-shot/src/chat.ts`
- `packages/one-shot/src/graduation.ts`
- `examples/skyline-drop/package.json`

Historical: Clarified evidence and handoff material:

- `docs/evidence/SFHS-001C-CORE-DISCOVERY-PATH-HASH.md`
- `docs/evidence/SFHS-001D-READ-ONLY-CLI.md`
- `docs/evidence/SFHS-003D-CLEAN-BUILD-DETERMINISM.md`
- `examples/skyline-drop/docs/handoff/INTAKE-STATUS.md`
- `examples/skyline-drop/docs/handoff/README.md`

Stale: Local ignored snapshot correction and replacement kit:

- `.sfhs-one-shot/METADATA-CORRECTION.md`
- `.sfhs-one-shot/sfhs-one-shot-kit-node22-current.json`

Verified: This report is `docs/results/NODE22/SFHS-STALE-NODE24-METADATA-CLEANUP.md`.

## Commit

Verified: The intended commit message is `Clean up stale Node 24 metadata`.

Untested: A commit cannot contain its own SHA. The exact final SHA is post-commit evidence and will be returned in the Codex handoff.

## Next actionable step

Verified: Review the final committed diff. Pushing the branch or opening a pull request remains outside this task and requires separate authorization.
