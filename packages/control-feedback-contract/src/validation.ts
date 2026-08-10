import { frozenPresetSourceKeys, validateFrozenProvenance } from "./provenance.ts";
import {
  controlPackSchema,
  controlPresetSchema,
  type ControlBorder,
  type ControlDonorProvenance,
  type ControlEffect,
  type ControlGradient,
  type ControlLayerStyle,
  type ControlLength,
  type ControlPack,
  type ControlSemantic,
  type ControlShadow,
  type ControlTransition,
  type ControlValidationFinding,
  type ControlValidationResult,
  type ControlVisualState,
  type ControlVisualStates,
  type ToggleVisual
} from "./types.ts";

const colorPattern = /^#[0-9A-Fa-f]{8}$/u;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const hex40Pattern = /^[0-9a-f]{40}$/u;
const rendererTokens = /(?:<\/?(?:button|input|span)\b|className\b|tailwind|motion\/react|framer-motion|pixi(?:js)?|css\s*[:{]|document\.|HTMLElement|React\.)/iu;
const knownLayerRoles = new Set(["depth", "edge", "surface", "content", "focus", "effect"]);
const knownShapes = new Set(["rect", "round-rect", "circle", "capsule"]);
const knownUnits = new Set(["px", "ratio"]);
const knownEasings = new Set(["linear", "ease-in", "ease-out", "ease-in-out"]);
const knownSlots = new Set(["label", "icon-leading", "icon-trailing", "status-icon"]);
const knownStatuses = new Set(["idle", "loading", "success", "error"]);
const knownEffectKinds = new Set(["field-ripple", "activation-ripple"]);
const knownSemanticKinds = new Set(["momentary", "toggle", "choice"]);
const knownDonors = new Set(["uiverse", "animata", "magicui"]);
const knownGradientKinds = new Set(["linear", "radial", "conic"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || Array.isArray(value) || typeof value !== "object") return undefined;
  return value as Record<string, unknown>;
}

function add(
  findings: ControlValidationFinding[],
  code: ControlValidationFinding["code"],
  path: string,
  message: string
): void {
  findings.push({ code, path, message });
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  findings: ControlValidationFinding[]
): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedSet.has(key)) {
      add(findings, "SFHS_CONTROL_UNKNOWN_FIELD", `${path}/${key}`, `Unknown field: ${key}.`);
    }
  }
}

function validateFinite(value: unknown, path: string, findings: ControlValidationFinding[]): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    add(findings, "SFHS_CONTROL_NUMBER_INVALID", path, "Value must be a finite number.");
    return false;
  }
  return true;
}

function validateLength(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlLength {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Length must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["value", "unit"], path, findings);
  const numberValid = validateFinite(record.value, `${path}/value`, findings);
  if (typeof record.unit !== "string" || !knownUnits.has(record.unit)) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/unit`, "Unsupported length unit.");
  } else if (record.unit === "ratio" && numberValid && (record.value as number) < 0) {
    add(findings, "SFHS_CONTROL_RATIO_INVALID", `${path}/value`, "Ratio lengths must be non-negative.");
  }
  return true;
}

function validateColor(value: unknown, path: string, findings: ControlValidationFinding[]): void {
  if (typeof value !== "string" || !colorPattern.test(value)) {
    add(findings, "SFHS_CONTROL_COLOR_INVALID", path, "Color must be sRGB #RRGGBBAA.");
  }
}

function validateGradient(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlGradient {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Gradient must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["kind", "angleDeg", "stops"], path, findings);
  if (typeof record.kind !== "string" || !knownGradientKinds.has(record.kind)) add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/kind`, "Unsupported gradient kind.");
  if (record.angleDeg !== undefined) validateFinite(record.angleDeg, `${path}/angleDeg`, findings);
  if (!Array.isArray(record.stops) || record.stops.length < 2) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/stops`, "Gradient requires at least two ordered stops.");
    return true;
  }
  let previous = -1;
  for (const [index, value] of record.stops.entries()) {
    const stop = asRecord(value);
    const stopPath = `${path}/stops/${index}`;
    if (stop === undefined) { add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", stopPath, "Gradient stop must be an object."); continue; }
    rejectUnknownFields(stop, ["offset", "color"], stopPath, findings);
    if (validateFinite(stop.offset, `${stopPath}/offset`, findings)) {
      const offset = stop.offset as number;
      if (offset < 0 || offset > 1 || offset < previous) add(findings, "SFHS_CONTROL_RATIO_INVALID", `${stopPath}/offset`, "Gradient offsets must be ordered within 0..1.");
      previous = offset;
    }
    validateColor(stop.color, `${stopPath}/color`, findings);
  }
  return true;
}

function validateTransition(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlTransition {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Transition must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["durationMs", "delayMs", "easing"], path, findings);
  if (validateFinite(record.durationMs, `${path}/durationMs`, findings) && (record.durationMs as number) < 0) {
    add(findings, "SFHS_CONTROL_DURATION_INVALID", `${path}/durationMs`, "Duration cannot be negative.");
  }
  if (record.delayMs !== undefined && validateFinite(record.delayMs, `${path}/delayMs`, findings) && (record.delayMs as number) < 0) {
    add(findings, "SFHS_CONTROL_DURATION_INVALID", `${path}/delayMs`, "Delay cannot be negative.");
  }
  if (typeof record.easing !== "string" || !knownEasings.has(record.easing)) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/easing`, "Unsupported easing.");
  }
  return true;
}

