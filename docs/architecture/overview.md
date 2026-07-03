# Architecture Overview

## Source Tree

```
single-file-html-software/
├── AGENTS.md                          # Agent rules (read-first for contributors)
├── README.md                          # Project overview
├── package.json                       # Dev dependencies and build scripts
├── src/                               # Editable source (human-readable)
│   ├── shell/                         # HTML entry point and CSS
│   │   ├── index.html                 # HTML shell: canvas + overlay containers
│   │   └── styles.css                 # Viewport, safe-area, layout styles
│   └── core/                          # Engine source modules
│       ├── engine.js                  # Frame loop, lifecycle (init, update, draw, destroy)
│       ├── input.js                   # Action map, pointer-ID tracking, keyboard abstraction
│       ├── render.js                  # Canvas 2D drawing layer (read-only on state)
│       ├── simulation.js              # Pure state logic (no DOM/canvas access)
│       └── save.js                    # Serialize/deserialize durable state
├── dist/                              # Generated output (never edit)
│   └── index.html                    # Single-file release artifact
├── docs/                              # Design documents
│   ├── architecture/
│   │   └── overview.md                # This file
│   ├── testing/
│   │   └── testing-contract.md        # Build candidate test requirements
│   ├── engines/
│   │   └── canvas2d-baseline.md        # Canvas 2D engine specification
│   └── controls/
│       └── mobile-controls.md          # Mobile input patterns
└── tests/                             # Test infrastructure
    ├── smoke.spec.js                  # Playwright smoke tests
    └── fixtures/                      # Test fixtures and helpers
```

## Layer Descriptions

### 1. Shell Layer (`src/shell/`)

The entry point. A minimal HTML file that:

- Declares the `<canvas>` element for 2D rendering.
- Declares a DOM overlay container for UI (menus, HUD, text).
- Loads CSS for viewport management (`100dvh`, safe-area insets).
- Bootstraps the engine via a single `<script>` entry that imports and initializes core modules.

**This layer owns:** viewport sizing, DOM structure, CSS layout.

### 2. Engine Layer (`src/core/engine.js`)

The frame loop and lifecycle manager:

- Calls `init()` once on load.
- Runs `requestAnimationFrame` loop: each tick calls `simulation.update()` then `render.draw()`.
- Handles cleanup on page unload (`beforeunload`, `visibilitychange`).
- Provides timing (delta time, frame count) to all subsystems.

**This layer owns:** the game loop, timing, lifecycle hooks.

### 3. Input Layer (`src/core/input.js`)

Translates raw browser events into abstract actions:

- **Raw events:** `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `keydown`, `keyup`, device orientation, gamepad.
- **Action map:** a configurable mapping from raw events to named actions (e.g., `"move-left"`, `"confirm"`, `"pause"`).
- **Pointer-ID tracking:** maintains a map of active `pointerId` values for multi-touch.
- **Consumers:** simulation reads the action state each tick; never raw event properties.

**This layer owns:** event listeners, action mapping, pointer tracking.

### 4. Simulation Layer (`src/core/simulation.js`)

Pure state logic with no side effects:

- Receives the current action state each tick.
- Updates game state deterministically.
- Has zero knowledge of Canvas, DOM, or rendering.
- Produces a state object that the render layer reads.

**This layer owns:** game rules, state transitions, physics, AI logic.

### 5. Render Layer (`src/core/render.js`)

Read-only drawing layer:

- Reads (never writes) the simulation state.
- Draws to the Canvas 2D context.
- Updates DOM overlay elements (HUD text, menus) by reading state.
- MUST NOT mutate any simulation state variable or call any state-changing function.

**This layer owns:** all visual output — canvas drawing and DOM updates.

### 6. Save Layer (`src/core/save.js`)

Durable state persistence:

- `save(state)` — serializes state to a plain object/JSON (no DOM, no canvas, no caches).
- `load(json)` — reconstructs state from serialized form.
- Storage backends: `localStorage` (default), IndexedDB, or downloadable JSON blob.
- Round-trip invariant: `load(save(state))` ≡ `state`.

**This layer owns:** serialization, deserialization, storage backend.

## Build Pipeline

```
src/shell/index.html    ──┐
src/shell/styles.css    ──┤
src/core/*.js           ──┼──► Build Tool ──► dist/index.html
                         │    (inline all)
                         │    (minify CSS/JS)
                         │    (embed assets)
                         └─────► Single HTML file
```

### Build Requirements

1. **Inline all JS** — concatenate and optionally minify all `src/core/*.js` modules into `<script>` tags.
2. **Inline all CSS** — embed `styles.css` into a `<style>` tag.
3. **Embed assets** — convert any images/audio to base64 data URIs.
4. **Self-contained output** — the resulting `dist/index.html` makes zero network requests after load.
5. **No source maps in output** — keep the file clean and self-contained.

### Build Tooling (Milestone 0)

A simple Node.js script or Make target that:
- Reads `src/shell/index.html` as the template.
- Inlines all core modules in dependency order.
- Inlines CSS.
- Writes to `dist/index.html`.

Future milestones may upgrade to a bundler (esbuild, rollup) for module handling.

## Data Flow

```
┌──────────┐    raw events    ┌────────────┐   actions    ┌────────────┐
│  Browser  │ ──────────────► │ Input Layer │ ──────────► │ Simulation │
│ (pointer, │                 │ (action map)│             │ (pure logic)│
│  keyboard,│                 └────────────┘             └──────┬─────┘
│  touch)   │                                                │ state
└──────────┘                                                ▼
                                                     ┌────────────┐
                                                     │   Render    │
                                                     │ (read-only) │
                                                     └──────┬─────┘
                                                            │
                                                            ▼
                                                     ┌────────────┐
                                                     │ Canvas + DOM│
                                                     │  (display)  │
                                                     └────────────┘
```

The simulation produces state; the render consumes it. This separation ensures rendering bugs cannot corrupt game state, and the simulation can be tested independently of any visual output.
