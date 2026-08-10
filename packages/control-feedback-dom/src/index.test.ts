import { p0ControlPresets } from "@sfhs/control-feedback-contract";
import { describe, expect, it } from "vitest";

import { controlLengthCss, domControlStyleText, layerStyleToCss, packageIdentity, semanticElementForPreset } from "./index.ts";

describe("control feedback DOM adapter", () => {
  it("maps semantics to native element roles", () => {
    expect(semanticElementForPreset(p0ControlPresets[0])).toBe("button");
    expect(semanticElementForPreset(p0ControlPresets[3])).toBe("checkbox-switch");
    expect(semanticElementForPreset(p0ControlPresets[4])).toBe("radio");
  });

  it("translates renderer-neutral lengths and tactile layer styles", () => {
    expect(controlLengthCss({ value: 4, unit: "px" })).toBe("4px");
    expect(controlLengthCss({ value: 0.5, unit: "ratio" })).toBe("50%");
    const pressed = p0ControlPresets[0].visuals.pressedInside?.layers?.[0];
    if (pressed === undefined) throw new Error("Missing pressed fixture.");
    expect(layerStyleToCss(pressed)).toMatchObject({
      background: "#6750A4FF",
      borderRadius: "8px",
      boxShadow: "",
      transform: "translate(0, 4px)"
    });
  });

  it("ships focus, effects, reduced-motion, and separate hit-target CSS", () => {
    expect(packageIdentity).toBe("@sfhs/control-feedback-dom");
    expect(domControlStyleText).toContain(".sfhs-cf-interactive");
    expect(domControlStyleText).toContain("data-focus-visible");
    expect(domControlStyleText).toContain("prefers-reduced-motion");
    expect(domControlStyleText).toContain("sfhs-cf-ripple");
    expect(domControlStyleText).not.toMatch(/https?:\/\//u);
  });
});
