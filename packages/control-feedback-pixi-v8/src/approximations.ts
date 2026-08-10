import type { PixiControlApproximation } from "./types.ts";

export const pixiV8ControlApproximations = Object.freeze([
  {
    id: "gradient-fill",
    contractPrimitive: "ControlGradient",
    pixiV8Strategy: "Representative middle gradient stop rendered as a Graphics fill",
    limitation: "DOM preserves declared linear, radial, and conic gradients; the initial Pixi v8 adapter explicitly flattens them while preserving geometry, opacity, state, and interaction semantics. Hosts may supply a shader-backed enhancement."
  },
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
