# SFHS current public state

**Import basis:** canonical SFHS `main` at
`6df0194815d375c5525292a57729792716d05fd2`.

This repository contains the working SFHS development system: contracts,
single-file build and pack tooling, verifier, browser runner, evidence tools,
renderer classifier, Canvas import analysis, Pixi v8 adapter, bounded
Canvas-to-Pixi compatibility work, local Codex/Hermes plugins, fixtures, and
existing tests.

## WIP boundary

- **PixiJS** is the active development lane.
- **Canvas 2D**, **DOM/CSS**, **raycasting**, and future lanes remain possible;
  SFHS is not Pixi-only.
- Current interfaces are implementation interfaces, not stable public APIs.
- No npm package, stable SDK, marketplace, or production-support claim is made.
- Automated checks and physical Samsung acceptance are separate evidence gates.

## Excluded from this import

The generic system deliberately excludes the HOMEOSTASIS application source,
its game-specific simulation/HUD/upgrades/presentation, project-specific
visual evidence, and historical HTML backups. Those materials are not needed
to build or verify the reusable development system.

See [PUBLIC-IMPORT-2026-07.md](PUBLIC-IMPORT-2026-07.md) for the exact import
scope and verification record.
