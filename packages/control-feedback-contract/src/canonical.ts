import { canonicalJsonStringify } from "@sfhs/contracts";

import type { ControlPreset } from "./types.ts";
import { validateControlPreset, validateControlPresets } from "./validation.ts";

export function canonicalControlPresetJson(preset: ControlPreset): string {
  const result = validateControlPreset(preset);
  if (!result.valid) {
    throw new TypeError(`Cannot canonicalize invalid control preset: ${result.findings.map((finding) => `${finding.path} ${finding.code}`).join(", ")}`);
  }
  return canonicalJsonStringify(preset);
}

export function canonicalControlPresetSetJson(presets: readonly ControlPreset[]): string {
  const result = validateControlPresets(presets);
  if (!result.valid) {
    throw new TypeError(`Cannot canonicalize invalid control preset set: ${result.findings.map((finding) => `${finding.path} ${finding.code}`).join(", ")}`);
  }
  return canonicalJsonStringify(presets);
}
