---
name: sfhs-release
description: Prepare evidence-bound SFHS releases without publishing. Use when asked for release preparation, readiness, final verification, evidence collection, or a release candidate for an SFHS project.
---

# SFHS Release

Prepare only. Never push, open a PR, merge, tag, publish a plugin, or deploy an artifact unless the user separately authorizes that exact action.

## Workflow

1. Confirm the working tree and exact project path.
2. Choose a new run-contained evidence directory.
3. Run:

```text
pnpm sfhs release prepare --json --project <path> --evidence <run-directory>
```

4. When real Samsung evidence exists, bind it explicitly:

```text
pnpm sfhs release prepare --json --project <path> --evidence <run-directory> --device-evidence <device-record.json>
```

5. Read the generated `sfhs.evidence@1` manifest. Report the exact artifact SHA-256/build ID, command exits, screenshot hashes, environment versions, blockers, and one verdict.

## Release gates

- Require all local build, pack, static, unit, determinism, and exact-artifact browser checks to pass.
- Require human semantic review of visual evidence.
- Require a passing physical Samsung Galaxy S21 Ultra record for the same artifact in portrait and landscape. Reject emulation, a non-`SM-G998*` model, unsupported WebGL, or mismatched artifact identity.
- Preserve `blocked` when external hardware, cross-platform CI, clean plugin acceptance, Hermes acceptance, or independent checking remains outstanding.

`release prepare` is not publication authority.
