# ADR 0011: DOM interactive software is a supported SFHS adapter

## Status

Accepted for SFHS Mobile Controls v1.

## Decision

Add `dom-interactive` to the validated project-adapter union with no required
renderer. The lane is for self-contained browser applications whose primary
surface is ordinary DOM. It owns exact-artifact boot, self-check, offline
request, and viewport evidence, but it does not supply application behavior or
a simulation loop.

## Consequences

- Renderer-neutral tools such as Mobile Controls Lab can use the canonical SFHS
  builder, packer, verifier, and physical-device gate without claiming Pixi,
  Canvas, Fabric, or WebGL behavior.
- Existing Pixi and DOM/Canvas/Fabric contracts and tests remain unchanged.
- The adapter does not become a controls layer. `@sfhs/mobile-controls` remains
  the only reusable controls runtime.
