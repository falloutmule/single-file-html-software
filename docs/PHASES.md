# SFHS Phase History

This is a project-awareness timeline, not a release history.

## Phase 0 — Canvas 2D foundation

**Status:** Verified baseline

The initial repository established:

- a mobile-aware HTML shell;
- Canvas 2D rendering;
- DOM/CSS overlays;
- action-mapped input;
- deterministic simulation/render separation;
- save/load scaffolding;
- a single-file build;
- external-reference verification;
- Playwright smoke tests.

This phase remains checked in and runnable.

## Phase 1 — Real-project pressure testing

**Status:** Reported and partially external to this repository

Working game projects exposed requirements not visible in the minimal baseline:

- stronger viewport and fullscreen contracts;
- portrait-first mobile layouts;
- touch-target verification after resize;
- renderer migration and compatibility concerns;
- exact candidate hashes and browser evidence;
- one-visible-renderer guarantees;
- visual readability as a separate acceptance problem;
- physical-device acceptance distinct from automation.

These lessons are being documented before their code is generalized.

## Phase 2 — PixiJS active lane

**Status:** In progress

Current development is centered on PixiJS for browser games.

Areas exercised include:

- single-file Pixi packaging;
- WebGL presentation;
- responsive mobile layouts;
- fullscreen handling;
- deterministic simulation proofs;
- effects infrastructure;
- attack and upgrade readability;
- Canvas 2D migration experiments.

The Pixi lane is not yet a stable package in this repository.

## Phase 3 — Public project-awareness checkpoint

**Status:** Current

The repository is being updated to show:

- SFHS is a work in progress;
- PixiJS is active but not exclusive;
- Canvas 2D remains a valid lane;
- raycasting and DOM/software paths remain visible;
- plugin contracts are experimental;
- preview hosting and source authority are separate;
- project status must distinguish verified, reported, proposed, and blocked work.

This phase changes documentation and project awareness, not the runtime architecture.

## Phase 4 — Runtime reality inventory

**Status:** Proposed next

The next engineering phase will inspect active project source and identify:

- reusable viewport code;
- shared input mapping;
- deterministic packaging;
- browser-verification hooks;
- preview publication behavior;
- renderer-specific versus project-specific ownership;
- the smallest viable plugin seam.

No code should be moved before this inspection is complete.

## Phase 5 — First extracted plugin seam

**Status:** Proposed

A narrow capability will be extracted from proven code and integrated with one minimal example.

The likely first seam is renderer presentation plus viewport/verification hooks, but the exact contract is intentionally undecided until Phase 4 evidence exists.

## Phase 6 — Additional lanes

**Status:** Future

Canvas 2D, DOM/CSS, raycasting, or another lane may be integrated behind the shared contract when a real project justifies the work.

This phase will not begin by trying to support every renderer at once.

## Phase rule

A phase may be called complete only when its requested outcome exists and its evidence matches the type of claim being made.

Examples:

- a source review can complete a documentation phase;
- an automated browser proof can complete an automated gate;
- only physical use can complete a physical-device readability gate.


## Phase 4 — Runtime reality inventory

**Status:** Verified on 2026-07-26

A direct source inspection identified the clean external SFHS main source and a clean active Pixi QA candidate. The resulting [inventory](inventory/ACTIVE-PIXI-SOURCE-INVENTORY.md) separates generic/shared candidates, Pixi-lane code, Canvas import code, verification/build tooling, and HOMEOSTASIS-specific implementation.

## Phase 5 — First extracted plugin seam

**Status:** Proposed and narrowed

The initial broad renderer-lifecycle idea was compared against viewport, input mapping, packager, browser-verifier, and evidence seams. The smallest evidence-backed experiment is a renderer-neutral host-relative pointer-coordinate mapper plus immutable viewport snapshot. See the [recommendation](inventory/FIRST-PLUGIN-SEAM-RECOMMENDATION.md).

No runtime extraction has occurred.