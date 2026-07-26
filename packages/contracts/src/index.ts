export const packageIdentity = "@sfhs/contracts" as const;

export type { SfhsProjectManifest } from "./project-manifest.ts";
export type { SfhsArtifactManifest } from "./artifact-manifest.ts";
export type { SfhsEvidenceManifest } from "./evidence-manifest.ts";
export type {
  SfhsPhysicalDeviceAcceptanceManifest,
  SfhsPhysicalDeviceOrientationResult
} from "./device-acceptance.ts";

export {
  canonicalizeJson,
  canonicalJsonStringify,
  type JsonValue
} from "./canonical-json.ts";
export {
  validateArtifactManifest,
  validateEvidenceManifest,
  validatePhysicalDeviceAcceptanceManifest,
  validateProjectManifest,
  type ManifestValidationResult,
  type ValidationFinding,
  type ValidationFindingCode,
  type ValidationFindingSeverity,
  type ManifestValidationOptions
} from "./validation.ts";
