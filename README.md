# single-file-html-software

A factory for building self-contained single-file HTML games and interactive software. One HTML file. Zero dependencies. Works offline.

## What Is This?

Every release is a single `index.html` — no build server, no CDN, no external assets. Open it in any modern browser and it just works. On desktop, on mobile, offline, on a thumb drive.

The project provides:

- A **shell** — minimal HTML/CSS entry point that initializes the game surface.
- A **core engine** — Canvas 2D rendering, input handling, save/load, and a clean simulation/render separation.
- A **build pipeline** — inlines all source into one self-contained `dist/index.html`.
- A **testing contract** — every build must pass smoke and integration tests before ship.

## Milestone 0: Shell

**Status: 🚧 In Progress**

Milestone 0 delivers the foundational shell — the boilerplate that all future games build on top of:

- [ ] HTML shell with Canvas 2D surface and DOM overlay container
- [ ] Viewport setup: `100dvh`, safe-area insets, `visualViewport` resize
- [ ] Frame loop via `requestAnimationFrame`
- [ ] Input layer: pointer-ID tracking, `pointercancel` handling, action map
- [ ] Self-containment: zero external requests after load
- [ ] Save/load stub (serializes/restores durable state)
- [ ] Build script: `src/` → inline → `dist/index.html`
- [ ] Playwright smoke tests passing

### What's Done

- Git repo initialized with `src/shell/` and `src/core/` structure.
- Documentation scaffold (this file, AGENTS.md, docs/).

## Quick Start

```bash
# Clone
git clone <repo-url> single-file-html-software
cd single-file-html-software

# Build (once pipeline exists)
npm run build

# Open the result
open dist/index.html
# or: python -m http.server dist -p 8000
```

## Architecture

```
src/
  shell/          HTML entry point, CSS, boot sequence
  core/
    engine.js     Frame loop, lifecycle management
    input.js      Action map, pointer/keyboard/touch handling
    render.js     Canvas 2D drawing (read-only on state)
    simulation.js Pure state logic (no DOM/canvas access)
    save.js       Serialize/deserialize durable state
dist/
  index.html     Single-file build output (generated)
docs/             Design documents and specifications
```

Full architecture details: [`docs/architecture/overview.md`](docs/architecture/overview.md).

## Rules

This repo has strict rules for contributors — human and AI alike. See [`AGENTS.md`](AGENTS.md) for the complete rulebook.

Key principles:

- **Self-contained** — no runtime network calls, CDNs, or external assets.
- **Edit source, not output** — modify `src/`, never touch `dist/` directly.
- **Render is read-only** — drawing code must never mutate game state.
- **Mobile-first** — `100dvh`, safe areas, pointer-ID, `pointercancel`.
- **Test everything** — every build candidate must pass the smoke test contract.

## Default Engine

**Canvas 2D + DOM/CSS overlay.**

- Canvas 2D for game graphics (pixels, sprites, shapes).
- Standard HTML/CSS for UI (menus, HUD, text, dialogs).
- Works on every modern browser. No WebGL requirement.

Engine details: [`docs/engines/canvas2d-baseline.md`](docs/engines/canvas2d-baseline.md).

## License

MIT
