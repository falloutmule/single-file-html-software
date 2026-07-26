# Single-File HTML Software (SFHS)

> **Work in progress.** SFHS is an experimental system for building self-contained HTML games and interactive software. Its architecture, plugin contracts, and project layout are still changing.

The release idea is simple: produce one `index.html` that can be opened in a modern browser without a server, CDN, or external runtime assets.

## Current development focus

SFHS is currently developing around a **PixiJS-first game lane** because recent work has focused on mobile rendering, touch input, fullscreen behavior, single-file packaging, browser verification, and visual-effects experiments.

PixiJS is the active lane, not the permanent definition of SFHS. The project also preserves or explores:

- **Canvas 2D** for lightweight games, prototypes, compatibility imports, and simple interactive software.
- **Raycasting** for pseudo-3D and first-person experiments.
- **DOM/CSS** for document, dashboard, editor, form, and text-heavy software.
- Future lanes such as SVG, Three.js, Babylon.js, WebGPU, audio-focused software, and other browser-native approaches.

See [`docs/RENDERER-LANES.md`](docs/RENDERER-LANES.md).

## What exists today

The repository currently contains the original Canvas 2D foundation:

- a mobile-aware HTML shell;
- action-mapped pointer and keyboard input;
- deterministic simulation/render separation;
- save/load scaffolding;
- a build step that emits `dist/index.html`;
- self-containment verification;
- Playwright smoke tests.

That foundation remains useful, but it is no longer the full project definition. Newer Pixi-oriented work and the plugin-system experiments are being tracked as separate development phases before they are generalized into stable repository code.

See:

- [`docs/CURRENT-STATE.md`](docs/CURRENT-STATE.md)
- [`docs/PHASES.md`](docs/PHASES.md)
- [`docs/DECISIONS.md`](docs/DECISIONS.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/PLUGIN-SYSTEM-WIP.md`](docs/PLUGIN-SYSTEM-WIP.md)

## Project status language

SFHS documentation distinguishes between:

- **Verified** — directly tested or inspected.
- **In progress** — active implementation work.
- **Experimental** — useful research without a stable contract.
- **Proposed** — a direction that has not been implemented.
- **Blocked** — work cannot honestly advance without a concrete dependency or decision.
- **Superseded** — preserved history that is no longer the active direction.

A passing automated test does not automatically mean a feature is usable on a physical device. Physical acceptance remains separate when touch, layout, performance, or visual clarity matter.

## Preview repository

Temporary browser candidates are hosted separately in [`falloutmule/sfhs-preview`](https://github.com/falloutmule/sfhs-preview).

That repository is a replaceable review slot. It is not the authoritative source, a release archive, or proof that a candidate has been accepted.

## Quick start for the original Canvas 2D foundation

```bash
git clone https://github.com/falloutmule/single-file-html-software.git
cd single-file-html-software
npm install
npm run build
npm run verify
npm test
```

The generated candidate is:

```text
dist/index.html
```

The current commands describe the original foundation only. They do not yet represent a finished multi-lane plugin system.

## Core principles being carried forward

- One self-contained HTML release artifact.
- No required runtime network access.
- Human-readable source is authoritative; generated output is not edited directly.
- Input is translated into named actions before simulation.
- Simulation and rendering remain separated.
- Rendering does not mutate gameplay state.
- Durable state is serialized without DOM, renderer, cache, or particle objects.
- Mobile layouts account for dynamic viewport changes, safe areas, pointer IDs, and `pointercancel`.
- Build and browser evidence must be tied to the exact candidate being discussed.
- Renderer-specific behavior belongs in a lane or plugin instead of silently becoming universal SFHS behavior.

## Repository purpose right now

This public repository is being used to:

- keep the project visible and versioned;
- maintain awareness of current and past directions;
- record lessons from working games and software;
- develop the plugin boundary gradually;
- track multiple renderer lanes without prematurely supporting all of them;
- preserve evidence and blockers honestly.

It is **not yet** a hardened SDK, stable public API, npm package, or contributor-ready framework.

## License

MIT