function validateBorder(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlBorder {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Border must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["width", "color", "radius"], path, findings);
  validateLength(record.width, `${path}/width`, findings);
  validateColor(record.color, `${path}/color`, findings);
  validateLength(record.radius, `${path}/radius`, findings);
  return true;
}

function validateShadow(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlShadow {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Shadow must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["x", "y", "blur", "spread", "color", "inset"], path, findings);
  validateLength(record.x, `${path}/x`, findings);
  validateLength(record.y, `${path}/y`, findings);
  validateLength(record.blur, `${path}/blur`, findings);
  validateLength(record.spread, `${path}/spread`, findings);
  validateColor(record.color, `${path}/color`, findings);
  if (typeof record.inset !== "boolean") {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/inset`, "Shadow inset must be boolean.");
  }
  return true;
}

function validateTransform(value: unknown, path: string, findings: ControlValidationFinding[]): void {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Transform must be an object.");
    return;
  }
  rejectUnknownFields(record, ["translateX", "translateY", "scaleX", "scaleY", "rotationDeg"], path, findings);
  if (record.translateX !== undefined) validateLength(record.translateX, `${path}/translateX`, findings);
  if (record.translateY !== undefined) validateLength(record.translateY, `${path}/translateY`, findings);
  for (const key of ["scaleX", "scaleY", "rotationDeg"] as const) {
    if (record[key] !== undefined) validateFinite(record[key], `${path}/${key}`, findings);
  }
}

function validateLayer(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlLayerStyle {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Layer must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["role", "shape", "fill", "gradient", "opacity", "border", "shadows", "transform", "transition", "contentSlot"], path, findings);
  if (typeof record.role !== "string" || !knownLayerRoles.has(record.role)) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/role`, "Unsupported layer role.");
  }
  if (typeof record.shape !== "string" || !knownShapes.has(record.shape)) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/shape`, "Unsupported shape.");
  }
  if (record.fill !== undefined) validateColor(record.fill, `${path}/fill`, findings);
  if (record.gradient !== undefined) validateGradient(record.gradient, `${path}/gradient`, findings);
  if (record.fill !== undefined && record.gradient !== undefined) add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Layer cannot declare both fill and gradient.");
  if (record.opacity !== undefined) {
    if (validateFinite(record.opacity, `${path}/opacity`, findings) && ((record.opacity as number) < 0 || (record.opacity as number) > 1)) {
      add(findings, "SFHS_CONTROL_RATIO_INVALID", `${path}/opacity`, "Opacity must be within 0..1.");
    }
  }
  if (record.border !== undefined) validateBorder(record.border, `${path}/border`, findings);
  if (record.shadows !== undefined) {
    if (!Array.isArray(record.shadows)) {
      add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/shadows`, "Shadows must be an array.");
    } else {
      record.shadows.forEach((shadow, index) => validateShadow(shadow, `${path}/shadows/${index}`, findings));
    }
  }
  if (record.transform !== undefined) validateTransform(record.transform, `${path}/transform`, findings);
  if (record.transition !== undefined) validateTransition(record.transition, `${path}/transition`, findings);
  if (record.contentSlot !== undefined && (typeof record.contentSlot !== "string" || !knownSlots.has(record.contentSlot))) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/contentSlot`, "Unsupported content slot.");
  }
  return true;
}

function validateEffect(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlEffect {
  const record = asRecord(value);
  if (record === undefined || typeof record.kind !== "string" || !knownEffectKinds.has(record.kind)) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Unsupported effect kind.");
    return false;
  }
  if (record.kind === "field-ripple") {
    rejectUnknownFields(record, ["kind", "diameterFactor", "enter", "leave", "keyboardOrigin"], path, findings);
    if (validateFinite(record.diameterFactor, `${path}/diameterFactor`, findings) && (record.diameterFactor as number) <= 0) {
      add(findings, "SFHS_CONTROL_RATIO_INVALID", `${path}/diameterFactor`, "Ripple diameter factor must be positive.");
    }
    validateTransition(record.enter, `${path}/enter`, findings);
    validateTransition(record.leave, `${path}/leave`, findings);
    if (record.keyboardOrigin !== "center") {
      add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/keyboardOrigin`, "Keyboard ripple origin must be center.");
    }
    return true;
  }
  rejectUnknownFields(record, ["kind", "concurrentCap", "durationMs", "keyboardOrigin", "idStrategy"], path, findings);
  if (typeof record.concurrentCap !== "number" || !Number.isInteger(record.concurrentCap) || record.concurrentCap < 1) {
    add(findings, "SFHS_CONTROL_RIPPLE_CAP_INVALID", `${path}/concurrentCap`, "Activation ripple cap must be an integer >= 1.");
  }
  if (validateFinite(record.durationMs, `${path}/durationMs`, findings) && (record.durationMs as number) < 0) {
    add(findings, "SFHS_CONTROL_DURATION_INVALID", `${path}/durationMs`, "Ripple duration cannot be negative.");
  }
  if (record.keyboardOrigin !== "center" || record.idStrategy !== "monotonic") {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Activation ripple requires center keyboard origin and monotonic IDs.");
  }
  return true;
}

