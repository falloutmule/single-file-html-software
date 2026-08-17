import { canonicalControlPackJson, canonicalControlPresetSetJson, validateControlPack, validateControlPresets } from "@sfhs/control-feedback-contract";
import { describe, expect, it } from "vitest";

import { controlFeedbackPresetEntries, controlFeedbackPresetIds, controlFeedbackPresets, controlFeedbackVisualConformance, findControlFeedbackPreset, presetsInCategory, vettedControlFeedbackPack } from "./library.ts";

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

  it("repairs and truthfully classifies all 11 visual-conformance targets", () => {
    expect(Object.keys(controlFeedbackVisualConformance)).toHaveLength(11);
    expect(Object.values(controlFeedbackVisualConformance).filter((finding) => finding.level === "FULL")).toHaveLength(9);
    expect(Object.values(controlFeedbackVisualConformance).filter((finding) => finding.level === "PARTIAL")).toHaveLength(2);
    expect(Object.values(controlFeedbackVisualConformance).some((finding) => finding.level === "BROKEN")).toBe(false);
    for (const id of Object.keys(controlFeedbackVisualConformance)) {
      const preset = findControlFeedbackPreset(id);
      expect(preset, id).toBeDefined();
      const layers = [
        ...(preset?.visuals.base.layers ?? []),
        ...(preset?.visuals.selected?.layers ?? []),
        ...(preset?.visuals.hover?.layers ?? []),
        ...Object.values(preset?.visuals.status ?? {}).flatMap((state) => state?.layers ?? [])
      ];
      expect(layers.some((layer) => layer.contentSlot !== undefined), `${id} must render real slot content`).toBe(true);
    }
    for (const id of ["uv-dark-capsule-icon", "uv-sun-moon-toggle", "uv-like-pop-toggle", "uv-skeuo-icon-choice", "an-status-cycle", "an-overlay-arrow-swap", "an-expanding-leading-fill", "an-rising-bubble-fill", "an-arrow-conveyor", "mu-dot-flood-reveal"]) {
      const preset = findControlFeedbackPreset(id);
      const states = [preset?.visuals.base, preset?.visuals.selected, preset?.visuals.hover, ...Object.values(preset?.visuals.status ?? {})];
      expect(states.some((state) => state?.layers?.some((layer) => layer.bounds !== undefined)), `${id} must use bounded geometry`).toBe(true);
    }
  });
});
