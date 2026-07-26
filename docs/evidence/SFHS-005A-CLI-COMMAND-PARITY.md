# SFHS-005A - CLI Command Parity

**Date:** 2026-07-20

**Status:** PASS

**Base commit:** `d848c65`

## WHAT WAS DONE

- Added `sfhs build`, `sfhs pack`, and `sfhs verify` to the existing stable CLI envelope.
- Kept the CLI thin: build calls `@sfhs/builder`, pack calls `@sfhs/packer`, and verification calls `@sfhs/verifier` against a descriptor regenerated from current source.
- Added deterministic build and artifact summaries to JSON and human-readable output.
- Mapped builder, packer, and verifier failures into stable CLI findings without reporting false success.
- Added direct-package versus CLI parity coverage in an isolated copied Pixi project.

## WHAT WAS VERIFIED

```text
pnpm exec vitest run packages/cli/src/index.test.ts
pnpm run typecheck
pnpm sfhs build --json --project examples/pixi-minimal
pnpm sfhs pack --json --project examples/pixi-minimal
pnpm sfhs verify --json --project examples/pixi-minimal
```

- Focused CLI coverage passed 6 tests.
- Strict TypeScript passed.
- Real CLI build, pack, and verify commands returned exit 0.
- Direct and CLI build source hashes matched.
- Direct and CLI pack artifact bytes, SHA-256, build ID, and source SHA-256 matched.
- Direct and CLI exact-file verification matched and passed.
- The exact fixture artifact remained 573358 bytes with SHA-256 `6d2a8e9c3c28d4576e7ad22cb9a1e18bc6e36eb537b3764a9017f3bf3cda8416` and build ID `pixi-minimal-f0f9aa3feaf9`.

## NEXT ACTIONABLE STEP

Assign `SFHS-005B - Proportional test and check selection` as the next bounded card.

## VERDICT

PASS
