# Active Pixi source inventory

**Status:** WIP source-awareness checkpoint  
**Evidence date:** 2026-07-26  
**Scope:** inspection only; no runtime code was moved or extracted.

## Inspection basis

- **VERIFIED:** public-awareness repository `falloutmule/single-file-html-software` main at `61964b47f1eb62b502ece31236b80219e01ac2e2`.
- **VERIFIED:** canonical SFHS source root: `C:\\Users\\fallo\\Documents\\SFHS`, branch `main`, commit `6df0194815d375c5525292a57729792716d05fd2`, clean, with no configured remote reported by the local inspection.
- **VERIFIED:** clean Pixi/HOMEOSTASIS QA candidate: `C:\\tmp\\homeostasis-qa-110-visual-gate`, branch `codex/homeostasis-qa-110-visual-gate`, commit `95e9c418880e77c09fb774ccd01ff5631eed3334`.
- **INFERRED:** the canonical root remains source authority; the QA worktree is the active clean candidate for automated Pixi visual work. A separate uncommitted game-specific repair was deliberately excluded.

The public repository contains the Canvas 2D foundation and project-awareness documents. It is not the active Pixi implementation root.

## Commands found in the active source

**VERIFIED:** pnpm workspace (pnpm 11.9.0; Node >=24 declared).

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm determinism
pnpm browser-smoke
pnpm browser-scenarios
pnpm sfhs pack --project examples/homeostasis
pnpm sfhs verify --project examples/homeostasis
node examples/homeostasis/tools/run-browser-proof.mjs
```

Use task-specific proof scripts under `examples/homeostasis/tools/` rather than assuming a historical global check proves a candidate.

## Module classification

| Area | Classification | Verified role | Reuse assessment |
|---|---|---|---|
| `packages/contracts/`, `packages/core/` | GENERIC-SHARED | Project manifest, identity, discovery, hashing | Strong shared candidate |
| `packages/pixi-runtime/src/index.ts` | GENERIC-SHARED | Viewport state, semantic actions, fixed-step and lifecycle contracts | Strong candidate; current game does not yet consume all of it |
| `adapters/pixi-v8/src/index.ts` | PIXI-LANE | Pixi v8 Application, one canvas, standard layer tree, resize/present/pause/destroy | Reusable Pixi lane adapter, not renderer-neutral |
| `packages/pixi-runtime/src/fx.ts` | GENERIC-SHARED | Deterministic visual-event/pool contracts | Candidate shared presentation infrastructure |
| `adapters/pixi-v8/src/fx.ts` | PIXI-LANE | Pixi Graphics effect implementation | Reusable only within Pixi lane |
| `packages/builder/`, `packages/packer/` | BUILD-TOOLING | Deterministic build and one-HTML pack | Reusable pattern; extraction is not yet justified |
| `packages/verifier/`, `packages/browser-runner/`, `packages/evidence/` | VERIFICATION-TOOLING | Artifact hash, request audit, browser proof, evidence/release gate | Useful but policy-coupled |
| `packages/renderer-classifier/` | GENERIC-SHARED / VERIFICATION-TOOLING | Static/runtime renderer truth; detects redundant Canvas/Pixi arrangements | Strong import/verification candidate |
| `packages/canvas-capability-analyzer/` | CANVAS2D-LANE | Canvas API inventory and fail-closed classification | Canvas import lane only |
| `packages/pixi-canvas-compat*/` | PIXI-LANE | Bounded Canvas-style presentation over Pixi with explicit approximations | Pixi migration lane only |
| `packages/canvas-scaffold-generator/` | BUILD-TOOLING / CANVAS2D-LANE | Import scaffold from analysis | Incomplete scaffold; not a universal importer |
| `examples/homeostasis/src/simulation-*.ts` | HOMEOSTASIS-SPECIFIC | Renderer-neutral game snapshot and rules | Good separation pattern, not SFHS core |
| `examples/homeostasis/src/{main,renderer}.ts`, `index.html`, `styles.css` | HOMEOSTASIS-SPECIFIC | Game boot, DOM HUD, input, viewport shell, presenter | Reference implementation only |
| `examples/homeostasis/tools/` | VERIFICATION-TOOLING | Browser scenarios and proof scripts | Reusable test patterns; many assertions are game-specific |
| Raycasting implementation | RAYCAST-LANE / UNKNOWN | No active implementation found in this SFHS source root | Future lane; do not claim reusable code |
| DOM/CSS renderer implementation | DOM-LANE / UNKNOWN | HOMEOSTASIS uses DOM as an interface overlay, not an independent SFHS DOM renderer | Future lane remains visible |

## Verified architecture observations

- **VERIFIED:** the Pixi adapter owns a WebGL-preferred Pixi Application, one canvas, a canonical stage/layer hierarchy, resize, presentation, pause/resume, destroy, and diagnostics.
- **VERIFIED:** HOMEOSTASIS currently drives its own game boot, DOM controls, viewport layout, and browser frame loop around the presenter. Its canvas is non-interactive; touch input is DOM-owned.
- **VERIFIED:** the viewport path uses `visualViewport`/window resize and orientation events, CSS layout variables, Pixi renderer resize, and fullscreen refreshes.
- **VERIFIED:** renderer classification and Canvas import tools fail closed rather than treating a present Pixi object as proof of a Pixi presentation.
- **VERIFIED:** packaging/verifier tooling enforces a self-contained artifact and records exact bytes/hashes.
- **REPORTED:** physical Galaxy S21 Ultra remains a separate gate; automated proof is not physical acceptance.

## Boundaries

HOMEOSTASIS mechanics, HUD IDs, upgrade definitions, tissue/pathogen rules, boss behavior, and simulation schemas are **HOMEOSTASIS-SPECIFIC**. SNC is outside this inventory and must not be imported into SFHS.

This inventory is a map for a small experiment, not a stable API or package promise.
