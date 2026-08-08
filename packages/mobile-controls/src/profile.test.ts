import { describe, expect, it } from "vitest";

import { createDefaultProfile, serializeProfile, validateDeclarations, validateProfile } from "./profile.ts";
import type { MobileControlDeclaration } from "./types.ts";

const controls: readonly MobileControlDeclaration[] = Object.freeze([
  Object.freeze({
    id: "move",
    type: "stick2d",
    label: "Move",
    minWidth: 0.1,
    minHeight: 0.1,
    layout: {
      portrait: { x: 0.05, y: 0.7, width: 0.25, height: 0.2 },
      landscape: { x: 0.03, y: 0.55, width: 0.2, height: 0.35 }
    }
  }),
  Object.freeze({
    id: "look",
    type: "relative1d",
    axis: "x",
    label: "Look",
    layout: {
      portrait: { x: 0.68, y: 0.7, width: 0.27, height: 0.2 },
      landscape: { x: 0.72, y: 0.55, width: 0.25, height: 0.35 }
    }
  })
]);

describe("@sfhs/mobile-controls profiles", () => {
  it("builds deterministic complete defaults", () => {
    const profile = createDefaultProfile(controls, { relativeSensitivity: 1.5 });
    expect(profile.settings).toEqual({ opacity: 0.6, stickDeadZone: 0.08, relativeSensitivity: 1.5 });
    expect(Object.keys(profile.layouts.portrait)).toEqual(["look", "move"]);
    expect(serializeProfile(profile)).toBe(serializeProfile(profile));
    expect(Object.isFrozen(profile.layouts.landscape)).toBe(true);
  });

  it("rejects duplicate declarations and invalid primitive options", () => {
    expect(() => validateDeclarations([controls[0]!, controls[0]!])).toThrow("Duplicate");
    expect(() => validateDeclarations([{ ...controls[0]!, type: "hold", axis: "x" }])).toThrow("axis");
  });

  it("round-trips a valid profile and rejects unknown controls atomically", () => {
    const profile = createDefaultProfile(controls);
    expect(validateProfile(JSON.parse(serializeProfile(profile)) as unknown, controls)).toEqual({
      profile,
      findings: []
    });
    const invalid = {
      ...profile,
      layouts: { ...profile.layouts, portrait: { ...profile.layouts.portrait, doomFire: profile.layouts.portrait.move } }
    };
    const result = validateProfile(invalid, controls);
    expect(result.profile).toBeUndefined();
    expect(result.findings).toEqual([
      expect.objectContaining({ code: "SFHS_MOBILE_CONTROLS_PROFILE_UNKNOWN_CONTROL" })
    ]);
  });

  it("rejects unsupported versions, unsafe geometry, and invalid settings", () => {
    const profile = createDefaultProfile(controls);
    expect(validateProfile({ ...profile, schema: "sfhs.mobile-controls-profile@2" }, controls).findings).toEqual([
      expect.objectContaining({ code: "SFHS_MOBILE_CONTROLS_PROFILE_VERSION_UNSUPPORTED" })
    ]);
    expect(validateProfile({
      ...profile,
      settings: { ...profile.settings, relativeSensitivity: 10 },
      layouts: {
        ...profile.layouts,
        portrait: { ...profile.layouts.portrait, move: { x: 0.9, y: 0.7, width: 0.25, height: 0.2 } }
      }
    }, controls).findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "/settings/relativeSensitivity" }),
      expect.objectContaining({ path: "/layouts/portrait/move" })
    ]));
  });
});
