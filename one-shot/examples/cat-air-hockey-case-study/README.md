# Cat Paw Air Hockey — One-Shot Case Study

## Evidence status

This is a compact, `REPORTED` case study from the supplied One-Shot handoff. The named source pack, evidence archive, and verification report are not present in the current repository checkout, so this document does not claim their hashes, canonical artifact, or automated results as `VERIFIED`.

## Bounded concept and build order

The concept was a cat-paw air-hockey game. The autonomous build prompt prioritized two independent touch controls before art or full rules: each pointer ID remained owned by its control, cancellation paths cleared ownership, and portrait/landscape readability were evaluated separately. The physics path used a fixed-step simulation and bounded substeps before content expansion.

## Recovery lessons

- Event-history loss was discovered and repaired because issues were logged during the interrupted run rather than reconstructed later.
- Node 24 was found outside a default Node 22 shell. This is environment evidence, not game verification.
- The absent SFHS checkout and pnpm workspace blocked a canonical pack; that did not invalidate the authored source or useful fallback candidate.
- The fallback belongs at `candidate/index.unverified.html`, never `dist/index.html`, and remains `UNTESTED`/`BLOCKED` until the real repository performs pack and exact verify.
- Physical user testing established player-experience facts separately from automation. Canonical SFHS intake and exact artifact evidence still remained.

## Reusable judgment

Build the coupling most likely to fail player expectations first: here, concurrent controls, mobile layout, and puck interaction. Preserve the full issue timeline and distinguish reported physical feedback from automated browser or artifact evidence.
