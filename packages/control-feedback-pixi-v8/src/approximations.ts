import type { PixiControlApproximation } from "./types.ts";

export const pixiV8ControlApproximations = Object.freeze([
  {
    id: "layer-shadow",
    contractPrimitive: "ControlShadow",
    pixiV8Strategy: "Additional Graphics shape at the declared offset",
    limitation: "Blur, spread, and inset shading are flattened; offset, color, depth collapse, and layer order are preserved."
  },
  {
    id: "content-slot",
    contractPrimitive: "ControlContentSlot",
    pixiV8Strategy: "Pixi Text label or deterministic status glyph",
    limitation: "Product-specific icon textures require an explicit host content renderer and are never inferred from asset identifiers."
  },
  {
    id: "focus-accessibility",
    contractPrimitive: "focus visual and keyboard activation",
    pixiV8Strategy: "Graphics focus layer plus optional host-owned keyboard target",
    limitation: "Canvas accessibility semantics remain the host product's responsibility; the shared contract and runtime do not contain DOM details."
  }
] as const satisfies readonly PixiControlApproximation[]);
