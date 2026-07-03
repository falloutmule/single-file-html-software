# Mobile Controls

Patterns and requirements for touch/mobile input in this project.

## Viewport Setup

### Full-Screen Viewport

The game must fill the entire device viewport. Use **`100dvh`** (dynamic viewport height), not `100vh`:

- `100vh` is broken on mobile Safari — it doesn't shrink when the URL bar appears.
- `100dvh` tracks the actual visible viewport, adjusting as browser chrome shows/hides.

```css
.game-container {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}
```

### Fallback for Older Browsers

For browsers that don't support `dvh`:

```css
.game-container {
  height: 100vh; /* fallback */
  height: 100dvh; /* override when supported */
}
```

### Safe-Area Padding

Devices with notches, rounded corners, or home indicators have areas the UI should avoid:

```css
.game-container {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}
```

The game surface (canvas) can extend edge-to-edge behind the safe area, but **interactive elements** must stay within safe bounds.

### Viewport Meta Tag

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

- `viewport-fit=cover` enables the full screen on notched devices.
- Without it, `env(safe-area-inset-*)` values are always 0.

## Viewport Resize Handling

### Use `visualViewport`, Not `window.resize`

On mobile, `window.resize` doesn't fire when the URL bar appears/disappears, or when the on-screen keyboard shows/hides. Use the **Visual Viewport API**:

```javascript
function onViewportResize() {
  const vv = window.visualViewport;
  const width = vv.width;
  const height = vv.height;
  // Resize canvas and layout
  resizeGame(width, height);
}

window.visualViewport.addEventListener('resize', onViewportResize);
window.visualViewport.addEventListener('scroll', onViewportResize);
```

### `visualViewport` Events

| Event | When It Fires |
|---|---|
| `resize` | Viewport dimensions change (keyboard, orientation, URL bar) |
| `scroll` | Viewport is panned (e.g., by pinch-zoom or scroll) |
| `scrollend` | Panning completes |

### Initialization

```javascript
// Fire once on load, then on every resize
onViewportResize();
window.visualViewport.addEventListener('resize', onViewportResize);
```

## Touch Handling

### `touch-action: none`

Prevent browser default touch behaviors (scrolling, zooming, text selection) on all game surface elements:

```css
#game-canvas,
.game-surface,
[data-game-surface] {
  touch-action: none;
}
```

This is **mandatory** on every element that receives game input. Without it, swiping scrolls the page instead of being captured as game input.

### Pointer Events (Preferred Over Touch Events)

Use the **Pointer Events API** instead of separate touch/mouse event handlers. Pointer events unify all input types:

| Use this | Not this |
|---|---|
| `pointerdown` | `mousedown` + `touchstart` |
| `pointermove` | `mousemove` + `touchmove` |
| `pointerup` | `mouseup` + `touchend` |
| `pointercancel` | `touchcancel` |
| `pointerId` | Tracking touches by index |

```javascript
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerCancel);
```

## Pointer-ID Tracking

Mobile devices support multi-touch. Never assume a single active pointer. Track each pointer by its `pointerId`:

```javascript
const activePointers = new Map(); // pointerId → { x, y, action }

function onPointerDown(e) {
  e.preventDefault();
  activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY,
    startX: e.clientX,
    startY: e.clientY,
  });
}

function onPointerMove(e) {
  const ptr = activePointers.get(e.pointerId);
  if (ptr) {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
  }
}

function onPointerUp(e) {
  activePointers.delete(e.pointerId);
}
```

### Why Pointer-ID Matters

- A finger lift may not correspond to the first finger that touched down.
- Multi-touch gestures (pinch, rotate) require tracking multiple pointers simultaneously.
- Without pointer-ID, lifting one finger can "steal" control from another finger's active gesture.

## Pointercancel Handling

`pointercancel` fires when the browser cancels a pointer — common scenarios:

- A system gesture intercepts the touch (notification swipe, control center).
- The browser decides the touch is a scroll/zoom (if `touch-action` isn't set correctly).
- An incoming call or system dialog appears.
- The pointer is captured by another element.

**You MUST handle `pointercancel`** to clean up state. Without it, "ghost pointers" persist — the game thinks a finger is still down after the browser took control away:

```javascript
function onPointerCancel(e) {
  // Remove from active tracking
  activePointers.delete(e.pointerId);

  // If this pointer was controlling something, cancel that action
  cancelActionForPointer(e.pointerId);
}
```

### Common Bug Pattern

```javascript
// BUG: only handles pointerup, not pointercancel
canvas.addEventListener('pointerup', (e) => {
  activePointers.delete(e.pointerId);
});
// If a system notification steals the touch, pointerup never fires.
// The pointer stays "active" forever.

// FIX: handle both
canvas.addEventListener('pointerup', (e) => {
  activePointers.delete(e.pointerId);
});
canvas.addEventListener('pointercancel', (e) => {
  activePointers.delete(e.pointerId);
});
```

## Virtual Controls (On-Screen)

When the game needs virtual buttons, d-pads, or joysticks:

### Positioning

- Place controls at the bottom of the screen (thumb-reachable).
- Use `env(safe-area-inset-bottom)` to avoid home indicator overlap.
- Make hit targets at least **44×44 CSS pixels** (Apple HIG minimum tap target).

### D-Pad Example

```html
<div class="virtual-dpad" data-interactive>
  <button class="dpad-up" data-action="move-up">▲</button>
  <button class="dpad-left" data-action="move-left">◀</button>
  <button class="dpad-right" data-action="move-right">▶</button>
  <button class="dpad-down" data-action="move-down">▼</button>
</div>
```

### Joystick (Analog)

For analog input (variable speed/direction):

```javascript
function createVirtualJoystick(container) {
  let origin = null;
  let pointerId = null;

  container.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointerId = e.pointerId;
    origin = { x: e.clientX, y: e.clientY };
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId || !origin) return;
    const dx = e.clientX - origin.x;
    const dy = e.clientY - origin.y;
    const maxDist = 50; // pixels
    const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxDist);
    const angle = Math.atan2(dy, dx);
    // Normalize to -1..1
    const nx = (dist / maxDist) * Math.cos(angle);
    const ny = (dist / maxDist) * Math.sin(angle);
    input.setAction('joystick', { x: nx, y: ny });
  });

  const cleanup = (e) => {
    if (e.pointerId === pointerId) {
      pointerId = null;
      origin = null;
      input.setAction('joystick', { x: 0, y: 0 });
    }
  };
  container.addEventListener('pointerup', cleanup);
  container.addEventListener('pointercancel', cleanup);
}
```

## Full Mobile Input Checklist

- [ ] `100dvh` on game container (not `100vh`)
- [ ] `viewport-fit=cover` in meta tag
- [ ] `env(safe-area-inset-*)` padding
- [ ] `visualViewport` resize listener (not just `window.resize`)
- [ ] `touch-action: none` on all game surfaces
- [ ] Pointer events used (not separate touch/mouse)
- [ ] `pointerId` tracked in a Map (no single-pointer assumption)
- [ ] `pointercancel` handler cleans up active pointers
- [ ] Virtual controls at bottom with safe-area offset
- [ ] Hit targets ≥ 44×44 CSS pixels
- [ ] No hover-only controls (everything works on touch)
- [ ] Orientation change handled gracefully
- [ ] Keyboard appearance doesn't break layout
