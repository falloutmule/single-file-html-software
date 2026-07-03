# AGENTS.md — Agent Rules

> Rules for AI coding agents working on this repository.
> **Violating any MUST rule is a build-blocking defect.**

## 1. Release Target

- The single-file release artifact is **`dist/index.html`**.
- Every build candidate MUST produce a self-contained `dist/index.html`.
- No other files in `dist/` are permitted for Milestone 0.

## 2. Self-Containment

The release HTML file **MUST NOT** require:

| Prohibited dependency | Reason |
|---|---|
| Runtime network calls (fetch, XHR, WebSocket, beacon) | Offline-first guarantee |
| CDN-hosted scripts or libraries | No external dependencies |
| External fonts (@font-face to remote URL) | Offline guarantee |
| External images (img/src to remote URL) | Offline guarantee |
| External audio (audio/src to remote URL) | Offline guarantee |
| External stylesheets (link to remote CSS) | Offline guarantee |
| External scripts (script src to remote URL) | Offline guarantee |

**Allowed at build time only:** dev dependencies, bundlers, test frameworks.
**Allowed inline in dist/index.html:** base64-encoded assets, embedded SVGs, data URIs.

## 3. Source Editing

- Edit readable source under **`src/`** only.
- **NEVER** edit minified, bundled, or generated output files directly.
- All changes flow through the build pipeline: `src/` → build → `dist/`.

## 4. Input Architecture

Input flows through a strict pipeline:

```
Raw Input (keyboard, pointer, touch, gamepad, sensors)
  → Action Map (translates raw events into abstract actions)
    → Simulation (updates game/software state, pure logic)
      → Render (reads state, draws frame, MUST NOT mutate state)
```

### Key Rules

- **Action Map layer** decouples input hardware from game logic. No direct `keyCode` checks in simulation code.
- **Render layer is read-only.** Drawing code MUST NOT call state-mutating functions, set game variables, or have side effects beyond the canvas/DOM.
- **Simulation is deterministic.** Given the same input sequence and seed, it produces the same state.

## 5. Save Files

Save files (localStorage, IndexedDB, or downloadable blobs) MUST serialize **durable state only**:

- ✅ Game state, scores, progress, settings, inventory, level data
- ❌ DOM nodes, canvas pixel data, audio buffers, particle systems, caches, computed/derived data

### Save/Load Contract

- `save()` serializes a plain object or JSON string of durable state.
- `load()` reconstructs game state from that serialized form — no DOM or canvas restoration.
- Save format MUST be round-trippable: `load(save(state))` equals `state`.

## 6. Mobile Requirements

All game surfaces MUST implement the following mobile patterns:

| Requirement | Details |
|---|---|
| **Full viewport** | Use `100dvh` (dynamic viewport height) for game container |
| **Safe-area padding** | Apply `env(safe-area-inset-*)` padding inside game area |
| **Viewport resize** | Listen to `visualViewport.resize` event, NOT just `window.resize` |
| **Touch handling** | Set `touch-action: none` on all game surface elements |
| **Pointer-ID tracking** | Track multi-touch via `pointerId` — never assume single pointer |
| **Pointercancel** | Always handle `pointercancel` events to clean up active pointers |
| **No hover-only controls** | Every control MUST work with touch/pointer-down, not just hover |

### Mobile CSS Minimum

```css
.game-container {
  height: 100dvh;
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.game-surface {
  touch-action: none;
}
```

## 7. Testing Contract

Every build candidate (`dist/index.html`) MUST pass:

### Smoke Tests

1. **No console errors** — `window.onerror` and uncaught promise rejections MUST be zero.
2. **No uncaught page errors** — page loads without crash.
3. **Canvas exists** — a `<canvas>` element is present in the DOM after init.
4. **Frame loop advances** — `requestAnimationFrame` callback fires and increments a frame counter.
5. **No unexpected external requests** — zero network calls to non-`data:` URLs after load.
6. **Save/load round-trip** — if save functionality exists, `load(save(state))` produces equivalent state.
7. **Screenshot captured** — canvas `toDataURL()` or `toBlob()` succeeds without error.
8. **Mobile viewport smoke** — when loaded in a mobile-sized viewport, the game container fills `100dvh` with safe-area padding applied.

### Integration Tests (Playwright)

See [`docs/testing/testing-contract.md`](docs/testing/testing-contract.md) for full Playwright expectations.

## 8. Default Engine

The default rendering engine is **Canvas 2D + DOM/CSS overlay**:

- **Canvas 2D** — primary rendering surface for game graphics via `CanvasRenderingContext2D`.
- **DOM/CSS overlay** — UI elements (menus, HUD, dialogs) rendered as standard HTML/CSS positioned over the canvas.

See [`docs/engines/canvas2d-baseline.md`](docs/engines/canvas2d-baseline.md) for full engine specification.

## 9. File Conventions

| Path | Purpose |
|---|---|
| `src/` | Human-readable source (edit here) |
| `src/shell/` | HTML shell, CSS, entry point |
| `src/core/` | Engine, simulation, rendering, input, save/load |
| `dist/` | Build output (generated, never edit) |
| `dist/index.html` | Single-file release artifact |
| `docs/` | Design documents and specifications |
| `tests/` | Playwright and test infrastructure |
| `AGENTS.md` | This file — rules for AI agents |
| `README.md` | Project overview and quick-start |
