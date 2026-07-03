/**
 * viewport.js — Canvas sizing & resize handling
 */

const SAFE_AREA_TOP    = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)'))    || 0;
const SAFE_AREA_RIGHT  = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)'))  || 0;
const SAFE_AREA_BOTTOM = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
const SAFE_AREA_LEFT   = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)'))   || 0;

let _canvas = null;
let _width  = 0;
let _height = 0;

function applySize() {
  if (!_canvas) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  _canvas.width  = w;
  _canvas.height = h;
  _width  = w;
  _height = h;
}

/**
 * Initialise viewport tracking for a canvas element.
 * Returns { width, height } accessors.
 */
export function initViewport(canvas) {
  _canvas = canvas;
  applySize();

  // Listen for resize (visualViewport for accuracy on mobile)
  const viewport = window.visualViewport;
  if (viewport) {
    viewport.addEventListener('resize', applySize);
  } else {
    window.addEventListener('resize', applySize);
  }

  return {
    get width()  { return _width;  },
    get height() { return _height; },
    getSafeArea() {
      return {
        top:    SAFE_AREA_TOP(),
        right:  SAFE_AREA_RIGHT(),
        bottom: SAFE_AREA_BOTTOM(),
        left:   SAFE_AREA_LEFT(),
      };
    },
    refresh() { applySize(); },
  };
}
