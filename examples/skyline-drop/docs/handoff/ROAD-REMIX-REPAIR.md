# Road Remix Repair

## Overall goal

Reduce dead-end district draws without allowing incoherent or redundant internal shuffles.

## Current goal

Replace the generic Remix permutation system with authored Road Remix blueprints.

## What changed

- The run still begins with one charge.
- The control is now labeled `ROAD REMIX`.
- `Row Homes` switches between `Edge road` and `Center road`.
- `Green Strip` switches between `Edge road` and `Center road`.
- Every offered plan keeps its road cells orthogonally connected.
- The footprint, visible cell count, tile inventory, resident/job output, anchor, and rotation remain unchanged.
- Utility conduits are authored as part of each complete blueprint rather than moved as unrelated payloads.
- Plans that are obtainable by rotating the base district are excluded.
- Districts without a meaningful authored alternate keep a visible disabled control reading `NO ALTERNATE ROAD PLAN`.
- The former `Remix Permit` card is presented as `Road Crew` and grants one additional Road Remix charge.

## Deliberately unchanged

- level queues and objectives;
- placement and collision rules;
- utility-overlap behavior;
- surface and underground rendering;
- board framing, controls, fullscreen, and information panel;
- population, jobs, greenery, and utility calculations.

## Verification

- strict TypeScript: pass;
- all three deterministic level solutions: pass;
- mechanics regression: pass;
- utility-overlap regression: pass;
- authored-plan invariants: pass;
- connected-road validation: pass;
- rotation-equivalence rejection: pass;
- focused mobile and desktop browser proof: pass;
- permanent information panel regression: pass;
- page/console errors: none;
- external HTTP requests: none.

## Status

`INTAKE_REQUIRED: PIXI_NATIVE`

The candidate was built and statically verified by the bounded local candidate scripts. Canonical SFHS CLI pack/verify remains unrun in this runtime.
