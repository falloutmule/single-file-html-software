# SFHS Architecture Overview

> **Work-in-progress architecture.** The code currently checked into this repository is the original Canvas 2D foundation. The wider SFHS direction is multi-lane, with PixiJS as the active development lane and the plugin boundary still being extracted from working projects.

## Architecture at a glance

SFHS is organized around one stable idea:

```text
human-readable source
→ build and packaging
→ one self-contained HTML artifact
→ browser verification
→ optional physical-device acceptance
```

Renderer choice is not the project identity. A project may use Canvas 2D, PixiJS, DOM/CSS, raycasting, or another browser-native lane while still following the same artifact and evidence model.

## Shared conceptual layers

### 1. Project and shell

Owns:

- document structure;
- viewport host;
- safe-area handling;
- startup and shutdown;
- overlay roots;
- project/build identity.

The shell should not assume one renderer unless the project explicitly selects that lane.

### 2. Input

Translates browser events into named actions or software intents.

```text
pointer / keyboard / gamepad / text input
→ action mapping
→ simulation or application logic
```

Input is responsible for pointer IDs, cancellation, coordinate translation, and resize-aware hit behavior.

### 3. Simulation or application state

Owns durable rules and state transitions.

It should not depend on DOM nodes, Pixi objects, canvas contexts, GPU resources, or other renderer internals.

### 4. Presentation lane

Consumes read-only state and presents it using one selected lane.

Examples:

- Canvas 2D;
- PixiJS;
- DOM/CSS;
- raycasting;
- future browser-native renderers.

Renderer-specific objects remain inside the lane.

### 5. Persistence

Serializes durable state only.

It excludes:

- DOM nodes;
- renderer objects;
- textures and GPU resources;
- particles;
- caches;
- listeners;
- derived presentation data.

### 6. Packaging

Collects source, dependencies, and runtime assets into one HTML artifact.

The packager may use build-time tooling but the resulting artifact should not require external runtime dependencies under the default SFHS contract.

### 7. Verification and evidence

Binds claims to an exact candidate.

Evidence may include:

- build commands and logs;
- artifact bytes and SHA-256;
- browser screenshots;
- network-request audits;
- renderer-surface counts;
- input and resize proofs;
- deterministic state snapshots;
- physical-device observations.

Automated proof and physical acceptance are separate when the claim concerns perception, ergonomics, browser chrome, or real-device performance.

## Current checked-in implementation

The repository currently contains the original Canvas 2D baseline:

```text
single-file-html-software/
├── AGENTS.md
├── README.md
├── package.json
├── src/
│   ├── shell/
│   │   ├── index.html
│   │   └── styles.css
│   └── core/
│       ├── engine.js
│       ├── input.js
│       ├── render.js
│       ├── simulation.js
│       └── save.js
├── docs/
├── tests/
└── dist/
    └── index.html
```

### Shell layer

The checked-in shell:

- declares a Canvas 2D surface;
- declares a DOM overlay;
- handles viewport and safe-area layout;
- boots the original foundation runtime.

### Engine layer

The checked-in engine:

- initializes the runtime;
- advances a requestAnimationFrame loop;
- updates simulation;
- invokes rendering;
- handles basic lifecycle cleanup.

### Input layer

The checked-in input layer:

- translates pointer and keyboard events into actions;
- tracks active pointer IDs;
- handles `pointercancel`;
- keeps raw browser events outside simulation logic.

### Simulation layer

The checked-in simulation is intended to remain deterministic and independent from presentation.

### Canvas render layer

The checked-in renderer draws the baseline state through Canvas 2D and updates the DOM overlay by reading state.

This renderer is now considered the **Canvas 2D lane baseline**, not the universal SFHS default.

### Save layer

The checked-in save layer demonstrates durable-state serialization and restoration without preserving renderer state.

## Current build pipeline

```text
src/shell/index.html ──┐
src/shell/styles.css ──┤
src/core/*.js        ──┼─→ build tool ─→ dist/index.html
inline assets        ──┘
```

Current baseline requirements:

1. inline JavaScript;
2. inline CSS;
3. embed required runtime assets;
4. emit one HTML file;
5. make no unexpected runtime requests;
6. keep generated output non-authoritative.

The current build script belongs to the original baseline. A later multi-lane packager may replace or wrap it after the plugin seam is proven.

## Target multi-lane shape

This is conceptual, not a final folder or package contract:

```text
shared project contract
├── viewport capability
├── input capability
├── persistence capability
├── packager capability
├── verifier/evidence capability
└── selected presentation lane
    ├── PixiJS
    ├── Canvas 2D
    ├── DOM/CSS
    ├── raycasting
    └── future lanes
```

The project should extract these boundaries from working code instead of forcing current projects into a speculative package hierarchy.

## PixiJS active lane

The active Pixi work is currently teaching SFHS about:

- one visible WebGL presentation surface;
- viewport and fullscreen resize;
- logical-to-presented coordinate mapping;
- touch accuracy after resize;
- deterministic simulation with presentation-only effects;
- pooled/cached effects;
- migration from Canvas 2D presentation;
- browser proof tied to exact artifacts.

These behaviors are not yet a stable plugin package in this repository.

## Canvas 2D lane

The checked-in baseline remains useful for:

- lightweight games;
- prototypes;
- simple drawing and simulation software;
- compatibility imports;
- non-WebGL environments.

Its existing engine-specific documents should be read as lane documentation.

## DOM/CSS lane

DOM/CSS may be the primary presentation for:

- editors;
- documents;
- dashboards;
- forms;
- boards;
- accessibility-heavy software.

A DOM-first artifact can still satisfy the same one-file release contract.

## Raycasting lane

Raycasting introduces specialist concerns that should remain isolated until proven:

- column or pixel depth;
- short-object occlusion;
- masked cutout props;
- sprites and directional faces;
- atlas metadata;
- collision footprint versus visual silhouette;
- fog and lighting compositing.

## Plugin boundary under investigation

The first likely renderer seam may eventually resemble:

```text
initialize(host, configuration)
resize(viewportSnapshot)
present(readOnlyState)
diagnose()
destroy()
```

This is illustrative only. The final interface, lifecycle, package names, and version rules remain undecided.

See [`../PLUGIN-SYSTEM-WIP.md`](../PLUGIN-SYSTEM-WIP.md).

## Architecture operating rule

When a real project exposes a missing capability:

1. verify the actual problem;
2. solve and test it in the project;
3. identify the generic portion;
4. extract the smallest reusable seam;
5. prove it with a minimal fixture;
6. document what remains lane-specific;
7. only then broaden SFHS.
