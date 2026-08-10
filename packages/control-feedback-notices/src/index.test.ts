import { controlPresetSchema, type ControlPreset } from "@sfhs/control-feedback-contract";
import { controlFeedbackPresets, findControlFeedbackPreset } from "@sfhs/control-feedback-presets";
import { describe, expect, it } from "vitest";

import { canonicalControlThirdPartyNoticesJson, controlThirdPartyNoticesText, frozenUiverseAttribution, generateControlThirdPartyNotices } from "./index.ts";

function preset(id: string): ControlPreset {
  const value = findControlFeedbackPreset(id);
  if (value === undefined) throw new Error(`Missing test preset ${id}.`);
  return value;
}

describe("control feedback third-party notices", () => {
  it("closes over only donors and sources used by selected presets", () => {
    const notices = generateControlThirdPartyNotices([preset("uv-plastic-inset-press")]);
    expect(notices.donors).toHaveLength(1);
    expect(notices.donors[0]?.donor).toBe("uiverse");
    expect(notices.donors[0]?.sources).toHaveLength(1);
    expect(notices.donors[0]?.sources[0]?.attribution).toBe("From Uiverse.io by cssbuttons-io");
    expect(controlThirdPartyNoticesText([preset("uv-plastic-inset-press")])).not.toContain("Magic UI");
  });

  it("is deterministic independent of selected preset order", () => {
    const selected = [preset("mu-glare-sweep"), preset("an-status-cycle"), preset("uv-dark-capsule-icon")];
    expect(canonicalControlThirdPartyNoticesJson(selected)).toBe(canonicalControlThirdPartyNoticesJson([...selected].reverse()));
    expect(generateControlThirdPartyNotices(selected).donors.map((donor) => donor.donor)).toEqual(["animata", "magicui", "uiverse"]);
  });

  it("preserves all Uiverse author comments and exact frozen MIT notices", () => {
    const notices = generateControlThirdPartyNotices(controlFeedbackPresets);
    expect(Object.keys(frozenUiverseAttribution)).toHaveLength(11);
    expect(notices.donors).toHaveLength(3);
    expect(notices.donors.find((donor) => donor.donor === "uiverse")?.sources.every((source) => source.attribution !== undefined)).toBe(true);
    for (const donor of notices.donors) {
      expect(donor.licenseText).toContain("MIT License");
      expect(donor.licenseText).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
      expect(donor.commit).toMatch(/^[0-9a-f]{40}$/u);
    }
  });

  it("emits no donor notice for an original editor-authored preset", () => {
    const original: ControlPreset = { schema: controlPresetSchema, id: "my-control", title: "My Control", semantic: { kind: "momentary" }, visuals: { base: {} }, provenance: { origin: "sfhs-original" } };
    expect(generateControlThirdPartyNotices([original]).donors).toEqual([]);
    expect(controlThirdPartyNoticesText([original])).toContain("No third-party control presets are included.");
  });

  it("cannot suppress a frozen donor notice by relabeling its reserved preset ID", () => {
    const disguised = structuredClone(preset("uv-plastic-inset-press"));
    (disguised as unknown as { provenance: unknown }).provenance = { origin: "sfhs-original" };
    expect(() => generateControlThirdPartyNotices([disguised])).toThrow("SFHS_CONTROL_PROVENANCE_MISMATCH");
  });
});
