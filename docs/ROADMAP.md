# SFHS Work-in-Progress Roadmap

This roadmap tracks learning and extraction. It is not a release promise.

## Current phase — public awareness and project memory

### Goal

Make the public repository accurately show what SFHS is becoming without presenting experimental work as stable.

### Tasks

- keep the README aligned with current direction;
- record the active PixiJS lane and other renderer/software lanes;
- preserve the original Canvas 2D baseline as history and working reference;
- document phase status, decisions, unknowns, and blockers;
- keep preview hosting separate from source authority;
- use branch and commit history as visible checkpoints.

### Completion signal

A reader can tell:

- the project is active;
- the checked-in code is older than some current experiments;
- PixiJS is the active lane;
- Canvas 2D, raycasting, and DOM/CSS remain visible;
- the plugin API is not stable;
- where the next extraction work will occur.

## Next phase — runtime reality inventory

### Goal

Map the actual reusable SFHS behavior already proven across current projects.

### Tasks

- inspect active Pixi project source rather than relying on reports;
- identify shared viewport, input, packaging, verification, and evidence code;
- identify game-specific code that must stay outside SFHS core;
- identify duplicated compatibility and preview logic;
- record exact source locations, commands, dependencies, and evidence;
- produce a migration map without moving code yet.

### Intelligence level

High. This requires distinguishing accidental project structure from real reusable contracts.

## Following phase — smallest plugin seam

### Goal

Extract one narrow plugin boundary from working code.

### Likely first seam

A renderer capability that can:

- initialize a presentation surface;
- resize from a shared viewport contract;
- receive read-only simulation snapshots;
- expose diagnostics;
- destroy itself cleanly;
- contribute packaging and browser-verification hooks.

### Non-goal

Do not define every future plugin lifecycle or package before one real seam works end to end.

## Pixi lane checkpoint

### Goal

Bring one minimal Pixi example into this repository after its reusable code is identified.

### Required proof

- builds to one HTML file;
- no required runtime requests;
- one intended presentation surface;
- portrait and landscape resize;
- touch coordinate accuracy after resize;
- deterministic simulation evidence;
- no project-specific HOMEOSTASIS rules inside shared code.

## Canvas lane checkpoint

### Goal

Keep the checked-in baseline runnable while removing the claim that it is the universal default.

### Tasks

- update renderer-specific documentation labels;
- retain the minimal build and smoke tests;
- decide later whether the Canvas baseline becomes an example, lane package, or compatibility fixture.

## Raycasting checkpoint

### Goal

Record specialist renderer lessons without merging them prematurely into common contracts.

### Topics to preserve

- masked/cutout compositing;
- depth behavior for transparent pixels;
- short-object occlusion;
- directional sprite and billboard handling;
- collision footprint versus visual silhouette;
- atlas and asset metadata.

## DOM/software checkpoint

### Goal

Prevent SFHS from becoming game-only.

### Future proof target

A small text- or form-heavy application that:

- uses DOM/CSS as the main presentation;
- packages into one HTML file;
- saves durable state locally;
- works offline;
- passes the shared network and browser contract.

## Deferred work

The following are intentionally deferred until real use requires them:

- stable public plugin API;
- npm package publication;
- contributor onboarding and governance;
- hardened security model;
- comprehensive cross-browser matrix;
- support guarantees for proposed renderer lanes;
- semantic-version compatibility promises;
- production-grade installer or scaffolding CLI.

## Roadmap operating rule

When a real project exposes a missing capability:

1. verify the problem in that project;
2. solve it locally and prove it;
3. identify what is generic;
4. extract the smallest reusable contract;
5. document what remains project-specific;
6. only then broaden SFHS.
