# Testing Contract

Every build candidate (`dist/index.html`) MUST pass all tests defined here before it can be considered a valid release.

## Scope

These tests apply to the **built artifact** — `dist/index.html` opened in a real browser. Source-level unit tests are complementary but not a substitute; the contract tests verify the actual deliverable.

## Must-Pass Smoke Tests

Each of the following is a **hard requirement**. A build that fails any test is rejected.

### 1. No Console Errors

The page must load and run with **zero** messages on `console.error`, `console.warn` (from application code — browser-internal warnings are exempt), and **zero** uncaught exceptions.

```javascript
// Track during test
let errors = [];
window.onerror = (msg) => errors.push(msg);
window.addEventListener('unhandledrejection', (e) => errors.push(e.reason));
// After reasonable runtime:
assert(errors.length === 0);
```

### 2. No Uncaught Page Errors

The page must not crash. `document.readyState` reaches `"complete"`. No fatal JavaScript errors prevent execution.

### 3. Canvas Exists

A `<canvas>` element must be present in the DOM after initialization:

```javascript
const canvas = document.querySelector('canvas');
assert(canvas !== null);
assert(canvas.getContext('2d') !== null);
```

### 4. Frame Loop Advances

The `requestAnimationFrame` loop must be running. A frame counter must increment within a reasonable time window:

```javascript
// Inject or read frame counter, wait 200ms, verify increment
await page.waitForTimeout(200);
assert(frameCount > 0);
```

### 5. No Unexpected External Requests

After page load, there must be **zero** network requests to non-`data:` URLs. This includes fetch, XHR, WebSocket, `<img>` loads, `<link>` loads, `<script>` loads from external hosts.

```javascript
// Use Playwright route interception
const externalRequests = [];
page.on('request', (req) => {
  if (!req.url().startsWith('data:')) {
    externalRequests.push(req.url());
  }
});
await page.goto('file:///path/to/dist/index.html');
// After load + brief runtime:
assert(externalRequests.length === 0);
```

### 6. Save/Load Round-Trip (if save exists)

If the application exposes save functionality:

```javascript
const originalState = getState();        // get current game state
const saved = save(originalState);       // serialize
const loaded = load(saved);              // deserialize
assert(deepEqual(loaded, originalState)); // round-trip invariant
```

This must hold for all save formats (localStorage, IndexedDB, blob).

### 7. Screenshot Captured

The canvas must support `toDataURL()` or `toBlob()` without error:

```javascript
const canvas = document.querySelector('canvas');
const dataUrl = canvas.toDataURL('image/png');
assert(dataUrl.startsWith('data:image/png'));
```

This verifies the canvas is operational and not tainted (no cross-origin image issues).

### 8. Mobile Viewport Smoke

When loaded in a mobile-sized viewport (e.g., 375×812 iPhone X):

- The game container fills the viewport height.
- `100dvh` is applied (not just `100vh`).
- Safe-area inset padding is present (may be 0 on non-notch devices, but the CSS property must be referenced).
- `touch-action: none` is set on the game surface.

```javascript
await page.setViewportSize({ width: 375, height: 812 });
await page.goto('file:///path/to/dist/index.html');

const container = await page.$('.game-container, [data-game-container], canvas');
const box = await container.boundingBox();
assert(box.height > 700); // roughly fills viewport

const touchAction = await container.evaluate(el =>
  getComputedStyle(el).touchAction
);
assert(touchAction === 'none');
```

## Playwright Integration Tests

### Test Runner Configuration

```javascript
// playwright.config.js
{
  testDir: './tests',
  use: {
    viewport: { width: 1280, height: 720 },
    // Test with file:// protocol (no server needed for self-contained files)
    baseURL: 'file:///' + path.resolve(__dirname, 'dist/index.html'),
  },
  retries: 0,  // No flake tolerance — failures are real
  timeout: 10000,
}
```

### Test File Structure

```
tests/
  smoke.spec.js          # All 8 smoke tests above
  mobile-viewport.spec.js # Mobile-specific smoke tests (test 8 expanded)
  save-load.spec.js       # Save/load round-trip tests (test 6 expanded)
  network-isolation.spec.js # Network request interception (test 5 expanded)
  fixtures/
    helpers.js            # Shared utilities (deepEqual, frame counter injection)
```

### Running Tests

```bash
# Run all contract tests
npx playwright test

# Run specific suite
npx playwright test tests/smoke.spec.js

# Run with UI for debugging
npx playwright test --ui

# Run in headed mode to see the browser
npx playwright test --headed
```

### Test Environment

- **Browser targets:** Chromium (primary), WebKit (mobile check), Firefox (compatibility).
- **Protocol:** `file://` — no HTTP server needed since `dist/index.html` is self-contained.
- **Timeout:** 10 seconds per test. A self-contained single file should initialize fast.

## What Is NOT Required (Yet)

These are **not** Milestone 0 requirements but may be added later:

- Performance benchmarks (FPS targets, draw call counts).
- Accessibility audits (WCAG compliance).
- Cross-browser rendering pixel-matching.
- Automated visual regression testing.
- Load testing / stress testing.

## Pre-Merge Gate

In CI, the full Playwright suite must pass before any merge to `main`. A failing test blocks the PR — no exceptions.

```yaml
# Example CI step
- run: npx playwright test
  working-directory: ./single-file-html-software
```
