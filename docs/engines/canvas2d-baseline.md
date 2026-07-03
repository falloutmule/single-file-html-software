# Canvas 2D Baseline Engine

## What It Is

The **Canvas 2D + DOM/CSS overlay** engine is the default rendering system for all projects in this repo. It combines a `<canvas>` element for pixel-level game graphics with standard HTML/CSS for UI elements, layered on top.

## Why This Engine First

| Factor | Canvas 2D + DOM | WebGL | SVG/DOM-only |
|---|---|---|---|
| **Browser support** | Universal (IE9+) | ~97% (no old mobile) | Universal |
| **Complexity** | Low | High | Medium |
| **Bundle size** | Zero (native API) | May need libraries | Zero |
| **Pixel control** | Full | Full | Limited |
| **UI integration** | Native (real DOM) | Separate pass | Native |
| **Learning curve** | Gentle | Steep | Gentle |
| **Performance ceiling** | Good (2D) | Very high | Lower (many nodes) |

Canvas 2D is the right first engine because:

1. **Zero dependencies** — it's a native browser API. No libraries to inline.
2. **Universal support** — works on every target device, including older mobile browsers.
3. **Simple mental model** — draw calls are imperative and straightforward.
4. **DOM overlay** — UI (menus, text, buttons) uses real HTML, so accessibility and text rendering are free.
5. **Sufficient for most 2D games** — sprites, tiles, particles, shapes, gradients, transforms, compositing.

Future milestones may add WebGL as an optional engine for projects that need it, but Canvas 2D is always the baseline.

## Architecture

```
┌─────────────────────────────────────────┐
│              DOM Overlay (z-index: 10)   │
│  ┌─────────────────────────────────┐    │
│  │  HUD, menus, dialogs, text      │    │
│  │  (real HTML/CSS elements)       │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│         Canvas 2D Surface (z-index: 1)   │
│  ┌─────────────────────────────────┐    │
│  │  Game graphics, sprites,       │    │
│  │  particles, shapes, effects    │    │
│  │  (via CanvasRenderingContext2D) │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│           Background (z-index: 0)         │
│  Solid color, gradient, or pattern       │
└─────────────────────────────────────────┘
```

### Layer Separation

- **Canvas layer** — game world rendering. Positioned behind the overlay. Full-viewport canvas.
- **DOM overlay** — UI elements. Positioned on top of the canvas. Uses `pointer-events: none` on the container, `pointer-events: auto` on interactive elements.
- **Background** — the page background visible behind/around the canvas.

### HTML Structure

```html
<div class="game-container">
  <!-- Canvas: game graphics -->
  <canvas id="game-canvas"></canvas>

  <!-- DOM overlay: UI elements -->
  <div id="ui-overlay">
    <div id="hud"><!-- Score, health, etc. --></div>
    <div id="menu-screen"><!-- Start menu --></div>
    <div id="dialog-box"><!-- In-game dialogs --></div>
  </div>
</div>
```

### CSS Positioning

```css
.game-container {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

#game-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  touch-action: none;
}

#ui-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 10;
  pointer-events: none; /* pass-through by default */
}

#ui-overlay button,
#ui-overlay [data-interactive] {
  pointer-events: auto; /* capture on interactive elements */
}
```

## Canvas 2D Capabilities

### Drawing Primitives

The engine leverages the full `CanvasRenderingContext2D` API:

| Category | Methods |
|---|---|
| **Shapes** | `fillRect`, `strokeRect`, `fillRect`, `arc`, `ellipse`, `moveTo`/`lineTo` |
| **Paths** | `beginPath`, `closePath`, `fill`, `stroke`, `clip` |
| **Text** | `fillText`, `strokeText`, `measureText` |
| **Images** | `drawImage` (sprites, spritesheets, tilemaps) |
| **Transforms** | `translate`, `rotate`, `scale`, `setTransform`, `save`/`restore` |
| **Compositing** | `globalCompositeOperation`, `globalAlpha` |
| **Gradients** | `createLinearGradient`, `createRadialGradient` |
| **Patterns** | `createPattern` |
| **Pixel data** | `getImageData`, `putImageData` |
| **State** | `save`, `restore`, `fillStyle`, `strokeStyle`, `lineWidth`, `font` |

### Sprite System

Sprites are drawn from inlined base64 images or from generated canvases (for procedurally created graphics):

```javascript
// Load from base64 (embedded in HTML)
const img = new Image();
img.src = 'data:image/png;base64,...';

// Or generate procedurally
const spriteCanvas = document.createElement('canvas');
spriteCanvas.width = 32;
spriteCanvas.height = 32;
const spriteCtx = spriteCanvas.getContext('2d');
// Draw sprite procedurally...
```

### Animation Frame Pattern

```javascript
let lastTime = 0;
let frameCount = 0;

function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000; // seconds
  lastTime = timestamp;
  frameCount++;

  simulation.update(dt, input.getActions());
  render.draw(simulation.getState());

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

### Canvas Sizing

The canvas internal resolution (buffer) is managed separately from its CSS display size:

```javascript
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  // All drawing coordinates remain in CSS pixels
}
```

This ensures crisp rendering on high-DPI (Retina) displays.

## What This Engine Supports

### Games

- 2D platformers, top-down adventures, puzzle games, card games, board games, visual novels, tycoon games.
- Sprite-based rendering with spritesheet animation.
- Tile-based worlds with camera/viewport scrolling.
- Particle systems for effects.
- Procedural graphics for simple games (no external images needed).

### Interactive Software

- Data visualizations.
- Simulations.
- Interactive tools.
- Educational software.
- Creative tools.

### Performance Characteristics

| Resolution | Sprites | Particles | Expected FPS |
|---|---|---|---|
| 1920×1080 | < 500 | < 200 | 60 FPS |
| 1920×1080 | < 1000 | < 500 | 30–60 FPS |
| 3840×2160 (4K) | < 500 | < 200 | 30–60 FPS |
| Mobile (375×812) | < 300 | < 100 | 60 FPS |

Performance depends heavily on draw call count and overdraw. Profile with `performance.now()` and Chrome DevTools.

## When to Use a Different Engine

Consider WebGL (future milestone) if:

- Rendering thousands of sprites per frame.
- Need 3D or pseudo-3D perspective.
- Require shader-based effects (lighting, shadows, distortion).
- Building a high-performance particle system (>1000 particles).

Canvas 2D remains the default even when WebGL is available — choose WebGL only when Canvas 2D's performance ceiling is demonstrably insufficient.