function validateVisualState(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlVisualState {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Visual state must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["layers", "effects"], path, findings);
  if (record.layers !== undefined) {
    if (!Array.isArray(record.layers)) {
      add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/layers`, "Layers must be an array.");
    } else {
      record.layers.forEach((layer, index) => validateLayer(layer, `${path}/layers/${index}`, findings));
    }
  }
  if (record.effects !== undefined) {
    if (!Array.isArray(record.effects)) {
      add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/effects`, "Effects must be an array.");
    } else {
      record.effects.forEach((effect, index) => validateEffect(effect, `${path}/effects/${index}`, findings));
    }
  }
  return true;
}

function validateVisuals(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlVisualStates {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Visuals must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["base", "selected", "hover", "focus", "pressedInside", "pressedOutside", "disabled", "reducedMotion", "status"], path, findings);
  validateVisualState(record.base, `${path}/base`, findings);
  for (const key of ["selected", "hover", "focus", "pressedInside", "pressedOutside", "disabled", "reducedMotion"] as const) {
    if (record[key] !== undefined) validateVisualState(record[key], `${path}/${key}`, findings);
  }
  if (record.status !== undefined) {
    const statusRecord = asRecord(record.status);
    if (statusRecord === undefined) {
      add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", `${path}/status`, "Status overrides must be an object.");
    } else {
      for (const [status, state] of Object.entries(statusRecord)) {
        if (!knownStatuses.has(status)) {
          add(findings, "SFHS_CONTROL_UNKNOWN_FIELD", `${path}/status/${status}`, "Unsupported status override.");
        } else {
          validateVisualState(state, `${path}/status/${status}`, findings);
        }
      }
    }
  }
  return true;
}

function validateSemantic(value: unknown, path: string, findings: ControlValidationFinding[]): value is ControlSemantic {
  const record = asRecord(value);
  if (record === undefined || typeof record.kind !== "string" || !knownSemanticKinds.has(record.kind)) {
    add(findings, "SFHS_CONTROL_SEMANTIC_INVALID", path, "Semantic kind must be momentary, toggle, or choice.");
    return false;
  }
  if (record.kind === "choice") {
    rejectUnknownFields(record, ["kind", "groupId", "value"], path, findings);
    if (typeof record.groupId !== "string" || !idPattern.test(record.groupId) || typeof record.value !== "string" || record.value.length === 0) {
      add(findings, "SFHS_CONTROL_CHOICE_INVALID", path, "Choice requires a valid groupId and non-empty value.");
    }
  } else if (record.kind === "toggle") {
    rejectUnknownFields(record, ["kind", "variant"], path, findings);
    if (record.variant !== undefined && record.variant !== "switch" && record.variant !== "checkbox") add(findings, "SFHS_CONTROL_SEMANTIC_INVALID", `${path}/variant`, "Toggle variant must be switch or checkbox.");
  } else {
    rejectUnknownFields(record, ["kind"], path, findings);
  }
  return true;
}

