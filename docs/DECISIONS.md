# SFHS Decision Record

This file records current project decisions. Decisions may be revised as working code produces better evidence.

## D-001 — The release unit is one self-contained HTML file

**Status:** Active

SFHS targets one browser-openable HTML artifact containing the code and runtime assets required for the experience.

Build-time tools and dependencies are allowed. Required runtime network dependencies are not part of the default SFHS contract.

## D-002 — SFHS is multi-lane

**Status:** Active

SFHS is not permanently tied to one renderer.

Renderer and software lanes may include PixiJS, Canvas 2D, DOM/CSS, raycasting, and future browser-native approaches.

Shared SFHS contracts should cover concerns such as packaging, input, viewport, durable state, and evidence. Renderer-specific APIs remain inside their lanes.

## D-003 — PixiJS is the active development lane

**Status:** Active, not exclusive

Current game-development work is centered on PixiJS because it is being exercised against real mobile rendering, effects, input, and packaging problems.

This does not make PixiJS the only future SFHS renderer or a universal dependency.

## D-004 — Canvas 2D remains a valid lane

**Status:** Active

The original Canvas 2D foundation remains useful as a lightweight baseline, compatibility target, and historical reference.

The earlier statement that Canvas 2D is the default SFHS engine is superseded.

## D-005 — Plugin contracts will be extracted from working projects

**Status:** Active

The project will not invent a large stable plugin API before its boundaries are visible in functioning software.

The sequence is:

```text
working implementation
→ verified repeated pattern
→ narrow reusable seam
→ experimental contract
→ additional project use
→ stabilization when justified
```

## D-006 — Public does not mean production-ready

**Status:** Active

The repository is public to provide visibility, versioning, project memory, and easier review.

Public visibility does not imply:

- stable APIs;
- support guarantees;
- hardened security;
- production readiness;
- contributor readiness;
- finished documentation.

## D-007 — Preview hosting is separate from source authority

**Status:** Active

`sfhs-preview` is a replaceable browser review slot.

A preview commit or HTTP success proves hosting identity only. It does not prove source integration, final acceptance, or release approval.

## D-008 — Automated proof and physical acceptance are separate

**Status:** Active

Automated browser checks can verify mechanics, rendering structure, deterministic state, network boundaries, and synthetic input.

Physical-device checks remain necessary when the acceptance question involves:

- perceived visual clarity;
- touch ergonomics;
- browser chrome;
- real fullscreen behavior;
- performance or heat;
- orientation handling;
- device-specific layout.

## D-009 — Rendering is presentation, not simulation authority

**Status:** Active

Rendering consumes state and presents it. It should not silently change gameplay state.

Presentation-only effects may use their own non-gameplay randomness or timing only when they cannot alter deterministic simulation outcomes.

## D-010 — Durable state excludes renderer internals

**Status:** Active

Save data may contain game/software state, settings, progress, content data, and schema versions.

It must not persist DOM nodes, Pixi objects, canvas contexts, GPU resources, particles, caches, event listeners, or other transient presentation objects.

## D-011 — Physical usability can reopen an automated pass

**Status:** Active

When a human cannot perceive or use a feature on the target device, that acceptance criterion has failed even if automated checks passed.

The automated evidence remains valid for what it actually proved, but the phase cannot be called complete.

## D-012 — Repository structure remains provisional

**Status:** Active

Do not perform a large monorepo or package reorganization solely to make the project look finished.

Folders and packages should emerge from verified ownership boundaries and repeated implementation needs.
