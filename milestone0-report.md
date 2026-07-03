# Milestone 0 Report

## Goal

Create the reusable single-file HTML game/software factory foundation:
repository structure, agent rules, core modules, shell, build pipeline,
verify script, Playwright smoke test, and a minimal playable shell proof.

## What was done

**verified** — Created GitHub repo: `falloutmule/single-file-html-software` (public)

**verified** — Scaffolded project tree with all Milestone 0 deliverables:

- `AGENTS.md` — permanent rules for coding agents (input pipeline, save contract, mobile requirements, testing contract, file conventions)
- `README.md` — project overview, quick-start, architecture summary
- `docs/architecture/overview.md` — system layers, data flow, build pipeline description
- `docs/engines/canvas2d-baseline.md` — Canvas 2D + DOM overlay engine specification
- `docs/controls/mobile-controls.md` — mobile control patterns (two-thumb, tap-zone, keyboard-pointer)
- `docs/testing/testing-contract.md` — Playwright test expectations and smoke test spec
- `src/shell/app-shell.html` — HTML5 shell with title screen, game screen, canvas, debug overlay
- `src/shell/styles.css` — full CSS with 100dvh, safe-area, touch-action, debug overlay
- `src/shell/main.js` — self-contained game bootstrap: title screen, Start button, rAF game loop, blue moving square, keyboard + pointer input, pointercancel handling
- `src/core/viewport.js` — canvas sizing with visualViewport resize, safe-area getters
- `src/core/input.js` — keyboard + pointer tracking with pointer-ID capture, direction normalization, destroy() cleanup
- `src/core/save.js` — localStorage save/load/export/import with try/catch and round-trip safety
- `src/core/audio.js` — Web Audio API bootstrap with lazy context, oscillator chirp, mute/unmute
- `src/core/debug.js` — debug overlay toggle, FPS counter, ring-buffer log (200 entries)
- `tools/build-single-file.mjs` — inlines CSS + JS into HTML, strips exports for global scope, SHA-256 build hash, fails on missing files
- `tools/verify-single-file.mjs` — scans dist/index.html for forbidden external references (script src, link stylesheet, @import, http, cdn, google fonts)
- `tools/create-game.mjs` — scaffolding tool for new game projects from templates
- `tests/smoke.spec.ts` — Playwright smoke test: console errors, page errors, external requests, canvas exists, Start button click
- `package.json` — build, verify, serve (port 8098), test scripts
- `.gitignore` — node_modules, dist, test-results, screenshots

## What was verified

**verified** — `node tools/build-single-file.mjs` exits 0, produces `dist/index.html` (19,363 bytes)

**verified** — `node tools/verify-single-file.mjs` exits 0: no external references detected

**verified** — `npx playwright test` exits 0: 1 passed, 0 failed
  - Canvas element present after Start click
  - Zero console errors
  - Zero page errors
  - Zero external network requests

**verified** — Screenshot `milestone0-game-screen.png` shows black canvas with centered blue 20×20 square

**verified** — All source modules use ES module export syntax; build script strips `export` keywords for global-scope inlining

**verified** — Shell HTML includes `viewport-fit=cover`, `user-scalable=no` for mobile

**verified** — CSS uses `100dvh`, `env(safe-area-inset-*)`, `touch-action: none` per AGENTS.md requirements

**verified** — main.js handles `pointercancel` to clean up active pointers

**verified** — No CDN scripts, no external fonts, no remote images/audio — fully self-contained

## What failed

- Port 8099 was occupied by another process — switched to 8098 (documented in package.json and smoke test)

## Current exact state

**verified** — All Milestone 0 deliverables exist and pass build + verify + smoke test

**verified** — dist/index.html opens from localhost, renders title screen, Start button works, canvas renders

**verified** — Game loop advances (requestAnimationFrame), blue square moves with arrow keys / WASD / pointer drag

**untested** — file:// launch behavior (localStorage may warn on some browsers)

**untested** — Real device (Samsung Galaxy S21 Ultra) — Playwright used emulated Pixel 7 viewport

**postponed** — OpenWiki installation (per agreed default)

**postponed** — GitHub Pages configuration (per agreed default)

## Remaining blockers

None. Milestone 0 is complete.

## Next actionable step

**proposed** — Milestone 1: build the first real game prototype using the verified shell. Suggested: a top-down roguelite maze or a simple fishing mini-game to exercise the Canvas 2D engine, save system, and mobile controls on the real S21 Ultra device.

## Evidence paths

- Build output: `C:\Users\fallo\single-file-html-software\dist\index.html` (19,363 bytes)
- Smoke screenshot: `C:\Users\fallo\single-file-html-software\milestone0-smoke.png`
- Game screen screenshot: `C:\Users\fallo\single-file-html-software\milestone0-game-screen.png`
- GitHub repo: `https://github.com/falloutmule/single-file-html-software`

## Commands run

```bash
gh repo create single-file-html-software --public --clone
node tools/build-single-file.mjs
node tools/verify-single-file.mjs
npx playwright install chromium
npx playwright test --reporter=list
```

## Files changed

```
AGENTS.md                                    (new)
README.md                                    (new)
package.json                                 (new)
package-lock.json                            (new)
.gitignore                                   (new)
docs/architecture/overview.md                (new)
docs/engines/canvas2d-baseline.md            (new)
docs/controls/mobile-controls.md             (new)
docs/testing/testing-contract.md             (new)
src/shell/app-shell.html                      (new)
src/shell/styles.css                          (new)
src/shell/main.js                             (new)
src/core/viewport.js                          (new)
src/core/input.js                             (new)
src/core/save.js                              (new)
src/core/audio.js                             (new)
src/core/debug.js                             (new)
tools/build-single-file.mjs                  (new)
tools/verify-single-file.mjs                 (new)
tools/create-game.mjs                         (new)
tests/smoke.spec.ts                           (new)
```
