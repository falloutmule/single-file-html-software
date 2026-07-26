# SFHS-005C - Run-Contained Evidence and Release Preparation

**Date:** 2026-07-20

**Implementation status:** PASS

**Local release-preparation verdict:** BLOCKED

**Base commit:** `8cf6f74`

## WHAT WAS DONE

- Extended `sfhs.evidence@1` with optional environment, screenshot, and blocker records while preserving the required run, artifact, command, and verdict fields.
- Implemented `@sfhs/evidence` as an atomic, canonical manifest writer that accepts one dedicated run directory and writes only `evidence.json` within it.
- Kept the evidence schema closed to unknown fields, so raw prompts, secrets, and unrelated history cannot be added silently.
- Added `sfhs release prepare --evidence <dir>` as a preparation-only command. It performs pack, exact static verification, lint, typecheck, all units, determinism, and the full exact-artifact browser scenario/screenshot matrix.
- Added optional `--device-evidence <file>` validation and exact artifact SHA/build-ID binding.
- Made absent, invalid, emulated, failed, or artifact-mismatched device evidence block preparation with stable findings.
- Added deterministic command/exit/status evidence and SHA-256 for every captured screenshot.
- Added tests for both blocked-without-device and prepared-with-exact-valid-device-contract paths. The prepared test uses a clearly labeled contract fixture and does not claim a hardware run.
- Added `.sfhs-evidence/` to ignored run-contained outputs.

## WHAT WAS VERIFIED

```text
pnpm run test packages/cli/src packages/evidence/src packages/contracts/src
pnpm run typecheck
pnpm sfhs release prepare --json --project examples/pixi-minimal --evidence .sfhs-evidence/005C-local
```

- Focused contract, collector, selection, and CLI tests passed 4 files and 27 tests.
- Strict TypeScript passed.
- The real release-preparation command passed pack, exact static verification, lint, typecheck, all unit tests, two-copy determinism, and all exact-artifact browser scenarios.
- The exact artifact remained 573358 bytes with SHA-256 `6d2a8e9c3c28d4576e7ad22cb9a1e18bc6e36eb537b3764a9017f3bf3cda8416` and build ID `pixi-minimal-f0f9aa3feaf9`.
- The run wrote one canonical manifest plus three screenshots beneath `.sfhs-evidence/005C-local/`.
- Screenshot records include exact hashes, dimensions, profiles, and `semanticReview: pending`; the automated collector does not impersonate human visual review.
- The command exited 1 with only `SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED`, and the evidence verdict is `blocked`.

## RUN-CONTAINED EVIDENCE

```text
.sfhs-evidence/005C-local/evidence.json
.sfhs-evidence/005C-local/screenshots/desktop-running.png
.sfhs-evidence/005C-local/screenshots/samsung-s21-ultra-portrait.png
.sfhs-evidence/005C-local/screenshots/samsung-s21-ultra-landscape.png
```

These files are ignored local run outputs. The checked-in evidence is this bounded summary; the release command can reproduce the machine manifest.

## REMAINING BLOCKER

`SFHS_RELEASE_PHYSICAL_DEVICE_REQUIRED` — a real Samsung Galaxy S21 Ultra (`SM-G998*`) must pass portrait and landscape acceptance against this exact artifact. Emulation screenshots cannot satisfy the contract.

## NEXT ACTIONABLE STEP

Assign `SFHS-006A - Original repository-local Codex plugin scaffold` as the next bounded card. Do not install OpenAI Game Studio; standalone SFHS plugin acceptance comes first.

## VERDICT

PASS for SFHS-005C implementation. Local release preparation is honestly `BLOCKED` on physical-device evidence.
