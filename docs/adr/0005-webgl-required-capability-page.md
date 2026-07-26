# ADR 0005: WebGL requirement and capability page

**Status:** accepted  
**Date:** 2026-07-20

## Decision

The PixiJS v8 release baseline requires WebGL. Unsupported environments receive an explicit, testable capability page; SFHS does not claim a production Canvas fallback or WebGPU default.

## Alternatives considered

- Silent renderer fallback.
- Make WebGPU the release default.
- Claim a general Pixi Canvas renderer fallback.

## Consequences

- Browser verification records a capability outcome rather than misclassifying unsupported devices as application failures.
- The adapter must expose renderer diagnostics and context-loss classification.
- Mobile/desktop support claims remain evidence-backed and never hide platform limitations.

## Reversal condition

Revisit after a separately tested adapter and artifact contract demonstrate equivalent verified support for another renderer.
