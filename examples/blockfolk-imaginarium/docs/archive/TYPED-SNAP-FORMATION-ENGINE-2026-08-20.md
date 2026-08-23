# Typed Snap Formation Engine — Archived Architecture

Status: `SUPERSEDED` by physical Samsung failure. This document preserves historical architecture; it is not current product authority.

## Exact historical identity

- Pushed source branch: `origin/feature/blockfolk-imaginarium-001`
- Overhaul implementation: `499636e63e9906b08a80582beeeff5c2a1b89206`
- Final source/report state: `5c2a13184f46da9ab9c408c8bd6e5f76ae45711d`
- Pages commit: `200dd59ffe5f6fe906effcae50c9695c3a5305aa`
- Build ID: `blockfolk-imaginarium-7852b7f329b4`
- Artifact bytes: `12,308,382`
- Artifact SHA-256: `288c6664584137ceb97226b29a3fd6bcdd99aaac5b1056f7daa268f1d00f92c6`
- Historical report: `one-shot/SNAPPING-OVERHAUL-FINAL-REPORT.md`
- Historical screenshots: `art/evidence/snapping-overhaul-final/`

Both source commits remain reachable from the pushed feature branch; the Pages commit remains reachable from `origin/gh-pages`. No tag, release, or extra archive branch is needed.

## Ideas worth retaining for another product

- Renderer-neutral visual/connection profiles.
- Grouping several agreeing contacts into one candidate pose.
- Pure Snap planning followed by an immutable, stale-checked transaction.
- Persistent connection graphs with loop-safe component traversal.
- Component-wide editing, copying, deletion, and selected-member detach.
- Versioned save migration with raw-record protection.
- Formation evaluation as an optional layer for a future game that actually needs semantic construction goals.

## Why it was removed from BlockFolk Imaginarium

BlockFolk needed simple cell alignment, not doorway recognition. Door/window roles, reserved openings, five-slot progress, and formation-specific rendering increased calibration and interaction complexity. The physical Samsung review disproved the delivered Stone Door geometry: the door was visibly too short and connected partly over or behind a Log Block instead of occupying a clean two-tier wall cell. Keeping unused semantic abstractions would preserve false product claims and increase maintenance risk.

## Physical result

- Log-to-Log horizontal and vertical connections read acceptably.
- Connected members stayed locked.
- Stone Door height and placement failed.
- Automation and the previous completion report do not override the physical result.

Historical automated status is therefore superseded. Current product status is tracked separately as `PHASE_0_RECOVERY` and `GRID_CONSTRUCTION_ROADMAP`.
