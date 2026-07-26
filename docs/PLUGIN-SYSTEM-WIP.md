# SFHS Plugin System — Work in Progress

## Purpose

The plugin system is intended to let SFHS combine reusable capabilities without making every project inherit one fixed engine.

This document records the current direction only. It is not a stable API specification.

## Why a plugin system is useful

Different single-file applications need different capabilities:

- a Pixi game needs a WebGL renderer, effects, and game-oriented input;
- a Canvas 2D prototype may need only a small draw loop;
- a document application may use DOM/CSS as its primary presentation;
- a raycasting game needs specialized depth and asset handling;
- every project still benefits from packaging, viewport, evidence, and network-boundary rules.

A plugin system can keep those capabilities separate while allowing them to cooperate.

## Current design principle

Extract from working projects; do not design a large abstract framework first.

The first useful contract should be the smallest seam that can be proven in more than one context.

## Likely shared capability areas

These are capability categories, not final package names:

- **project metadata** — identity, version, build ID, declared lane;
- **viewport** — logical size, presented size, safe areas, resize events;
- **input** — named actions, pointers, keyboard, gamepad, text entry;
- **renderer** — initialize, present state, resize, diagnose, destroy;
- **packager** — collect source/assets and emit one HTML artifact;
- **verifier** — inspect artifact structure and browser behavior;
- **evidence** — bind commands, logs, hashes, screenshots, and verdicts to a candidate;
- **preview** — publish a replaceable review candidate;
- **persistence** — serialize durable state without transient renderer objects;
- **effects** — presentation-only systems that do not change simulation results.

## Minimal renderer seam under consideration

A renderer capability may eventually need to:

```text
initialize(host, configuration)
resize(viewportSnapshot)
present(readOnlySimulationSnapshot, interpolationState)
diagnose()
destroy()
```

This is illustrative only. Names, types, sync behavior, and ownership are undecided.

## Shared versus lane-specific

### Shared

- release artifact identity;
- viewport snapshot format;
- action-level input;
- read-only simulation snapshots;
- lifecycle result/evidence format;
- no-required-network policy;
- deterministic build identity;
- cleanup requirements.

### Lane-specific

- Pixi `Container`, `Sprite`, `Graphics`, filters, textures, and event modes;
- Canvas 2D contexts and draw commands;
- DOM component trees and CSS layout details;
- raycasting depth buffers, columns, spans, cutout masks, and atlas metadata;
- engine-specific performance limits.

## Capability routing questions still open

- How are capabilities discovered?
- Are plugins loaded statically at build time, dynamically during authoring, or both?
- Can multiple plugins provide the same capability?
- How are conflicts resolved?
- Which hooks are ordered and which may run in parallel?
- How are optional capabilities expressed?
- How does a verifier inspect a capability it does not execute?
- How are plugin and SFHS contract versions compared?
- What permissions can a plugin declare?
- How are preview/publication capabilities separated from build authority?

These questions should remain open until source inventory and real use provide evidence.

## Current non-goals

The present phase does not require:

- a stable manifest schema;
- npm publication;
- third-party plugin installation;
- runtime remote plugin loading;
- a plugin marketplace;
- semantic-version compatibility guarantees;
- security sandboxing between plugins;
- support for all renderer lanes;
- a finished CLI.

## First extraction candidate

The active Pixi work suggests a bounded first experiment:

1. keep game simulation outside the renderer;
2. initialize exactly one intended Pixi presentation surface;
3. resize it through a renderer-neutral viewport snapshot;
4. present read-only state;
5. expose diagnostics for surface count, dimensions, and coordinate mapping;
6. contribute packager inputs;
7. contribute browser checks;
8. destroy without leaked listeners or GPU resources.

The experiment should use a minimal fixture, not the full HOMEOSTASIS game.

## Evidence required before calling a seam reusable

- source ownership is clearly separated;
- the capability works in at least one minimal fixture;
- project-specific game rules are absent;
- build output remains one self-contained HTML file;
- browser proof exercises lifecycle and resize behavior;
- the plugin can be removed or replaced without rewriting simulation;
- diagnostics identify exact failures;
- another lane can plausibly implement the shared contract without importing Pixi concepts.

## Current verdict

```text
Plugin-system direction:      ACTIVE
Stable plugin API:            NO
Runtime implementation here:  NOT YET
Primary extraction source:    ACTIVE PIXI PROJECT WORK
Other lanes preserved:        YES
Package publication:          OUT OF SCOPE
```
