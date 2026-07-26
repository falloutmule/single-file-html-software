# ADR 0002: PixiJS v8 is the first production adapter

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Ship the first SFHS vertical slice through a `pixi-v8` adapter. SFHS simulation, packaging, verification, and evidence contracts remain adapter-neutral.

## Alternatives considered

- Start from the SNC raycaster.
- Default to Phaser because OpenAI Game Studio does.
- Start with raw Canvas 2D, Three.js, or a custom WebGL renderer.

## Consequences

- The adapter owns Pixi initialization, WebGL capabilities, renderer diagnostics, embedded assets, viewport coordination, and Pixi browser scenarios.
- Serializable simulation state and the fixed-step loop stay outside Pixi display objects.
- Additional adapters require the same contracts rather than a new SFHS core.

## Reversal condition

Revisit if the minimum Pixi fixture cannot satisfy the one-file and exact-artifact contracts after documented, focused investigation.
