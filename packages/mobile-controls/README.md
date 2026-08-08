# `@sfhs/mobile-controls`

A renderer-neutral browser DOM runtime for normalized mobile controls. The
package understands input primitives, not game mechanics.

## Public boundary

```ts
import { createMobileControls } from "@sfhs/mobile-controls";

const controls = createMobileControls({
  controls: [
    {
      id: "move",
      type: "stick2d",
      label: "Move",
      layout: {
        portrait: { x: 0.04, y: 0.72, width: 0.3, height: 0.23 },
        landscape: { x: 0.03, y: 0.57, width: 0.23, height: 0.36 }
      }
    }
  ],
  persistence: { key: "my-product.mobile-controls.v1" }
});

controls.mount(document.querySelector("#mobile-controls"));

// Call at the product's authoritative update boundary.
const input = controls.flush();
```

The controller supplies `mount`, `destroy`, `read`, `flush`, `subscribe`,
`releaseAll`, profile/config/layout updates, draft editing, deterministic profile
export/import, and reset.

`read()` never drains state. `flush()` returns the current immutable snapshot and
then drains only `relative1d` deltas and `pulse` counts. Event subscriptions are
observational and are not a simulation clock.

## Relative contract

`relative1d.rawNormalizedDelta` is finger travel divided by the actual control
axis extent. One full horizontal LOOK-control width is approximately `1.0`.
`delta` applies the profile's dimensionless relative-sensitivity multiplier.
Degrees, radians, mouse counts, and other product gain remain adapter-owned.

## Profile

The only accepted schema is `sfhs.mobile-controls-profile@1`. It contains:

- opacity `0.1..1.0`;
- normalized stick dead zone `0..0.5`;
- relative sensitivity `0.25..4.0`;
- complete normalized portrait and landscape rectangles.

Profiles contain no runtime action state or timestamps. Unknown versions,
unknown control IDs, corrupt storage, unavailable storage, and failed writes do
not prevent the controller from mounting.

## Geometry and resize limits

Control rectangles are normalized to the mounted control surface. A declaration
may provide `minWidth` and `minHeight`; when omitted, each currently resolves to
the package's generic `0.08` default. The editor clamps drag-resize geometry
against those resolved minima before applying or persisting a layout.

Products may explicitly choose smaller or larger per-control minima. Those are
consumer configuration, not shared control semantics: each consumer is
responsible for selecting touch-target sizes appropriate to its product and
devices. Product CSS may also present a visual smaller or differently shaped
element inside the underlying control rectangle; that visual choice does not
change the package-owned input geometry.

## Styling

The runtime creates elements marked with `data-sfhs-control-id` and
`data-sfhs-control-type`. Products may customize the package classes and these
CSS variables without changing semantics:

- `--sfhs-mobile-controls-opacity`
- `--sfhs-mobile-controls-accent`
- `--sfhs-mobile-controls-bg`
- `--sfhs-mobile-controls-fg`

The package has no Pixi, Fabric, Canvas, Babylon, SDL, Emscripten, Doom, or game
state dependency.
