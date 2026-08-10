import { canonicalJsonStringify } from "@sfhs/contracts";

import type { ControlPack, ControlPreset } from "./types.ts";
import { validateControlPack, validateControlPreset, validateControlPresets } from "./validation.ts";

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

export function canonicalControlPackJson(pack: ControlPack): string {
  const result = validateControlPack(pack);
  if (!result.valid) throw new TypeError(`Cannot canonicalize invalid control pack: ${result.findings.map((finding) => `${finding.path} ${finding.code}`).join(", ")}`);
  return canonicalJsonStringify(pack);
}