function validateToggleVisual(value: unknown, path: string, findings: ControlValidationFinding[]): value is ToggleVisual {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", path, "Toggle visual must be an object.");
    return false;
  }
  rejectUnknownFields(record, ["track", "thumb", "selectedThumbTransform"], path, findings);
  validateLayer(record.track, `${path}/track`, findings);
  validateLayer(record.thumb, `${path}/thumb`, findings);
  validateTransform(record.selectedThumbTransform, `${path}/selectedThumbTransform`, findings);
  return true;
}

function validateProvenance(value: unknown, path: string, findings: ControlValidationFinding[], presetId?: string): void {
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_PROVENANCE_MISSING", path, "Provenance is required.");
    return;
  }
  if (record.origin !== undefined) {
    rejectUnknownFields(record, ["origin"], path, findings);
    if (record.origin !== "sfhs-original") add(findings, "SFHS_CONTROL_PROVENANCE_MISSING", `${path}/origin`, "Original provenance must be sfhs-original.");
    if (presetId !== undefined && frozenPresetSourceKeys[presetId] !== undefined) add(findings, "SFHS_CONTROL_PROVENANCE_MISMATCH", `${path}/origin`, `Reserved donor preset ${presetId} cannot use original provenance.`);
    return;
  }
  rejectUnknownFields(record, ["donor", "license", "modified", "sources"], path, findings);
  if (typeof record.donor !== "string" || !knownDonors.has(record.donor) || record.license !== "MIT" || record.modified !== true || !Array.isArray(record.sources)) {
    add(findings, "SFHS_CONTROL_PROVENANCE_MISSING", path, "Invalid donor provenance header.");
    return;
  }
  for (const [index, sourceValue] of record.sources.entries()) {
    const source = asRecord(sourceValue);
    const sourcePath = `${path}/sources/${index}`;
    if (source === undefined) {
      add(findings, "SFHS_CONTROL_PROVENANCE_MISSING", sourcePath, "Source must be an object.");
      continue;
    }
    rejectUnknownFields(source, ["repository", "commit", "path", "blobSha"], sourcePath, findings);
    if (typeof source.repository !== "string" || source.repository.length === 0 || typeof source.path !== "string" || source.path.length === 0 || typeof source.commit !== "string" || !hex40Pattern.test(source.commit) || typeof source.blobSha !== "string" || !hex40Pattern.test(source.blobSha)) {
      add(findings, "SFHS_CONTROL_PROVENANCE_MISSING", sourcePath, "Source requires repository, path, and 40-hex commit/blob SHA values.");
    }
  }
  if (findings.every((finding) => !finding.path.startsWith(path) || finding.code !== "SFHS_CONTROL_PROVENANCE_MISSING")) {
    findings.push(...validateFrozenProvenance(record as unknown as ControlDonorProvenance, path, presetId));
  }
}

function scanJsonDomain(value: unknown, path: string, findings: ControlValidationFinding[]): void {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) add(findings, "SFHS_CONTROL_NUMBER_INVALID", path, "JSON numbers must be finite.");
    return;
  }
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", path, "Preset data must stay inside the canonical JSON value domain.");
    return;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) {
        add(findings, "SFHS_CONTROL_SCHEMA_INVALID", `${path}/${index}`, "Sparse arrays are forbidden in canonical preset data.");
      } else {
        scanJsonDomain(value[index], `${path}/${index}`, findings);
      }
    }
    return;
  }
  const record = asRecord(value);
  if (record === undefined || (Object.getPrototypeOf(record) !== Object.prototype && Object.getPrototypeOf(record) !== null)) {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", path, "Preset objects must be plain canonical JSON objects.");
    return;
  }
  for (const [key, child] of Object.entries(record)) scanJsonDomain(child, `${path}/${key}`, findings);
}

function scanRendererStrings(value: unknown, path: string, findings: ControlValidationFinding[]): void {
  if (typeof value === "string") {
    if (rendererTokens.test(value)) {
      add(findings, "SFHS_CONTROL_RENDERER_STRING_FORBIDDEN", path, "Renderer/framework source strings are forbidden in shared preset data.");
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanRendererStrings(item, `${path}/${index}`, findings));
    return;
  }
  const record = asRecord(value);
  if (record === undefined) return;
  for (const [key, child] of Object.entries(record)) {
    scanRendererStrings(child, `${path}/${key}`, findings);
  }
}

function sortFindings(findings: readonly ControlValidationFinding[]): readonly ControlValidationFinding[] {
  return [...findings].sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    return pathOrder === 0 ? left.code.localeCompare(right.code) : pathOrder;
  });
}

