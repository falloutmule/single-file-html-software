# SFHS-008A - Non-project-specific import inventory

Date: 2026-07-20

Status: INVENTORY COMPLETE; IMPORT PENDING

## Selected source

- Source repository:
  `C:/Users/fallo/Documents/HermesProjects/hermes-skill-single-file-html-game`
- Source commit: `5cc5557cd36c16cdf1001fb86532a1838fde76eb`
- Source status at inventory: clean
- Source file: `examples/minimal-single-file-game.html`
- Source bytes: 5,062
- Source SHA-256:
  `54b54e5f897e3483fab8e7dcf32eaee870c37403c7535f403bf26066cdac74b4`
- License: MIT, copyright 2026 Travis (falloutmule)

This is a reusable teaching fixture, not a production game repository. The
source repository and source file are read-only during this import.

## Static inventory before execution

- One authored HTML file is also the original generated/release artifact.
- One inline stylesheet; one inline classic script; no module imports.
- One Canvas 2D surface at a logical starting size of 320 by 200.
- No external `src`/`href`, network fetch, service worker, dynamic import,
  runtime asset, storage, or audio dependency.
- Input: ArrowLeft/ArrowRight, A/D, and two pointer buttons.
- Behavior: move an orange player circle horizontally, collect a yellow star,
  increment score once, and expose `window.CR.runFullSelfCheck()`.
- Time/randomness: variable `requestAnimationFrame` delta and `Math.random`.
- Mobile contract: full-height layout, 48 px minimum controls, touch-action
  suppression, and a fixed-size canvas resized to CSS client dimensions.

## Import boundary

The SFHS copy will be `examples/hermes-minimal-import`. It will:

- split markup, CSS, TypeScript simulation/input/runtime, and generated output;
- preserve the observable movement, one-star collection, score HUD, colors,
  keyboard controls, pointer controls, and self-check surface;
- replace Canvas 2D rendering with the already-approved PixiJS v8 WebGL
  adapter rather than claiming a Canvas fallback;
- replace variable delta and uncontrolled randomness with deterministic
  fixed-step state suitable for exact build and browser evidence;
- keep `dist/index.html` generated and ignored.

The import may improve pause/input cleanup and deterministic testing. Those are
recorded migration differences, not claims of byte or renderer equivalence.

## Pre-execution external-reference result

Static count of HTTP(S) strings: 0. Static count of script tags: 1. Static
count of style tags: 1. No source file from the original repository will be
modified.
