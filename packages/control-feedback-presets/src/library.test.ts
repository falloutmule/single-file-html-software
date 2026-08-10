import { canonicalControlPackJson, canonicalControlPresetSetJson, validateControlPack, validateControlPresets } from "@sfhs/control-feedback-contract";
import { describe, expect, it } from "vitest";

import { controlFeedbackPresetEntries, controlFeedbackPresetIds, controlFeedbackPresets, findControlFeedbackPreset, presetsInCategory, vettedControlFeedbackPack } from "./library.ts";

describe("complete control feedback preset library", () => {
  it("ships exactly the 25 vetted presets in frozen inventory order", () => {
    expect(controlFeedbackPresetIds).toHaveLength(25);
    expect(new Set(controlFeedbackPresetIds).size).toBe(25);
    expect(controlFeedbackPresetIds[0]).toBe("uv-plastic-inset-press");
    expect(controlFeedbackPresetIds.at(-1)).toBe("mu-glare-sweep");
    expect(controlFeedbackPresetIds.filter((id) => id.startsWith("uv-"))).toHaveLength(11);
    expect(controlFeedbackPresetIds.filter((id) => id.startsWith("an-"))).toHaveLength(8);
    expect(controlFeedbackPresetIds.filter((id) => id.startsWith("mu-"))).toHaveLength(6);
  });

  it("strictly validates every preset and the reusable all-presets pack", () => {
    expect(validateControlPresets(controlFeedbackPresets)).toEqual({ valid: true, findings: [] });
    expect(validateControlPack(vettedControlFeedbackPack)).toEqual({ valid: true, findings: [] });
    expect(canonicalControlPackJson(vettedControlFeedbackPack)).toBe(canonicalControlPackJson(structuredClone(vettedControlFeedbackPack)));
  });

  it("supplies complete interaction fallbacks and renderer-neutral gradient recipes", () => {
    for (const preset of controlFeedbackPresets) {
      expect(preset.visuals.focus, preset.id).toBeDefined();
      expect(preset.visuals.pressedInside, preset.id).toBeDefined();
      expect(preset.visuals.pressedOutside, preset.id).toBeDefined();
      expect(preset.visuals.disabled, preset.id).toBeDefined();
      expect(preset.visuals.reducedMotion, preset.id).toBeDefined();
    }
    const canonical = canonicalControlPresetSetJson(controlFeedbackPresets);
    expect(canonical).not.toMatch(/(?:react|tailwind|pixi|className)/iu);
    expect(canonical.match(/"gradient"/gu)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it("organizes presets by useful categories and exposes stable lookup", () => {
    expect(controlFeedbackPresetEntries.every((entry) => entry.normalizedPrimitive.length > 20)).toBe(true);
    expect(presetsInCategory("toggle")).toHaveLength(3);
    expect(presetsInCategory("ripple")).toHaveLength(2);
    expect(presetsInCategory("shine-shimmer")).toHaveLength(3);
    expect(findControlFeedbackPreset("uv-like-pop-toggle")?.semantic).toEqual({ kind: "toggle", variant: "checkbox" });
    expect(findControlFeedbackPreset("not-a-preset")).toBeUndefined();
  });
});
