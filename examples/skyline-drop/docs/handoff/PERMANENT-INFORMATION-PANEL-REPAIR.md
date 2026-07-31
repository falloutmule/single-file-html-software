# Permanent Information Panel Repair

## Scope

Replace the temporary city-metrics dialog and temporary building-inspection card with one permanent contextual information panel in the empty area above the touch controls.

## What changed

- The information panel remains visible throughout normal play.
- Default context explains the current floating district, its cell contents, description, and placement validity.
- Tapping the compact top metrics selects live city status in the same panel.
- Tapping a placed home, apartment, shop, road, park, utility plaza, road entrance, utility hub, or underground conduit selects that object and displays its contribution and network state.
- Trees and mountains are now selectable and explain their surface and underground rules.
- Tapping empty buildable ground moves the district and returns the panel to current-district context.
- Switching surface/underground resets stale selection and returns the panel to the active-layer district context.
- A successful drop selects the newly supplied current district rather than leaving obsolete inspection text.
- The old close buttons and separate temporary overlays were removed.

## Unchanged

- Simulation and placement rules
- Piece definitions and order
- Level layouts and objectives
- Scoring and upgrades
- Board scale and camera
- Touch controls and keyboard controls
- Fullscreen and layer behavior
- Art and audio

## Verification

- Strict TypeScript check: PASS
- Three deterministic level solutions: PASS
- Mechanics regression suite: PASS
- Source inspection: PASS
- Candidate static verification: PASS
- Mobile contextual-panel browser proof: PASS, 26 assertions
- Desktop panel smoke: PASS, 6 assertions
- Page errors: 0
- Console errors: 0
- External HTTP requests: 0

## Status

`INTAKE_REQUIRED: PIXI_NATIVE`

The candidate was produced by the bounded local candidate builder. Canonical SFHS repository packing and exact SFHS verification were not run in this environment.
