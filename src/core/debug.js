/**
 * debug.js — Debug overlay, FPS counter, and log buffer
 */

let _overlay  = null;
let _visible  = false;
let _fpsEl    = null;
let _fpsFrame = 0;
let _fpsLast  = performance.now();
let _fpsVal   = 0;
let _fpsRaf   = null;

/** Ring-buffer log (capped at 200 entries) */
const MAX_LOG = 200;
const _log    = [];

function renderLog() {
  if (!_overlay) return;
  _log.forEach((entry) => {
    const el = document.createElement('div');
    el.textContent = `[${entry.time}] ${entry.msg}`;
    _overlay.appendChild(el);
  });
  // Keep DOM in sync with buffer
  while (_overlay.children.length > MAX_LOG) {
    _overlay.removeChild(_overlay.firstChild);
  }
  _overlay.scrollTop = _overlay.scrollHeight;
}

/**
 * Initialise the debug system.
 * @param {HTMLElement} overlayEl - The debug overlay div from the HTML.
 */
export function initDebug(overlayEl) {
  _overlay = overlayEl;

  // Create FPS element
  _fpsEl = document.createElement('div');
  _fpsEl.id = 'debug-fps';
  _fpsEl.style.fontWeight = 'bold';
  _overlay.appendChild(_fpsEl);
}

/** Toggle the debug overlay visibility. */
export function toggleDebug() {
  _visible = !_visible;
  if (_overlay) {
    _overlay.classList.toggle('hidden', !_visible);
  }
}

/**
 * Append a message to the debug log buffer.
 * Only renders when overlay is visible.
 */
export function logDebug(msg) {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8);
  _log.push({ time, msg });
  if (_log.length > MAX_LOG) _log.shift();

  if (_visible && _overlay) {
    renderLog();
  }
}

/** Start showing the FPS counter. */
export function showFPS() {
  if (_fpsRaf !== null) return; // already running
  _fpsFrame = 0;
  _fpsLast  = performance.now();

  function tick() {
    _fpsFrame++;
    const now = performance.now();
    const elapsed = now - _fpsLast;
    if (elapsed >= 1000) {
      _fpsVal   = Math.round((_fpsFrame * 1000) / elapsed);
      _fpsFrame = 0;
      _fpsLast  = now;
      if (_fpsEl) {
        _fpsEl.textContent = `FPS: ${_fpsVal}`;
      }
    }
    _fpsRaf = requestAnimationFrame(tick);
  }
  _fpsRaf = requestAnimationFrame(tick);
}

/** Stop the FPS counter. */
export function hideFPS() {
  if (_fpsRaf !== null) {
    cancelAnimationFrame(_fpsRaf);
    _fpsRaf = null;
  }
  if (_fpsEl) {
    _fpsEl.textContent = '';
  }
}
