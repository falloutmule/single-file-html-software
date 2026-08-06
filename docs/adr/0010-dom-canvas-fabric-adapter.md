# ADR 0010: DOM/Canvas Fabric is a supported SFHS adapter

## Status

Accepted.

## Decision

Add `dom-canvas-fabric` to the validated project-adapter union. The lane owns
generic exact-artifact browser checks for DOM readiness, a usable Canvas 2D
surface, target viewports, and absence of runtime network requests. Product
commands and diagnostics remain project-owned.

Canvas projects may declare a responsive contained artboard, optional local
storage, and `simulationHz: 0`. WebGL physical evidence is recorded as
`not-required`; Pixi projects continue to require supported WebGL.

## Consequences

- Pixi contracts and scenarios remain unchanged.
- PNG, SVG, JPG/JPEG, and WebP assets can be inlined by the canonical packer.
- The adapter does not vendor Fabric.js or application code into SFHS core.
- DOM/Canvas artifacts retain deterministic packing, exact-byte verification,
  offline runtime, browser evidence, and physical-device acceptance gates.
