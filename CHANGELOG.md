# Changelog

This project is pre-release and experimental. Entries record public project-awareness checkpoints, not compatibility guarantees.

## Unreleased

### Public WIP awareness checkpoint

- Reframed SFHS as a work-in-progress multi-lane system rather than a Canvas 2D-only engine.
- Recorded PixiJS as the active development lane without making it the permanent or exclusive renderer.
- Preserved Canvas 2D as the checked-in baseline and compatibility lane.
- Added awareness of DOM/CSS, raycasting, and future browser-native lanes.
- Added current-state, roadmap, phase-history, renderer-lane, decision, and plugin-system documentation.
- Updated agent rules to distinguish verified, reported, experimental, proposed, blocked, superseded, and untested states.
- Clarified that `sfhs-preview` is temporary review hosting, not source authority or release approval.
- Clarified that automated browser proof and physical-device acceptance are separate gates.
- Kept runtime source and build behavior unchanged in this documentation phase.

## 0.0.0 — Original foundation

- Added the initial Canvas 2D and DOM/CSS shell.
- Added action-mapped pointer and keyboard input.
- Added viewport, safe-area, save/load, build, verification, and Playwright smoke-test foundations.
- Established `dist/index.html` as the single-file artifact target.
