# SFHS Current State

_Last updated: 2026-07-26_

## Purpose of this document

This file is the short operational snapshot of Single-File HTML Software. It records what is actually present, what is active elsewhere, and what has not yet been generalized into the repository.

## Status vocabulary

- **Verified** — directly inspected or tested.
- **Reported** — supported by project evidence outside this repository but not reproduced here.
- **In progress** — active work without final acceptance.
- **Experimental** — useful research without a stable contract.
- **Proposed** — a direction, not an implementation.
- **Blocked** — cannot honestly advance without a concrete dependency, decision, or test.
- **Superseded** — preserved history that is no longer the active direction.

## Verified in this repository

The checked-in foundation currently provides:

- a self-contained `dist/index.html` build target;
- a Canvas 2D plus DOM/CSS example shell;
- a requestAnimationFrame lifecycle;
- action-mapped keyboard and pointer input;
- pointer-ID and `pointercancel` handling;
- dynamic viewport and safe-area patterns;
- deterministic simulation/render separation;
- save/load scaffolding for durable state;
- a build script that inlines source;
- verification that rejects external runtime references;
- Playwright smoke coverage.

The original foundation was built and verified as a working Milestone 0 example. It remains a useful baseline, but it is no longer the complete definition of SFHS.

## Active development direction

**PixiJS is the current primary game-development lane.** Recent project work is using Pixi to explore:

- sole-renderer presentation;
- single-file bundling of renderer code and assets;
- portrait-first mobile layouts;
- fullscreen and resize handling;
- touch-coordinate accuracy after resize;
- deterministic browser proofs;
- visual-effects and combat-readability systems;
- importing or migrating older Canvas 2D game presentations.

This work is still being developed in project repositories and branches. It has not yet been cleanly extracted into a stable SFHS plugin API in this repository.

## Other lanes

- **Canvas 2D:** verified baseline and compatibility lane.
- **DOM/CSS:** intended for text-heavy software, forms, dashboards, editors, and UI overlays.
- **Raycasting:** experimental pseudo-3D lane with specialized depth, sprite, cutout, and asset concerns.
- **Future browser lanes:** proposed only; no support promise.

See [`RENDERER-LANES.md`](RENDERER-LANES.md).

## Plugin-system state

The plugin system is **experimental and in progress**.

Current understanding:

- SFHS needs shared contracts for packaging, input, viewport, evidence, and self-containment.
- Renderer-specific behavior must stay inside renderer lanes or plugins.
- A project may need multiple cooperating capabilities without turning every capability into one permanent engine.
- The actual plugin boundary should be extracted from working projects rather than invented as a large abstract framework.

Not yet stable:

- plugin manifest schema;
- lifecycle hook names;
- capability negotiation;
- dependency/conflict behavior;
- package layout;
- CLI commands;
- public version compatibility guarantees.

See [`PLUGIN-SYSTEM-WIP.md`](PLUGIN-SYSTEM-WIP.md).

## Repository roles

### `single-file-html-software`

Authoritative public work-in-progress record for architecture, shared code, experiments, phase history, and project awareness.

### `sfhs-preview`

Replaceable browser review slot for the latest candidate. It is not source authority, release approval, or long-term artifact storage.

## Immediate project need

The next useful engineering step is not hardening. It is inventory and extraction:

1. identify reusable code already proven in active Pixi work;
2. separate game-specific code from generic SFHS behavior;
3. document the smallest real plugin seam;
4. bring one minimal Pixi lane example into this repository;
5. keep Canvas 2D and other lanes visible without pretending they are equally mature.

## Current public-project verdict

```text
Repository visibility:       PUBLIC
Project maturity:            WORK IN PROGRESS
Checked-in runnable lane:    CANVAS 2D BASELINE
Active development lane:     PIXIJS
Plugin API:                  EXPERIMENTAL / UNSTABLE
Multi-lane support:          DIRECTION, NOT COMPLETE
Production framework:        NOT CLAIMED
```
