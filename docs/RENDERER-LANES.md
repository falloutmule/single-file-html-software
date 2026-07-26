# SFHS Renderer and Software Lanes

## Why lanes exist

SFHS is defined by the release contract—one self-contained HTML artifact—not by one permanent renderer.

A lane is a bounded implementation path for a class of software. Lanes share packaging, input, viewport, evidence, and self-containment ideas while retaining their own rendering and performance rules.

A lane may become a plugin later. It does not need to be forced into a stable plugin package before its real boundary is understood.

## Shared expectations

Every mature lane should eventually explain:

- how it initializes and destroys itself;
- how it receives viewport changes;
- how logical coordinates map to presented coordinates;
- how input reaches simulation;
- what files or assets it contributes to the single HTML build;
- how it proves there are no required external requests;
- how it exposes test and evidence hooks;
- what renderer objects are transient and must not enter save data;
- how it distinguishes automated proof from physical-device acceptance.

## Lane status table

| Lane | Status | Current role |
|---|---|---|
| PixiJS | Active development | Primary game-rendering work and current plugin extraction source |
| Canvas 2D | Verified baseline | Lightweight rendering, prototypes, simple software, import compatibility |
| DOM/CSS | Conceptually active | Menus, HUD, documents, editors, dashboards, forms, text-heavy software |
| Raycasting | Experimental | Pseudo-3D and first-person rendering research |
| SVG | Proposed | Vector-heavy interactive software and diagrams |
| Three.js | Proposed | General browser 3D lane |
| Babylon.js | Proposed | Feature-rich browser 3D lane |
| WebGPU/custom | Proposed | Future high-performance or specialist rendering work |
| Audio-focused | Proposed | Instruments, sequencers, generative audio, and sound-first software |

## PixiJS lane

### Current role

PixiJS is the active development lane because it has been exercised against a real mobile game and a demanding single-file packaging workflow.

### Areas currently being learned

- WebGL presentation inside a single-file artifact;
- one visible renderer surface;
- renderer resize after browser chrome, orientation, and fullscreen changes;
- portrait-first phone layouts with secondary landscape/desktop layouts;
- touch mapping after resize;
- deterministic simulation with non-deterministic presentation effects kept separate;
- pooled and cached visual effects;
- readable attacks, impacts, cards, and state changes;
- migration from older Canvas 2D presentation code.

### Current caution

PixiJS must not leak upward into universal SFHS contracts. `Container`, `Graphics`, `Sprite`, filters, render textures, and Pixi event modes are lane-specific details.

## Canvas 2D lane

### Current role

Canvas 2D is the only renderer lane currently checked into this repository as a runnable baseline.

It remains useful for:

- very small games;
- simple drawing software;
- low-complexity simulations;
- compatibility analysis;
- prototypes that may later migrate to another lane;
- environments where WebGL is undesirable.

### Current caution

The original documentation treated Canvas 2D as the default engine. That wording is superseded. Canvas 2D is now one lane among several.

## DOM/CSS lane

DOM and CSS are not merely overlays. They can be the primary presentation system for:

- document readers and writers;
- dashboards;
- editors;
- forms;
- card and board interfaces;
- accessibility-heavy software;
- responsive text and layout applications.

A DOM-first SFHS artifact can still meet the same self-contained release contract.

## Raycasting lane

Raycasting is a specialist lane, not a variation of ordinary sprite rendering.

It introduces separate concerns:

- wall and object depth;
- per-column or per-pixel occlusion;
- short objects and background continuation;
- masked or alpha-cutout props;
- billboards and directional sprites;
- asset atlases;
- collision volume versus visual silhouette;
- fog and lighting compositing.

Raycasting work should remain isolated until its contracts are proven by complete examples.

## Future-lane policy

A future lane is listed to maintain awareness, not to promise implementation.

A lane should move from proposed to experimental only when there is:

1. a concrete project or prototype;
2. a bounded reason to use it;
3. an exact single-file packaging path;
4. at least one browser proof;
5. documented differences from existing lanes.

## Cross-lane rule

Do not solve a renderer-specific problem by broadening the global SFHS contract without evidence.

Prefer:

```text
shared contract
  + lane adapter
  + lane-specific proof
```

instead of:

```text
one engine's implementation details
  renamed as universal SFHS behavior
```
