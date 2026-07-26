# First plugin seam recommendation

**Status:** PROPOSED small extraction experiment  
**Source basis:** [Active Pixi source inventory](ACTIVE-PIXI-SOURCE-INVENTORY.md)  
**Not a stable API. Not a framework implementation.**

## Recommendation

Start with a **host-relative pointer-coordinate mapping contract** that consumes an immutable viewport snapshot.

**Why this seam:** it is the smallest inspected capability that is useful across Pixi, Canvas 2D, DOM/CSS, and raycasting lanes without importing Pixi types. The active HOMEOSTASIS shell uses raw client coordinates for touch zones while its viewport/layout/fullscreen work is separate. A reusable mapping utility can make host bounds, visual-viewport offsets, CSS scaling, and logical coordinates explicit and testable.

This experiment does **not** replace the existing Pixi runtime, renderer lifecycle, or game input system.

## Proposed experiment

A narrow, internal-only contract may resemble:

```ts
mapPointerToHost(clientPoint, hostRect, viewportSnapshot) -> {
  cssX, cssY,
  logicalX, logicalY,
  insideHost
}
```

The final names and fields must come from a bounded implementation phase. The shared portion remains renderer-neutral; a Pixi adapter, Canvas presenter, DOM shell, or raycaster can consume the result independently.

### Minimal fixture

A self-contained fixture with an offset/scaled host and semantic targets. It must dispatch real pointer events through:

1. initial portrait layout;
2. portrait -> landscape -> portrait;
3. fullscreen enter/exit where the browser supports it;
4. updated host bounds after each resize.

### Proposed acceptance proof

- Browser proof records host rectangle, viewport snapshot, mapped coordinates, and activated semantic action.
- Visual-center taps activate the intended target.
- Edge taps follow declared bounds.
- Mapping is correct after repeated resize/fullscreen transitions.
- The module imports no Pixi types and does not own a second scheduler.
- A Pixi fixture still has one visible canvas; a non-Pixi fixture can use the same mapper.
- No external runtime requests.

## Alternatives considered

| Candidate | Source basis | Decision |
|---|---|---|
| Renderer lifecycle | `packages/pixi-runtime`, `adapters/pixi-v8` | Rejected as first universal seam: the useful implementation is already explicitly PIXI-LANE and would prematurely elevate Pixi concepts into a cross-lane API. |
| Responsive shell | Homeostasis `main.ts`, `styles.css` | Deferred: safe-area, HUD, fullscreen, and DOM policy are currently too coupled to the game shell. |
| Input coordinate mapping | Homeostasis input/viewport path; generic viewport state | **Chosen:** smallest lane-neutral boundary with precise tests and little project vocabulary. |
| Packager contribution | builder/packer | Deferred: robust but coupled to manifest, esbuild, parse5, and artifact policy. |
| Browser verifier contribution | browser-runner/verifier | Deferred: valuable later; existing proof includes project and release policy decisions. |
| Evidence manifest | evidence/contracts | Deferred: generic shape exists, but device/release policy needs more cross-project evidence. |

## Open questions

- Which existing `SfhsViewportState` fields are sufficient, and which need a deliberately smaller cross-lane snapshot?
- Should the first version be a pure function only, or include a narrowly-owned listener helper?
- How should CSS transforms and browser zoom be represented without guessing?
- Which device-safe-area information belongs in the shared snapshot versus the host shell?

## Explicit non-goals

- No plugin marketplace, registry, package publication, or stable API.
- No renderer abstraction that hides Pixi, Canvas, DOM, or raycasting differences.
- No HOMEOSTASIS mechanics, HUD IDs, upgrade data, or game rules.
- No physical-device acceptance claim.

## Next bounded step

Implement only the fixture and pure mapping experiment on a dedicated branch after review of this recommendation. Keep the result internal and evidence-led; promote nothing to a public contract until a second renderer/application lane validates the shared portion.
