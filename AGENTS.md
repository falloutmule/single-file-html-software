# AGENTS.md — SFHS Work-in-Progress Rules

> Rules for AI coding agents working on this repository.
> The project is public and versioned, but its plugin contracts and package layout are still experimental.

## 1. Overall goal

Build and document Single-File HTML Software as a multi-lane system that emits one self-contained browser artifact while preserving clear evidence about what is verified, experimental, proposed, blocked, or superseded.

## 2. Current project state

- The checked-in runtime is the original Canvas 2D foundation.
- PixiJS is the active game-development lane, but its reusable pieces have not yet been fully extracted into this repository.
- Canvas 2D, DOM/CSS, raycasting, and future browser-native approaches remain separate lanes.
- No stable public plugin API exists yet.
- Do not claim production readiness, stable compatibility, or support for a lane that has not been integrated and tested here.

Read first:

- `README.md`
- `docs/CURRENT-STATE.md`
- `docs/RENDERER-LANES.md`
- `docs/PLUGIN-SYSTEM-WIP.md`
- `docs/DECISIONS.md`
- `docs/PHASES.md`

## 3. Release target

- The current foundation emits **`dist/index.html`**.
- Every release candidate must produce one self-contained HTML artifact.
- Build-time dependencies are allowed; required runtime dependencies are not part of the default SFHS contract.
- Generated output must not become the authoritative editable source.

## 4. Self-containment

The release artifact must not require:

| Prohibited dependency | Reason |
|---|---|
| Runtime fetch/XHR/WebSocket/beacon dependencies | Offline-first artifact contract |
| CDN-hosted scripts or libraries | Candidate must carry its runtime |
| Remote fonts | Offline behavior |
| Remote images or audio | Offline behavior |
| Remote stylesheets | Offline behavior |
| Remote script sources | Offline behavior |

Allowed at build time: package managers, bundlers, test frameworks, compilers, and asset tools.

Allowed inside the artifact: inlined code, embedded SVG, data URIs, base64 assets, and bundled renderer/runtime code.

## 5. Source editing

- Edit human-readable source and documentation, never generated bundles directly.
- Preserve the original Canvas 2D baseline unless the task explicitly changes it.
- Do not perform a large monorepo or package restructure merely to make the project look finished.
- Do not invent packages, commands, or plugin APIs and then document them as existing.
- When importing code from another project, first identify what is generic and what is project-specific.

## 6. Input architecture

Input should flow through named actions rather than directly coupling simulation to raw browser events:

```text
Raw input
→ action mapping
→ simulation/software state
→ presentation
```

Rules:

- Track pointers by `pointerId`.
- Handle `pointercancel`.
- Do not rely on hover-only controls.
- Recalculate presentation-to-logical coordinate mapping after viewport, orientation, or fullscreen changes.
- A visual control and its real hit target must remain aligned.

## 7. Simulation and rendering

- Rendering reads state; it does not become simulation authority.
- Renderer-specific objects must not enter durable state.
- Game/software rules must not depend on Pixi, Canvas, DOM, or raycasting object instances.
- Presentation effects may use transient state only when they cannot change deterministic outcomes.
- Renderer-specific behavior belongs in its lane or adapter.

## 8. Save files

Durable state may include:

- game or software state;
- progress;
- settings;
- content data;
- schema/version information.

Durable state must not include:

- DOM nodes;
- canvas contexts;
- Pixi objects;
- GPU resources;
- particles;
- caches;
- event listeners;
- computed presentation-only objects.

The save/load invariant remains:

```text
load(save(state)) ≈ durable state
```

## 9. Mobile requirements

For mobile-facing artifacts:

- account for dynamic viewport changes;
- account for safe-area insets;
- handle `visualViewport` where relevant;
- use pointer events and `pointercancel` cleanup;
- do not require landscape unless the project explicitly chooses it;
- test portrait and landscape when both are supported;
- verify touch targets again after resize and fullscreen changes.

## 10. Renderer-lane policy

### PixiJS

Active development lane. Pixi types and implementation details must remain inside the Pixi lane.

### Canvas 2D

Verified checked-in baseline and compatibility lane. It is not the universal default.

### DOM/CSS

Valid primary lane for text-heavy software, editors, dashboards, forms, and document tools.

### Raycasting

Experimental specialist lane. Depth, cutout masks, short-object occlusion, and atlas behavior must not be forced into generic renderer contracts prematurely.

### Future lanes

Proposed only until a real project, packaging path, and browser proof exist.

## 11. Plugin-system policy

The plugin system is experimental.

Do:

- extract the smallest seam from working code;
- identify shared capability boundaries;
- keep open questions visible;
- prove lifecycle and cleanup behavior;
- use a minimal fixture before importing a full game.

Do not:

- declare a stable manifest schema prematurely;
- promise third-party compatibility;
- publish packages solely to create an appearance of completion;
- leak Pixi-specific concepts into universal SFHS contracts;
- broaden scope from one renderer seam to every possible capability.

## 12. Evidence and status

Always distinguish:

- **verified**;
- **reported**;
- **in progress**;
- **experimental**;
- **proposed**;
- **blocked**;
- **superseded**;
- **untested**.

Do not:

- claim completion from process startup alone;
- claim usability from a source review;
- claim physical-device acceptance from emulation;
- claim release approval from preview hosting;
- hide a failed gate behind an overall optimistic status.

When functionality can be tested, test it. When it cannot, state the exact missing proof.

## 13. Verification contract

A candidate should eventually prove, as applicable:

- no console or page errors;
- intended presentation surface exists;
- frame or application lifecycle advances;
- no unexpected runtime requests;
- save/load round-trip;
- viewport and safe-area behavior;
- touch/input behavior after resize;
- exact artifact identity and hash;
- deterministic rebuild or state behavior when required;
- renderer-specific invariants;
- cleanup without duplicated listeners or surfaces.

Physical acceptance remains separate when the claim concerns perception, ergonomics, real browser chrome, heat, performance, or device-specific behavior.

## 14. Repository roles

- `single-file-html-software`: authoritative public WIP history, shared code, architecture, and project awareness.
- `sfhs-preview`: replaceable browser review slot only.

Do not treat `sfhs-preview` as source authority, release approval, or long-term artifact storage.

## 15. File conventions

| Path | Current purpose |
|---|---|
| `src/` | Original checked-in Canvas 2D foundation |
| `dist/` | Generated candidate output |
| `docs/` | Current state, decisions, phases, lanes, architecture, and tests |
| `tests/` | Existing test infrastructure |
| `AGENTS.md` | Agent rules |
| `README.md` | Public project orientation |

Future folders should be added only when actual code ownership requires them.
