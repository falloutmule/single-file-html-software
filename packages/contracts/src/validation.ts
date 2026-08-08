import Ajv2020, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";

import artifactSchema from "../schemas/sfhs.artifact.schema.json" with { type: "json" };
import deviceAcceptanceSchema from "../schemas/sfhs.device-acceptance.schema.json" with { type: "json" };
import evidenceSchema from "../schemas/sfhs.evidence.schema.json" with { type: "json" };
import projectSchema from "../schemas/sfhs.project.schema.json" with { type: "json" };

export type ValidationFindingCode =
  | "SFHS_ADAPTER_UNKNOWN"
  | "SFHS_DEVICE_ACCEPTANCE_FAILED"
  | "SFHS_DEVICE_MODEL_UNSUPPORTED"
  | "SFHS_DEVICE_NOT_PHYSICAL"
  | "SFHS_DEVICE_WEBGL_UNSUPPORTED"
  | "SFHS_PATH_INVALID"
  | "SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN"
  | "SFHS_SCHEMA_INVALID"
  | "SFHS_SCHEMA_UNKNOWN_FIELD";

export type ValidationFindingSeverity = "error" | "warning";

export interface ManifestValidationOptions {
  readonly mode?: "development" | "release";
}

export interface ValidationFinding {
  readonly code: ValidationFindingCode;
  readonly severity: ValidationFindingSeverity;
  readonly path: string;
  readonly message: string;
}

export interface ManifestValidationResult {
  readonly valid: boolean;
  readonly findings: readonly ValidationFinding[];
}

const requiredRendererByAdapter = new Map([
  ["pixi-v8", "webgl"],
  ["dom-canvas-fabric", "canvas2d"],
  ["dom-interactive", "none"]
]);
const knownAdapterIds = new Set(requiredRendererByAdapter.keys());
const sourcePathForbiddenSegments = new Set([".git", "dist", "evidence", "node_modules"]);

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false
});

