# ADR 0006: Original SFHS plugin; Game Studio optional

**Status:** accepted  
**Date:** 2026-07-20

## Decision

Create an original Codex plugin named `sfhs`. Do not fork, vendor, or depend on OpenAI Game Studio. Keep Game Studio uninstalled through standalone SFHS clean-install acceptance, then test co-installation only as an optional compatibility task.

## Alternatives considered

- Install Game Studio as the SFHS foundation.
- Fork or copy its complete skill tree.
- Omit a dedicated SFHS plugin.

## Consequences

- Reuse only durable concepts: narrow routing, renderer-independent simulation, DOM UI, action maps, asset organization, and visual playtest practice.
- The SFHS router treats an explicit SFHS request or `adapter.id: "pixi-v8"` as authoritative over Game Studio's Phaser-first 2D default.
- SFHS skills invoke the CLI and never reimplement packing, verification, or evidence logic in prose.

## Reversal condition

Revisit only if optional co-install testing proves a documented, unresolvable routing or capability conflict.
