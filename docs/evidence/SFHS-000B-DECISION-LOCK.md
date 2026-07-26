# SFHS-000B — Standalone Repository and Decision Lock

**Date:** 2026-07-20  
**Status:** complete  
**Autonomy used:** bounded local writes only; no remote mutation

## Goal

Create the approved standalone SFHS repository and persist the architectural decisions required before a dependency or runtime scaffold.

## Decisions locked

| Decision | Locked value |
|---|---|
| Repository | `C:/Users/fallo/Documents/SFHS`, standalone local Git repository on `main` |
| Plugin distribution | Canonical source `plugins/sfhs`; repository-local marketplace when a later explicit task authorizes creation and installation |
| Runtime artifact | One self-contained HTML file; strict `file://` is a v0.1 goal with limitations reported honestly |
| First proof | Tiny top-down PixiJS v8 fixture with a moving entity, clickable world object, DOM HUD, atlas animation, and audio-unlock path |
| License/publisher | MIT; initial author name `falloutmule`; omit unknown optional contact and URL fields |
| OpenAI Game Studio | Reference-only until standalone SFHS plugin clean-install acceptance passes |
| SNC boundary | No SFHS implementation or marketplace changes in the SNC workspace or game repository |

## What was created

- Empty Git repository on branch `main`.
- `AGENTS.md` with SFHS-only scope and card rules.
- Eight ADRs under `docs/adr/`.
- Copies of the approved SFHS-000A preflight and v0.1 finish plan.
- This decision-lock record.

## What was not done

- No dependency, package manager, PixiJS, Playwright, Codex plugin, marketplace, MCP server, Hermes profile, remote, commit, or release action.
- No SNC file or directory was modified.

## Verification

```text
git rev-parse --show-toplevel
git branch --show-current
git status --short
git diff --check
```

Expected repository identity:

```text
root: C:/Users/fallo/Documents/SFHS
branch: main
remote: none
```

## Next actionable step

Assign `SFHS-001A — Minimal workspace scaffold` as one bounded task. It may add the pnpm workspace, TypeScript baseline, placeholder package tests, and CI skeleton, but must not install the Codex plugin or create an MCP server.
