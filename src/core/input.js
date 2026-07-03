/**
 * input.js — Pointer & keyboard input tracking
 */

/**
 * Initialise input listeners on the given canvas element.
 *
 * Returns:
 *   getPointer()        — { x, y, down }
 *   getKeys()           — object snapshot of currently-held keys
 *   isKeyDown(key)      — true while the key is held
 *   getAction()         — normalised direction { dx, dy } in [-1,1]
 */
export function initInput(canvas) {
  // ── Keyboard state ──────────────────────────────────────────
  const keys = {};

  function onKeyDown(e) {
    keys[e.key] = true;
    // Prevent default for game keys to avoid scroll / back-nav
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.key] = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ── Pointer state ──────────────────────────────────────────
  const pointer = { x: 0, y: 0, down: false, id: -1 };

  function onPointerDown(e) {
    // Capture first pointer only
    if (pointer.id !== -1) return;
    pointer.id   = e.pointerId;
    pointer.down = true;
    pointer.x    = e.clientX;
    pointer.y    = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (e.pointerId !== pointer.id) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  function onPointerUp(e) {
    if (e.pointerId !== pointer.id) return;
    pointer.down = false;
    pointer.id   = -1;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  }

  function onPointerCancel(e) {
    if (e.pointerId !== pointer.id) return;
    pointer.down = false;
    pointer.id   = -1;
  }

  canvas.addEventListener('pointerdown',  onPointerDown);
  canvas.addEventListener('pointermove',  onPointerMove);
  canvas.addEventListener('pointerup',    onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);

  // ── Direction mapping ──────────────────────────────────────
  function dirFromKeys() {
    let dx = 0, dy = 0;
    if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
    if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
    if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;
    return { dx, dy };
  }

  // ── Public API ─────────────────────────────────────────────
  return {
    getPointer() {
      return { x: pointer.x, y: pointer.y, down: pointer.down };
    },

    getKeys() {
      return { ...keys };
    },

    isKeyDown(key) {
      return !!keys[key];
    },

    getAction() {
      let { dx, dy } = dirFromKeys();

      // Normalise diagonal so you don't go faster diagonally
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 1) { dx /= len; dy /= len; }

      return { dx, dy };
    },

    /** Release all listeners */
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown',  onPointerDown);
      canvas.removeEventListener('pointermove',  onPointerMove);
      canvas.removeEventListener('pointerup',    onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}
