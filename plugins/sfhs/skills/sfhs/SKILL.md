---
name: sfhs
description: Inspect and route work for SFHS single-file HTML projects. Use when a request mentions SFHS, a project contains sfhs.project.json, or Codex must choose among SFHS authoring, PixiJS, import, verification, and release-preparation workflows.
---

# SFHS Router

Use the repository's SFHS CLI as the source of truth. Do not recreate build, packing, scanning, browser, evidence, or release logic in prose.

## Route the request

1. Read `AGENTS.md` and discover `sfhs.project.json` from the requested path.
2. For a complete bounded game or interactive application, read `one-shot/START-HERE.md` first. For a Chat-authored build, use the opt-in Protocol v2 preflight and run-state before source work; it selects environment mode and a packet but does not replace the CLI.
3. Reconcile repository root, branch, status, HEAD, and remotes before mutation.
4. Run `pnpm sfhs inspect --json --project <path>`.
5. Route to the narrowest specialist:
   - PixiJS v8 authoring, runtime, input, viewport, or visual work: `$sfhs-pixi`.
   - Existing-project migration: `$sfhs-import`.
   - Read-only artifact QA: `$sfhs-verify`.
   - Release preparation and evidence: `$sfhs-release`.
6. Keep changes within the selected project and its declared evidence paths.

## Guardrails

- Edit readable source, never generated `dist/index.html`.
- Treat explicit SFHS or Pixi requests and any `sfhs.project.json` as SFHS work. Never route them to Phaser.
- Keep SFHS host-neutral. Codex and Hermes call the same CLI.
- Keep project-specific source and identifiers outside SFHS core. Do not mutate unrelated repositories through this plugin.
- Do not add MCP servers, apps, hooks, runtime CDNs, or unapproved external URLs.
- Do not push, publish, merge, tag, deploy, install another plugin, or modify a Hermes profile without explicit authority.

## Baseline commands

```text
pnpm sfhs validate --json --project <path>
pnpm sfhs build --json --project <path>
pnpm sfhs check --json --project <path> --changed <repo-relative-path>
pnpm sfhs pack --json --project <path>
pnpm sfhs verify --json --project <path>
```

Report stable finding codes, exact artifact SHA-256/build ID when produced, commands run, and any external blocker.
