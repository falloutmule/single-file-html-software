import { p0ControlPresets } from "@sfhs/control-feedback-contract";
import { describe, expect, it } from "vitest";

import { controlLengthCss, domControlStyleText, layerStyleToCss, packageIdentity, semanticElementForPreset } from "./index.ts";
import { shouldSuppressCompatibilityClick } from "./dom.ts";

describe("control feedback DOM adapter", () => {
  it("deduplicates delayed pointer compatibility clicks without blocking assistive clicks", () => {
    expect(shouldSuppressCompatibilityClick(1, 740, 800, 0)).toBe(true);
    expect(shouldSuppressCompatibilityClick(1, 801, 800, 0)).toBe(false);
    expect(shouldSuppressCompatibilityClick(0, 740, 800, 0)).toBe(false);
    expect(shouldSuppressCompatibilityClick(0, 60, 0, 80)).toBe(true);
  });

  it("maps semantics to native element roles", () => {
    expect(semanticElementForPreset(p0ControlPresets[0])).toBe("button");
    expect(semanticElementForPreset(p0ControlPresets[3])).toBe("checkbox-switch");
    expect(semanticElementForPreset(p0ControlPresets[4])).toBe("radio");
    expect(semanticElementForPreset({ ...p0ControlPresets[0], semantic: { kind: "toggle", variant: "checkbox" } })).toBe("checkbox");
  });

  it("renders renderer-neutral gradients through native CSS", () => {
    expect(layerStyleToCss({ role: "surface", shape: "capsule", gradient: { kind: "linear", angleDeg: 45, stops: [{ offset: 0, color: "#000000FF" }, { offset: 1, color: "#FFFFFFFF" }] } })).toMatchObject({
      background: "linear-gradient(45deg, #000000FF 0%, #FFFFFFFF 100%)",
      borderRadius: "999px"
    });
  });

  it("renders portable overshoot with a bounded rebound curve", () => {
    expect(layerStyleToCss({ role: "surface", shape: "round-rect", fill: "#000000FF", transition: { durationMs: 180, easing: "ease-out", overshoot: 0.2 } }).transition).toContain("cubic-bezier(.2,1.2,.3,1)");
  });

  it("maps neutral bounds and composes their anchor with state transforms", () => {
    expect(layerStyleToCss({
      role: "content", shape: "circle", contentSlot: "icon-leading",
      bounds: { x: { value: 0.2, unit: "ratio" }, y: { value: 0.5, unit: "ratio" }, width: { value: 36, unit: "px" }, height: { value: 1.2, unit: "ratio" }, anchorX: 0.5, anchorY: 0.5 },
      transform: { translateX: { value: 4, unit: "px" }, scaleX: 1.1, scaleY: 1.1 }, transition: { durationMs: 120, easing: "ease-out" }
    })).toMatchObject({
      inset: "auto", left: "20%", top: "50%", width: "36px", height: "120%",
      transform: "translate(-50%, -50%) translate(4px, 0) scale(1.1, 1.1)"
    });
    expect(layerStyleToCss({ role: "content", shape: "rect", transition: { durationMs: 90, easing: "linear" } }).transition).toContain("width 90ms linear 0ms");
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

  it("ships focus, effects, reduced-motion, separate hit-target, and long-press protection CSS", () => {
    expect(packageIdentity).toBe("@sfhs/control-feedback-dom");
    expect(domControlStyleText).toContain(".sfhs-cf-interactive");
    expect(domControlStyleText).toContain("data-focus-visible");
    expect(domControlStyleText).toContain("prefers-reduced-motion");
    expect(domControlStyleText).toContain("sfhs-cf-ripple");
    expect(domControlStyleText).toContain("-webkit-user-select:none");
    expect(domControlStyleText).toContain("-webkit-touch-callout:none");
    expect(domControlStyleText).not.toMatch(/https?:\/\//u);
  });
});