export function validateControlPreset(value: unknown): ControlValidationResult {
  const findings: ControlValidationFinding[] = [];
  const record = asRecord(value);
  if (record === undefined) {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/", "Preset must be an object.");
    return { valid: false, findings };
  }
  scanJsonDomain(record, "", findings);
  rejectUnknownFields(record, ["schema", "id", "title", "semantic", "visuals", "toggleVisual", "cues", "provenance"], "", findings);
  if (record.schema !== controlPresetSchema) {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/schema", `Schema must be ${controlPresetSchema}.`);
  }
  if (typeof record.id !== "string" || !idPattern.test(record.id)) {
    add(findings, "SFHS_CONTROL_ID_INVALID", "/id", "Preset id must be lowercase kebab-case.");
  }
  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/title", "Preset title is required.");
  }
  const semanticValid = validateSemantic(record.semantic, "/semantic", findings);
  validateVisuals(record.visuals, "/visuals", findings);
  if (record.toggleVisual !== undefined) validateToggleVisual(record.toggleVisual, "/toggleVisual", findings);
  if (semanticValid && (record.semantic as ControlSemantic).kind === "toggle" && (record.semantic as ControlSemantic & { variant?: string }).variant !== "checkbox" && record.toggleVisual === undefined) {
    add(findings, "SFHS_CONTROL_PRIMITIVE_INVALID", "/toggleVisual", "Toggle presets require track/thumb visual data.");
  }
  if (record.cues !== undefined) {
    const cues = asRecord(record.cues);
    if (cues === undefined) {
      add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/cues", "Cue map must be an object.");
    } else {
      rejectUnknownFields(cues, ["press", "activate", "cancel", "selectOn", "selectOff", "success", "error"], "/cues", findings);
      for (const [key, cue] of Object.entries(cues)) {
        if (typeof cue !== "string" || !idPattern.test(cue)) {
          add(findings, "SFHS_CONTROL_SCHEMA_INVALID", `/cues/${key}`, "Cue id must be lowercase kebab-case.");
        }
      }
    }
  }
  validateProvenance(record.provenance, "/provenance", findings, typeof record.id === "string" ? record.id : undefined);
  scanRendererStrings(record.semantic, "/semantic", findings);
  scanRendererStrings(record.visuals, "/visuals", findings);
  scanRendererStrings(record.toggleVisual, "/toggleVisual", findings);
  scanRendererStrings(record.cues, "/cues", findings);
  const sorted = sortFindings(findings);
  return { valid: sorted.length === 0, findings: sorted };
}

export function validateControlPresets(values: readonly unknown[]): ControlValidationResult {
  const findings: ControlValidationFinding[] = [];
  const ids = new Map<string, number>();
  for (const [index, value] of values.entries()) {
    const result = validateControlPreset(value);
    findings.push(...result.findings.map((finding) => ({ ...finding, path: `/${index}${finding.path === "/" ? "" : finding.path}` })));
    const record = asRecord(value);
    if (typeof record?.id === "string") {
      const first = ids.get(record.id);
      if (first !== undefined) {
        add(findings, "SFHS_CONTROL_DUPLICATE_ID", `/${index}/id`, `Duplicate preset id first seen at /${first}/id.`);
      } else {
        ids.set(record.id, index);
      }
    }
  }
  const sorted = sortFindings(findings);
  return { valid: sorted.length === 0, findings: sorted };
}

export function validateControlPack(value: unknown): ControlValidationResult {
  const findings: ControlValidationFinding[] = [];
  const record = asRecord(value);
  if (record === undefined) return { valid: false, findings: [{ code: "SFHS_CONTROL_SCHEMA_INVALID", path: "/", message: "Pack must be an object." }] };
  scanJsonDomain(record, "", findings);
  rejectUnknownFields(record, ["schema", "id", "title", "presets"], "", findings);
  if (record.schema !== controlPackSchema) add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/schema", `Schema must be ${controlPackSchema}.`);
  if (typeof record.id !== "string" || !idPattern.test(record.id)) add(findings, "SFHS_CONTROL_ID_INVALID", "/id", "Pack id must be lowercase kebab-case.");
  if (typeof record.title !== "string" || record.title.trim().length === 0) add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/title", "Pack title is required.");
  if (!Array.isArray(record.presets) || record.presets.length === 0) {
    add(findings, "SFHS_CONTROL_SCHEMA_INVALID", "/presets", "Pack requires at least one preset.");
  } else {
    const presetResult = validateControlPresets(record.presets);
    findings.push(...presetResult.findings.map((finding) => ({ ...finding, path: `/presets${finding.path}` })));
  }
  const sorted = sortFindings(findings);
  return { valid: sorted.length === 0, findings: sorted };
}

export function isControlPack(value: unknown): value is ControlPack {
  return validateControlPack(value).valid;
}
