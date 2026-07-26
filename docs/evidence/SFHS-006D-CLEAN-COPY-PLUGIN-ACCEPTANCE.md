# SFHS-006D - Clean-Copy Plugin and CLI Acceptance

**Date:** 2026-07-20

**Clean-copy status:** PASS

**Active-profile discovery:** BLOCKED_ON_PLUGIN_INSTALL_AUTHORIZATION

**Base commit:** `2f511fb`

## WHAT WAS VERIFIED

In a fresh local clone under `C:/tmp`:

```text
pnpm install --frozen-lockfile --offline
pnpm plugin-validate
pnpm sfhs inspect --json --project examples/pixi-minimal
<one authored CSS change>
pnpm sfhs build --json --project examples/pixi-minimal
pnpm sfhs check --json --project examples/pixi-minimal --changed examples/pixi-minimal/src/styles.css
pnpm sfhs pack --json --project examples/pixi-minimal
pnpm sfhs verify --json --project examples/pixi-minimal
```

- Frozen offline install passed for all 11 workspace projects.
- Repository-local plugin/marketplace acceptance passed without any hidden checkout dependency.
- Inspect found `pixi-minimal` with adapter `pixi-v8`.
- A temporary authored CSS change produced source SHA-256 `aa24063faa4b11f3be538bcb486de47f622e6433238c98ba5e6ac9649dfedae3`.
- The Pixi proportional plan passed lint, typecheck, focused adapter/example tests, and the complete exact-artifact browser scenario matrix.
- Pack produced one 573398-byte HTML artifact with SHA-256 `1a57a3d92f8ac4edac27ee8f28c978976679f44c3bc3a4e1dddc496e63c3a73d` and build ID `pixi-minimal-aa24063faa4b`.
- Exact verification returned exit 0 with no finding.

The temporary clone was removed after verification. It can be recreated from the committed repository; the deliberate CSS probe was not retained.

## REMAINING BLOCKER

The plugin was not installed into the user's active Codex profile, so actual Codex discovery and a new-task invocation are not claimed. The repository guide forbids marketplace installation without separate explicit authority. OpenAI Game Studio was not installed or co-tested.

## NEXT ACTIONABLE STEP

Proceed with `SFHS-007A - Thin Hermes adapter scaffold` while retaining `BLOCKED_ON_PLUGIN_INSTALL_AUTHORIZATION` for active-profile plugin discovery.

## VERDICT

PASS for clean-copy source, marketplace structure, routing contract, and CLI workflow. Active Codex discovery remains blocked on installation authorization.