const artifactValidator = ajv.compile(artifactSchema);
const deviceAcceptanceValidator = ajv.compile(deviceAcceptanceSchema);
const evidenceValidator = ajv.compile(evidenceSchema);
const projectValidator = ajv.compile(projectSchema);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function joinJsonPointer(parent: string, child: string): string {
  const escapedChild = child.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${parent}/${escapedChild}`;
}

function findingFromSchemaError(
  error: ErrorObject,
  mode: "development" | "release"
): ValidationFinding {
  const path =
    error.keyword === "additionalProperties" &&
    typeof error.params.additionalProperty === "string"
      ? joinJsonPointer(error.instancePath, error.params.additionalProperty)
      : error.instancePath || "/";

  return {
    code: error.keyword === "additionalProperties" ? "SFHS_SCHEMA_UNKNOWN_FIELD" : "SFHS_SCHEMA_INVALID",
    severity: error.keyword === "additionalProperties" && mode === "development" ? "warning" : "error",
    path,
    message: error.message ?? error.keyword
  };
}

function sortFindings(findings: readonly ValidationFinding[]): readonly ValidationFinding[] {
  return [...findings].sort((left, right) => {
    const byPath = left.path.localeCompare(right.path);
    return byPath === 0 ? left.code.localeCompare(right.code) : byPath;
  });
}

function validateSchema(
  validator: ValidateFunction,
  value: unknown,
  mode: "development" | "release"
): readonly ValidationFinding[] {
  if (validator(value)) {
    return [];
  }

  return sortFindings((validator.errors ?? []).map((error) => findingFromSchemaError(error, mode)));
}

function isProjectRelativePath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  if (normalized.length === 0 || normalized.startsWith("/") || normalized.startsWith("//")) {
    return false;
  }

  if (/^[A-Za-z]:\//u.test(normalized)) {
    return false;
  }

  return !normalized.split("/").some((segment) => segment === ".." || sourcePathForbiddenSegments.has(segment));
}

function isBuildOutputPath(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");

  if (normalized.length === 0 || normalized.startsWith("/") || normalized.startsWith("//")) {
    return false;
  }

  if (/^[A-Za-z]:\//u.test(normalized)) {
    return false;
  }

  const segments = normalized.split("/");
  if (segments[0] !== "dist" || segments.length < 2) {
    return false;
  }

  return !segments.some(
    (segment, index) =>
      segment === ".." ||
      (index > 0 && (segment === ".git" || segment === "evidence" || segment === "node_modules"))
  );
}

function sourcePathFinding(path: string, value: unknown): ValidationFinding | undefined {
  if (typeof value === "string" && isProjectRelativePath(value)) {
    return undefined;
  }

  return {
    code: "SFHS_PATH_INVALID",
    severity: "error",
    path,
    message: "Path must stay inside the authored project source boundary."
  };
}

function validateProjectSemantics(value: unknown): readonly ValidationFinding[] {
  const manifest = asRecord(value);
  const adapter = asRecord(manifest?.adapter);
  const source = asRecord(manifest?.source);
  const assets = asRecord(manifest?.assets);
  const build = asRecord(manifest?.build);
  const findings: ValidationFinding[] = [];

  if (typeof adapter?.id === "string" && !knownAdapterIds.has(adapter.id)) {
    findings.push({
      code: "SFHS_ADAPTER_UNKNOWN",
      severity: "error",
      path: "/adapter/id",
      message: `Unknown SFHS adapter: ${adapter.id}.`
    });
  }
  const renderer = asRecord(adapter?.renderer);
  const requiredRenderer = typeof adapter?.id === "string" ? requiredRendererByAdapter.get(adapter.id) : undefined;
  if (requiredRenderer !== undefined && renderer?.required !== requiredRenderer) {
    findings.push({
      code: "SFHS_SCHEMA_INVALID",
      severity: "error",
      path: "/adapter/renderer/required",
      message: `Adapter ${String(adapter?.id)} requires renderer ${requiredRenderer}.`
    });
  }

  for (const [key, path] of [
    ["html", "/source/html"],
    ["entry", "/source/entry"],
    ["publicDir", "/source/publicDir"]
  ] as const) {
    const finding = sourcePathFinding(path, source?.[key]);
    if (finding !== undefined) {
      findings.push(finding);
    }
  }

  if (Array.isArray(source?.styles)) {
    for (const [index, style] of source.styles.entries()) {
      const finding = sourcePathFinding(`/source/styles/${index}`, style);
      if (finding !== undefined) {
        findings.push(finding);
      }
    }
  }

  if (typeof build?.output !== "string" || !isBuildOutputPath(build.output)) {
    findings.push({
      code: "SFHS_PATH_INVALID",
      severity: "error",
      path: "/build/output",
      message: "Build output must be a project-relative path under dist/."
    });
  }

  if (Array.isArray(assets?.runtimeExternalUrls) && assets.runtimeExternalUrls.length > 0) {
    findings.push({
      code: "SFHS_RUNTIME_EXTERNAL_URL_FORBIDDEN",
      severity: "error",
      path: "/assets/runtimeExternalUrls",
      message: "Runtime external URLs are forbidden by the SFHS v0.1 contract."
    });
  }

  return sortFindings(findings);
}

function resultFromFindings(findings: readonly ValidationFinding[]): ManifestValidationResult {
  return {
    valid: !findings.some((finding) => finding.severity === "error"),
    findings
  };
}

export function validateProjectManifest(
  value: unknown,
  options: ManifestValidationOptions = {}
): ManifestValidationResult {
  const mode = options.mode ?? "development";
  const schemaFindings = validateSchema(projectValidator, value, mode);
  if (schemaFindings.some((finding) => finding.severity === "error")) {
    return resultFromFindings(schemaFindings);
  }

  return resultFromFindings([...schemaFindings, ...validateProjectSemantics(value)]);
}

export function validateArtifactManifest(value: unknown): ManifestValidationResult {
  return resultFromFindings(validateSchema(artifactValidator, value, "release"));
}

export function validateEvidenceManifest(value: unknown): ManifestValidationResult {
  return resultFromFindings(validateSchema(evidenceValidator, value, "release"));
}

function validatePhysicalDeviceSemantics(value: unknown): readonly ValidationFinding[] {
  const manifest = asRecord(value);
  const device = asRecord(manifest?.device);
  const webgl = asRecord(manifest?.webgl);
  const orientations = asRecord(manifest?.orientations);
  const portrait = asRecord(orientations?.portrait);
  const landscape = asRecord(orientations?.landscape);
  const findings: ValidationFinding[] = [];

  if (device?.physical !== true) {
    findings.push({
      code: "SFHS_DEVICE_NOT_PHYSICAL",
      severity: "error",
      path: "/device/physical",
      message: "Physical Samsung Galaxy S21 Ultra acceptance cannot be satisfied by emulation."
    });
  }
  if (typeof device?.modelIdentifier !== "string" || !/^SM-G998[A-Z0-9/-]*$/u.test(device.modelIdentifier)) {
    findings.push({
      code: "SFHS_DEVICE_MODEL_UNSUPPORTED",
      severity: "error",
      path: "/device/modelIdentifier",
      message: "Device model must be an exact Samsung Galaxy S21 Ultra SM-G998* identifier."
    });
  }
  if (webgl?.result === "unsupported") {
    findings.push({
      code: "SFHS_DEVICE_WEBGL_UNSUPPORTED",
      severity: "error",
      path: "/webgl/result",
      message: "The required WebGL capability did not pass on the physical device."
    });
  }
  if (portrait?.status !== "passed" || landscape?.status !== "passed" || manifest?.verdict !== "pass") {
    findings.push({
      code: "SFHS_DEVICE_ACCEPTANCE_FAILED",
      severity: "error",
      path: "/verdict",
      message: "Physical-device acceptance requires passing portrait and landscape results and a pass verdict."
    });
  }
  return sortFindings(findings);
}

export function validatePhysicalDeviceAcceptanceManifest(value: unknown): ManifestValidationResult {
  const schemaFindings = validateSchema(deviceAcceptanceValidator, value, "release");
  if (schemaFindings.some((finding) => finding.severity === "error")) {
    return resultFromFindings(schemaFindings);
  }
  return resultFromFindings([...schemaFindings, ...validatePhysicalDeviceSemantics(value)]);
}
