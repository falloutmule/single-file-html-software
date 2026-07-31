# Remix Repair

## Scope

Add one bounded anti-deadlock mechanic without changing district footprints,
piece queues, level objectives, scoring, terrain, utility-overlap rules, camera,
or existing controls.

## Rule

A new run begins with one Remix charge. Pressing Remix rearranges the content
inside the current district while keeping:

- the exact occupied cell coordinates;
- the visible surface silhouette;
- the count of every home, apartment, shop, road, park, plaza, and bore;
- the current piece ID;
- the current anchor;
- the current rotation;
- the current drop count.

Surface-bearing payloads exchange positions only with other surface-bearing
cells. Underground-only payloads exchange positions only with underground-only
cells. This prevents Remix from changing a district's visible outline.

## Charge behavior

- Remix consumes one charge only when a distinct alternate arrangement exists.
- A piece with no alternate arrangement, such as Service Bore, cannot waste a
  charge.
- When charges reach zero, the Remix button remains visible but disabled for
  remixable pieces.
- Each newly drawn or dropped piece starts in its authored base arrangement.

## Upgrade

`Remix Permit` is a persistent upgrade card. Selecting it grants one additional
Remix charge for the current run.

## Interface

The current-piece panel contains a touch-safe `REMIX · N` control. The permanent
information panel explains that Remix keeps the footprint unchanged and reports
remaining charges. Keyboard shortcut: `M`.

## Verification

- strict TypeScript: pass;
- all existing deterministic level solutions: pass;
- utility-overlap regressions: pass;
- focused Remix simulation: pass;
- focused mobile Chromium proof: 23 assertions pass;
- focused desktop Remix proof: pass;
- one visible Pixi canvas;
- no page or console errors;
- no external HTTP requests.

Canonical SFHS pack and exact verify remain unrun in this environment.
