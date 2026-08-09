import { describe, expect, it } from "vitest";

import {
  canonicalControlPresetSetJson,
  controlPresetSchema,
  frozenP0DonorSources,
  p0ControlPresetIds,
  p0ControlPresets,
  validateControlPreset,
  validateControlPresets
} from "./index.ts";

describe("control feedback contract", () => {
  it("keeps exactly the eight frozen P0 fixtures", () => {
    expect(p0ControlPresetIds).toEqual([
      "uv-plastic-inset-press",
      "uv-simple-drop-press",
      "uv-diagonal-offset-press",
      "uv-basic-toggle",
      "uv-skeuo-icon-choice",
      "an-pointer-field-ripple",
      "an-status-cycle",
      "mu-multi-activation-ripple"
    ]);
    expect(p0ControlPresets.every((preset) => preset.schema === controlPresetSchema)).toBe(true);
    expect(validateControlPresets(p0ControlPresets)).toEqual({ valid: true, findings: [] });
  });

  it("freezes all donor files at 40-hex commit and blob identities", () => {
    expect(frozenP0DonorSources).toHaveLength(9);
    for (const source of frozenP0DonorSources) {
      expect(source.commit).toMatch(/^[0-9a-f]{40}$/u);
      expect(source.blobSha).toMatch(/^[0-9a-f]{40}$/u);
      expect(source.license).toBe("MIT");
    }
  });

  it("rejects duplicate preset IDs", () => {
    const result = validateControlPresets([p0ControlPresets[0], p0ControlPresets[0]]);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "SFHS_CONTROL_DUPLICATE_ID")).toBe(true);
  });

  it("rejects provenance drift", () => {
    const preset = structuredClone(p0ControlPresets[0]) as unknown as { provenance: { sources: { commit: string }[] } };
    const source = preset.provenance.sources[0];
    expect(source).toBeTruthy();
    if (source === undefined) throw new Error("missing fixture provenance source");
    source.commit = "0".repeat(40);
    const result = validateControlPreset(preset);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "SFHS_CONTROL_PROVENANCE_MISMATCH")).toBe(true);
  });

  it("rejects swapping a preset to a different frozen source from the same donor", () => {
    const preset = structuredClone(p0ControlPresets[0]) as unknown as { provenance: { sources: { repository: string; commit: string; path: string; blobSha: string }[] } };
    preset.provenance.sources = [{
      repository: "uiverse-io/galaxy",
      commit: "adbd2adde0a299a3956ea288fb444ec01891ca41",
      path: "Buttons/krlozCJ_blue-dodo-17.html",
      blobSha: "d2ba48cdb4e7e7cf1e2d5fe32b706c6a2c9fa682"
    }];
    const result = validateControlPreset(preset);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "SFHS_CONTROL_PROVENANCE_MISMATCH")).toBe(true);
  });

  it("rejects explicit undefined so validation and canonical JSON agree", () => {
    const preset = structuredClone(p0ControlPresets[0]) as unknown as { cues?: unknown; [key: string]: unknown };
    preset.cues = undefined;
    const result = validateControlPreset(preset);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "SFHS_CONTROL_SCHEMA_INVALID" && finding.path === "/cues")).toBe(true);
  });

  it("rejects renderer/framework strings in shared visual data", () => {
    const preset = structuredClone(p0ControlPresets[0]) as unknown as { cues?: { press?: string } };
    preset.cues = { press: "pixijs-runtime" };
    const result = validateControlPreset(preset);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.code === "SFHS_CONTROL_RENDERER_STRING_FORBIDDEN")).toBe(true);
  });

  it("rejects negative durations and invalid ripple caps", () => {
    const field = structuredClone(p0ControlPresets[5]) as unknown as { visuals: { base: { effects: { enter: { durationMs: number } }[] } } };
    const fieldEffect = field.visuals.base.effects[0];
    if (fieldEffect === undefined) throw new Error("missing field ripple fixture effect");
    fieldEffect.enter.durationMs = -1;
    expect(validateControlPreset(field).findings.some((finding) => finding.code === "SFHS_CONTROL_DURATION_INVALID")).toBe(true);

    const ripple = structuredClone(p0ControlPresets[7]) as unknown as { visuals: { base: { effects: { concurrentCap: number }[] } } };
    const rippleEffect = ripple.visuals.base.effects[0];
    if (rippleEffect === undefined) throw new Error("missing activation ripple fixture effect");
    rippleEffect.concurrentCap = 0;
    expect(validateControlPreset(ripple).findings.some((finding) => finding.code === "SFHS_CONTROL_RIPPLE_CAP_INVALID")).toBe(true);
  });

  it("rejects toggle presets without track/thumb visual data", () => {
    const preset = structuredClone(p0ControlPresets[3]) as unknown as { toggleVisual?: unknown };
    delete preset.toggleVisual;
    const result = validateControlPreset(preset);
    expect(result.valid).toBe(false);
    expect(result.findings.some((finding) => finding.path === "/toggleVisual")).toBe(true);
  });

  it("rejects unknown fields, invalid schema, and malformed choice semantics", () => {
    const unknownField = { ...structuredClone(p0ControlPresets[0]), surprise: true };
    expect(validateControlPreset(unknownField).findings.some((finding) => finding.code === "SFHS_CONTROL_UNKNOWN_FIELD")).toBe(true);

    const schemaDrift = { ...structuredClone(p0ControlPresets[0]), schema: "sfhs.control-preset@9" };
    expect(validateControlPreset(schemaDrift).findings.some((finding) => finding.code === "SFHS_CONTROL_SCHEMA_INVALID")).toBe(true);

    const badChoice = structuredClone(p0ControlPresets[4]) as unknown as { semantic: { kind: string; groupId: string; value: string } };
    badChoice.semantic.groupId = "Bad Group";
    expect(validateControlPreset(badChoice).findings.some((finding) => finding.code === "SFHS_CONTROL_CHOICE_INVALID")).toBe(true);
  });

  it("rejects invalid colors, non-finite numbers, and unsupported easing", () => {
    const badColor = structuredClone(p0ControlPresets[0]) as unknown as { visuals: { base: { layers: { fill?: string }[] } } };
    const colorLayer = badColor.visuals.base.layers[0];
    if (colorLayer === undefined) throw new Error("missing color fixture layer");
    colorLayer.fill = "red";
    expect(validateControlPreset(badColor).findings.some((finding) => finding.code === "SFHS_CONTROL_COLOR_INVALID")).toBe(true);

    const nonFinite = structuredClone(p0ControlPresets[0]) as unknown as { visuals: { pressedInside: { layers: { transform: { translateY: { value: number } } }[] } } };
    const transformLayer = nonFinite.visuals.pressedInside.layers[0];
    if (transformLayer === undefined) throw new Error("missing transform fixture layer");
    transformLayer.transform.translateY.value = Number.NaN;
    expect(validateControlPreset(nonFinite).findings.some((finding) => finding.code === "SFHS_CONTROL_NUMBER_INVALID")).toBe(true);

    const easing = structuredClone(p0ControlPresets[0]) as unknown as { visuals: { base: { layers: { transition: { easing: string } }[] } } };
    const easingLayer = easing.visuals.base.layers[0];
    if (easingLayer === undefined) throw new Error("missing easing fixture layer");
    easingLayer.transition.easing = "spring";
    expect(validateControlPreset(easing).findings.some((finding) => finding.code === "SFHS_CONTROL_PRIMITIVE_INVALID")).toBe(true);
  });

  it("rejects missing provenance and invalid ratio-domain values", () => {
    const missing = structuredClone(p0ControlPresets[0]) as unknown as { provenance?: unknown };
    delete missing.provenance;
    expect(validateControlPreset(missing).findings.some((finding) => finding.code === "SFHS_CONTROL_PROVENANCE_MISSING")).toBe(true);

    const ratioValue = structuredClone(p0ControlPresets[3]) as unknown as { toggleVisual: { selectedThumbTransform: { translateX: { value: number } } } };
    ratioValue.toggleVisual.selectedThumbTransform.translateX.value = -1;
    expect(validateControlPreset(ratioValue).findings.some((finding) => finding.code === "SFHS_CONTROL_RATIO_INVALID")).toBe(true);
  });

  it("produces byte-stable canonical JSON independent of object key insertion order", () => {
    const first = canonicalControlPresetSetJson(p0ControlPresets);
    const reordered = p0ControlPresets.map((preset) => {
      const { provenance, visuals, semantic, title, id, schema, ...rest } = preset;
      return { provenance, visuals, semantic, title, id, schema, ...rest };
    });
    expect(canonicalControlPresetSetJson(reordered)).toBe(first);
  });
});
