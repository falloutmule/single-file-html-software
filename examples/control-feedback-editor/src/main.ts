import { createWebAudioCueTransport, type WebAudioCueFamily } from "@sfhs/control-feedback-audio-web";
import {
  canonicalControlPackJson,
  controlPackSchema,
  controlPresetSchema,
  isControlPack,
  validateControlPreset,
  type ControlEasing,
  type ControlEffect,
  type ControlLayerStyle,
  type ControlPack,
  type ControlPreset,
  type ControlProvenance,
  type ControlSemanticKind,
  type ControlShape,
  type ControlStatus,
  type ControlVisualState,
  type ControlVisualStates
} from "@sfhs/control-feedback-contract";
import { mountDomControl, type DomControlController } from "@sfhs/control-feedback-dom";
import { createControlExportBundle } from "@sfhs/control-feedback-exporter";
import { createWebHapticTransport } from "@sfhs/control-feedback-haptics-web";
import { controlFeedbackPresetEntries, findControlFeedbackPreset } from "@sfhs/control-feedback-presets";

interface EditorDesign {
  id: string; label: string; semantic: ControlSemanticKind; width: number; height: number; shape: ControlShape; radius: number;
  fill: string; fillEnd: string; gradient: "none" | "linear" | "radial" | "conic"; angle: number; borderWidth: number; borderColor: string;
  depth: number; shadowBlur: number; textColor: string; font: "system-ui" | "serif" | "monospace"; fontSize: number; fontWeight: number;
  icon: string; iconSlot: "leading" | "trailing"; selectedFill: string; focusColor: string; loadingFill: string; successFill: string; errorFill: string;
  disabledOpacity: number; pressTravel: number; pressScale: number; squash: number; duration: number; easing: ControlEasing;
  overshoot: number;
  ripple: "none" | "activation-ripple" | "field-ripple"; rippleCap: number; effectDuration: number; shine: boolean; glow: boolean;
  provenance: ControlProvenance;
}

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing editor element ${id}.`);
  return element as T;
};
const input = (id: string): HTMLInputElement => byId<HTMLInputElement>(id);
const select = (id: string): HTMLSelectElement => byId<HTMLSelectElement>(id);
const number = (id: string): number => Number(input(id).value);
const opaque = (value: string): string => `${value.toUpperCase()}FF`;
const px = (value: number) => ({ value, unit: "px" as const });
const ratio = (value: number) => ({ value, unit: "ratio" as const });
const transition = (durationMs: number, easing: ControlEasing) => ({ durationMs, easing });

let design: EditorDesign = {
  id: "editor-tactile-control", label: "Launch", semantic: "momentary", width: 184, height: 60, shape: "round-rect", radius: 16,
  fill: "#5B5CF0", fillEnd: "#8B5CF6", gradient: "linear", angle: 135, borderWidth: 1, borderColor: "#A5B4FC",
  depth: 8, shadowBlur: 18, textColor: "#FFFFFF", font: "system-ui", fontSize: 16, fontWeight: 700, icon: "◆", iconSlot: "leading",
  selectedFill: "#14B8A6", focusColor: "#F8FAFC", loadingFill: "#F59E0B", successFill: "#22C55E", errorFill: "#EF4444",
  disabledOpacity: 0.45, pressTravel: 5, pressScale: 0.97, squash: 0.96, duration: 160, easing: "ease-out", overshoot: 0.12,
  ripple: "activation-ripple", rippleCap: 5, effectDuration: 420, shine: false, glow: true, provenance: { origin: "sfhs-original" }
};
let importedPack: ControlPack | undefined;
let importedPreset: ControlPreset | undefined;
let importedPresetId: string | undefined;
let designDirty = true;
const dirtyFields = new Set<string>();

const mount = byId<HTMLDivElement>("previewMount");
const runtimeState = byId<HTMLDivElement>("runtimeState");
const previewTitle = byId<HTMLHeadingElement>("previewTitle");
const activationLabel = byId<HTMLSpanElement>("activationCount");
const exportText = byId<HTMLTextAreaElement>("exportText");
const tortureLog = byId<HTMLOListElement>("tortureLog");
const audio = createWebAudioCueTransport({ window });
const haptics = createWebHapticTransport({ enabled: false });
let controller: DomControlController | undefined;
let activationCount = 0;
let logicalTime = 0;
let lastTorture: readonly TortureResult[] = [];

function surface(fill: string, transformValue?: { translateY: number; scaleX: number; scaleY: number }) {
  const base = {
    role: "surface" as const,
    shape: design.shape,
    ...(design.gradient === "none" || fill !== design.fill ? { fill: opaque(fill) } : { gradient: { kind: design.gradient, angleDeg: design.angle, stops: [{ offset: 0, color: opaque(design.fill) }, { offset: 1, color: opaque(design.fillEnd) }] } }),
    border: { width: px(design.borderWidth), color: opaque(design.borderColor), radius: px(design.shape === "capsule" ? design.height / 2 : design.radius) },
    shadows: [{ x: px(0), y: px(design.depth), blur: px(design.shadowBlur), spread: px(0), color: "#00000066", inset: false }],
    transition: { ...transition(design.duration, design.easing), overshoot: design.overshoot }
  };
  return transformValue === undefined ? base : { ...base, transform: { translateY: px(transformValue.translateY), scaleX: transformValue.scaleX, scaleY: transformValue.scaleY } };
}

const geometryFields = new Set(["width", "height"]);
const contentFields = new Set(["label", "textColor", "font", "fontSize", "fontWeight", "icon", "iconSlot"]);
const visualFields = new Set([
  "shape", "radius", "fill", "fillEnd", "gradient", "angle", "borderWidth", "borderColor", "depth", "shadowBlur",
  "selectedFill", "focusColor", "loadingFill", "successFill", "errorFill", "disabledOpacity", "pressTravel", "pressScale",
  "squash", "duration", "easing", "overshoot", "shine", "glow"
]);
const effectFields = new Set(["ripple", "rippleCap", "effectDuration"]);
const hasDirty = (fields: ReadonlySet<string>): boolean => [...dirtyFields].some((field) => fields.has(field));

function mergeLayers(original: readonly ControlLayerStyle[] | undefined, designed: readonly ControlLayerStyle[] | undefined): readonly ControlLayerStyle[] | undefined {
  if (designed === undefined) return original;
  if (original === undefined) return designed;
  const replacements = new Map<string, ControlLayerStyle>();
  const designedOccurrences = new Map<string, number>();
  for (const layer of designed) {
    const occurrence = designedOccurrences.get(layer.role) ?? 0;
    designedOccurrences.set(layer.role, occurrence + 1);
    replacements.set(`${layer.role}:${occurrence}`, layer);
  }
  const used = new Set<string>();
  const originalOccurrences = new Map<string, number>();
  const merged = original.map((layer) => {
    const occurrence = originalOccurrences.get(layer.role) ?? 0;
    originalOccurrences.set(layer.role, occurrence + 1);
    const key = `${layer.role}:${occurrence}`;
    const replacement = replacements.get(key);
    if (replacement === undefined) return layer;
    used.add(key);
    return replacement;
  });
  for (const [key, layer] of replacements) if (!used.has(key)) merged.push(layer);
  return merged;
}

function mergeVisualState(original: ControlVisualState | undefined, designed: ControlVisualState | undefined, replaceLayers: boolean, replaceEffects: boolean): ControlVisualState | undefined {
  if (original === undefined) return designed;
  if (designed === undefined) return original;
  const layers = replaceLayers ? mergeLayers(original.layers, designed.layers) : undefined;
  return {
    ...original,
    ...(layers === undefined ? {} : { layers }),
    ...(replaceEffects ? { effects: designed.effects ?? [] } : {})
  };
}

function mergeVisuals(original: ControlVisualStates, designed: ControlVisualStates, replaceLayers: boolean, replaceEffects: boolean): ControlVisualStates {
  const state = (key: Exclude<keyof ControlVisualStates, "status">) => mergeVisualState(original[key], designed[key], replaceLayers, key === "base" && replaceEffects);
  const status = Object.fromEntries(["idle", "loading", "success", "error"].map((key) => [
    key,
    mergeVisualState(original.status?.[key as ControlStatus], designed.status?.[key as ControlStatus], replaceLayers, false)
  ]).filter((entry) => entry[1] !== undefined));
  return {
    base: state("base") ?? designed.base,
    ...Object.fromEntries(["selected", "hover", "focus", "pressedInside", "pressedOutside", "disabled", "reducedMotion"].map((key) => [
      key,
      state(key as Exclude<keyof ControlVisualStates, "base" | "status">)
    ]).filter((entry) => entry[1] !== undefined)),
    ...((original.status !== undefined || designed.status !== undefined) ? { status } : {})
  };
}

function patchImportedPreset(original: ControlPreset, designed: ControlPreset): ControlPreset {
  const geometryDirty = hasDirty(geometryFields);
  const contentDirty = hasDirty(contentFields);
  const layersDirty = hasDirty(visualFields);
  const effectsDirty = hasDirty(effectFields);
  const semanticDirty = dirtyFields.has("semantic");
  const semantic = semanticDirty ? designed.semantic : original.semantic;
  const { toggleVisual: originalToggle, ...originalWithoutToggle } = original;
  void originalToggle;
  const toggleVisual = semantic.kind === "toggle"
    ? (semanticDirty || layersDirty ? designed.toggleVisual : original.toggleVisual)
    : undefined;
  return {
    ...originalWithoutToggle,
    id: dirtyFields.has("id") ? designed.id : original.id,
    title: dirtyFields.has("label") ? designed.title : original.title,
    semantic,
    ...(geometryDirty ? { geometry: { ...original.geometry, ...designed.geometry! } } : original.geometry === undefined ? {} : { geometry: original.geometry }),
    ...(contentDirty ? { content: { ...original.content, ...designed.content! } } : original.content === undefined ? {} : { content: original.content }),
    visuals: layersDirty || effectsDirty ? mergeVisuals(original.visuals, designed.visuals, layersDirty, effectsDirty) : original.visuals,
    ...(toggleVisual === undefined ? {} : { toggleVisual }),
    ...(dirtyFields.has("cueFamily") ? { cues: { ...original.cues, ...designed.cues } } : original.cues === undefined ? {} : { cues: original.cues }),
    provenance: original.provenance
  };
}

function buildPreset(): ControlPreset {
  if (!designDirty && importedPreset !== undefined) return importedPreset;
  const effects: ControlEffect[] = design.ripple === "activation-ripple"
    ? [{ kind: "activation-ripple", concurrentCap: design.rippleCap, durationMs: design.effectDuration, keyboardOrigin: "center", idStrategy: "monotonic" }]
    : design.ripple === "field-ripple"
      ? [{ kind: "field-ripple", diameterFactor: 2.4, enter: transition(design.effectDuration, design.easing), leave: transition(design.effectDuration, design.easing), keyboardOrigin: "center" }]
      : [];
  const baseLayers = [
    { role: "depth" as const, shape: design.shape, fill: "#05081588", transform: { translateY: px(design.depth) }, border: { width: px(0), color: "#00000000", radius: px(design.radius) } },
    surface(design.fill),
    ...(design.shine ? [{ role: "effect" as const, shape: "rect" as const, gradient: { kind: "linear" as const, angleDeg: 110, stops: [{ offset: 0, color: "#FFFFFF00" }, { offset: 0.5, color: "#FFFFFF88" }, { offset: 1, color: "#FFFFFF00" }] }, opacity: 0.42, transform: { translateX: ratio(0), rotationDeg: 12 }, transition: transition(design.effectDuration, design.easing) }] : [])
  ];
  const hoverLayers = [surface(design.fill), ...(design.shine ? [{ role: "effect" as const, shape: "rect" as const, gradient: { kind: "linear" as const, angleDeg: 110, stops: [{ offset: 0, color: "#FFFFFF00" }, { offset: 0.5, color: "#FFFFFFFF" }, { offset: 1, color: "#FFFFFF00" }] }, opacity: 0.62, transform: { translateX: ratio(1), rotationDeg: 12 }, transition: transition(design.effectDuration, design.easing) }] : []), ...(design.glow ? [{ role: "focus" as const, shape: design.shape, fill: `${design.fillEnd}33`, transform: { scaleX: 1.08, scaleY: 1.18 }, transition: transition(design.duration, design.easing) }] : [])];
  const semantic = design.semantic === "toggle" ? { kind: "toggle" as const, variant: "switch" as const } : design.semantic === "choice" ? { kind: "choice" as const, groupId: "editor-choice", value: design.id } : { kind: "momentary" as const };
  const designed: ControlPreset = {
    schema: controlPresetSchema, id: design.id, title: design.label, semantic,
    geometry: { widthPx: design.width, heightPx: design.height, minimumHitTargetPx: 44 },
    content: { label: design.label, ...(design.icon === "" ? {} : { icon: design.icon, iconSlot: design.iconSlot }), fontFamily: design.font, fontSizePx: design.fontSize, fontWeight: design.fontWeight, letterSpacingPx: 0, textColor: opaque(design.textColor) },
    visuals: {
      base: { layers: baseLayers, effects }, hover: { layers: hoverLayers },
      focus: { layers: [{ role: "focus", shape: design.shape, border: { width: px(3), color: opaque(design.focusColor), radius: px(design.radius + 4) }, fill: "#00000000" }] },
      pressedInside: { layers: [{ role: "depth", shape: design.shape, fill: "#05081544", transform: { translateY: px(1) } }, surface(design.fill, { translateY: design.pressTravel, scaleX: design.pressScale, scaleY: design.squash })] },
      pressedOutside: { layers: [{ ...surface(design.fill), opacity: 0.72 }] },
      selected: { layers: [surface(design.selectedFill)] },
      disabled: { layers: [{ ...surface(design.fill), opacity: design.disabledOpacity }], effects: [] },
      reducedMotion: { layers: [surface(design.fill)], effects: [] },
      status: { idle: { layers: [surface(design.fill)] }, loading: { layers: [surface(design.loadingFill)] }, success: { layers: [surface(design.successFill)] }, error: { layers: [surface(design.errorFill)] } }
    },
    ...(design.semantic === "toggle" ? { toggleVisual: { track: { role: "surface", shape: "capsule", fill: opaque(design.fill) }, thumb: { role: "content", shape: "circle", fill: "#FFFFFFFF", transform: { translateX: ratio(0) } }, selectedThumbTransform: { translateX: ratio(1) } } } : {}),
    cues: { press: "soft-click", activate: select("cueFamily").value, selectOn: "toggle-on", selectOff: "toggle-off", success: "success", error: "error", cancel: "soft-click" },
    provenance: design.provenance
  };
  return importedPreset === undefined ? designed : patchImportedPreset(importedPreset, designed);
}

function updateAudioConfig(): void {
  const family = select("cueFamily").value as WebAudioCueFamily;
  audio.updateConfig({ masterVolume: number("volume") / 100, muted: input("mute").checked, pitchVarianceCents: number("pitch"), voiceLimit: number("voices"), cueFamilies: { press: family, activate: family, "select-on": "toggle-on", "select-off": "toggle-off", success: "success", error: "error" } });
  haptics.setEnabled(input("haptics").checked);
  byId("cueSupport").textContent = `Audio ${audio.supported ? "available" : "unavailable"}; haptics ${haptics.supported ? "available" : "unsupported (graceful no-op)"}.`;
}

function remount(): void {
  controller?.destroy();
  mount.replaceChildren();
  const preset = buildPreset();
  const validation = validateControlPreset(preset);
  if (!validation.valid) {
    runtimeState.textContent = `invalid: ${validation.findings[0]?.path ?? "preset"}`;
    runtimeState.dataset.valid = "false";
    return;
  }
  controller = mountDomControl({
    container: mount, controlId: "editor-preview", preset, reducedMotion: input("reducedMotion").checked,
    onActivate(proposal) {
      activationCount += 1;
      if (proposal.kind === "toggle") controller?.setModel({ selected: proposal.proposedSelected });
      if (proposal.kind === "choice") controller?.setModel({ selected: true });
      activationLabel.textContent = `${activationCount} activation${activationCount === 1 ? "" : "s"}`;
    },
    onCue(cue) { audio.playCue(cue); haptics.playCue(cue); },
    onDispatch(result) { runtimeState.textContent = `${result.snapshot.interaction} · ${result.snapshot.model.status}`; runtimeState.dataset.valid = "true"; }
  });
  previewTitle.textContent = design.label;
  runtimeState.textContent = "rest · idle";
  runtimeState.dataset.valid = "true";
}

function readDesign(changedField?: string): void {
  const currentId = input("presetId").value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "editor-control";
  design = {
    ...design, id: currentId, label: input("label").value.trim() || "Control", semantic: select("semantic").value as ControlSemanticKind,
    width: number("width"), height: number("height"), shape: select("shape").value as ControlShape, radius: number("radius"),
    fill: input("fill").value.toUpperCase(), fillEnd: input("fillEnd").value.toUpperCase(), gradient: select("gradient").value as EditorDesign["gradient"], angle: number("angle"),
    borderWidth: number("borderWidth"), borderColor: input("borderColor").value.toUpperCase(), depth: number("depth"), shadowBlur: number("shadowBlur"), textColor: input("textColor").value.toUpperCase(),
    font: select("font").value as EditorDesign["font"], fontSize: number("fontSize"), fontWeight: number("fontWeight"), icon: input("icon").value, iconSlot: select("iconSlot").value as EditorDesign["iconSlot"],
    selectedFill: input("selectedFill").value.toUpperCase(), focusColor: input("focusColor").value.toUpperCase(), loadingFill: input("loadingFill").value.toUpperCase(), successFill: input("successFill").value.toUpperCase(), errorFill: input("errorFill").value.toUpperCase(),
    disabledOpacity: number("disabledOpacity") / 100, pressTravel: number("pressTravel"), pressScale: number("pressScale") / 100, squash: number("squash") / 100,
    duration: number("duration"), easing: select("easing").value as ControlEasing, overshoot: number("overshoot") / 100, ripple: select("ripple").value as EditorDesign["ripple"], rippleCap: number("rippleCap"), effectDuration: number("effectDuration"), shine: input("shine").checked, glow: input("glow").checked,
    provenance: design.provenance
  };
  designDirty = true;
  if (changedField !== undefined) dirtyFields.add(changedField === "presetId" ? "id" : changedField);
  updateOutputs(); updateAudioConfig(); remount();
}

function updateOutputs(): void {
  const suffixes: Record<string, string> = { width: "px", height: "px", radius: "px", angle: "°", borderWidth: "px", depth: "px", shadowBlur: "px", fontSize: "px", fontWeight: "", disabledOpacity: "%", pressTravel: "px", pressScale: "%", squash: "%", duration: "ms", overshoot: "%", rippleCap: "", effectDuration: "ms", volume: "%", pitch: " cents", voices: "" };
  for (const output of document.querySelectorAll<HTMLOutputElement>("output[data-for]")) {
    const id = output.dataset.for;
    if (id !== undefined) output.value = `${input(id).value}${suffixes[id] ?? ""}`;
  }
}

function populateFromPreset(preset: ControlPreset, pack?: ControlPack): void {
  const baseSurface = preset.visuals.base.layers?.find((layer) => layer.role === "surface");
  const pressedSurface = preset.visuals.pressedInside?.layers?.find((layer) => layer.role === "surface");
  const set = (id: string, value: string | number | boolean | undefined) => { if (value === undefined) return; const element = input(id); if (typeof value === "boolean") element.checked = value; else element.value = String(value); };
  set("presetId", preset.id); set("label", preset.content?.label ?? preset.title); select("semantic").value = preset.semantic.kind;
  set("width", preset.geometry?.widthPx ?? 184); set("height", preset.geometry?.heightPx ?? 60); if (baseSurface?.shape !== undefined) select("shape").value = baseSurface.shape;
  set("radius", baseSurface?.border?.radius.value ?? 16); set("fill", (baseSurface?.fill ?? baseSurface?.gradient?.stops[0]?.color ?? "#5B5CF0FF").slice(0, 7));
  set("fillEnd", (baseSurface?.gradient?.stops.at(-1)?.color ?? "#8B5CF6FF").slice(0, 7)); select("gradient").value = baseSurface?.gradient?.kind ?? "none"; set("angle", baseSurface?.gradient?.angleDeg ?? 135);
  set("borderWidth", baseSurface?.border?.width.value ?? 0); set("borderColor", (baseSurface?.border?.color ?? "#A5B4FCFF").slice(0, 7));
  set("depth", baseSurface?.shadows?.[0]?.y.value ?? 6); set("shadowBlur", baseSurface?.shadows?.[0]?.blur.value ?? 14); set("textColor", (preset.content?.textColor ?? "#FFFFFFFF").slice(0, 7));
  if (preset.content !== undefined) { select("font").value = preset.content.fontFamily; set("fontSize", preset.content.fontSizePx); set("fontWeight", preset.content.fontWeight); set("icon", preset.content.icon ?? ""); if (preset.content.iconSlot !== undefined) select("iconSlot").value = preset.content.iconSlot; }
  set("pressTravel", pressedSurface?.transform?.translateY?.value ?? 4); set("pressScale", Math.round((pressedSurface?.transform?.scaleX ?? 0.97) * 100)); set("squash", Math.round((pressedSurface?.transform?.scaleY ?? 0.96) * 100)); set("duration", baseSurface?.transition?.durationMs ?? 160);
  if (baseSurface?.transition?.easing !== undefined) select("easing").value = baseSurface.transition.easing;
  set("overshoot", Math.round((baseSurface?.transition?.overshoot ?? 0) * 100));
  const effect = preset.visuals.base.effects?.[0]; select("ripple").value = effect?.kind ?? "none"; if (effect?.kind === "activation-ripple") { set("rippleCap", effect.concurrentCap); set("effectDuration", effect.durationMs); }
  design.provenance = preset.provenance;
  importedPack = undefined; importedPreset = undefined; importedPresetId = undefined; designDirty = true;
  readDesign();
  importedPack = pack ?? { schema: controlPackSchema, id: `${preset.id}-pack`, title: `${preset.title} Pack`, presets: [preset] };
  importedPreset = preset; importedPresetId = preset.id; designDirty = false; remount();
  dirtyFields.clear();
  syncPackPresetSelector(importedPack, preset.id);
}

function syncPackPresetSelector(pack?: ControlPack, selectedId?: string): void {
  const member = select("packPreset");
  member.replaceChildren(...(pack?.presets ?? []).map((preset) => new Option(preset.title, preset.id)));
  member.disabled = (pack?.presets.length ?? 0) <= 1;
  if (selectedId !== undefined) member.value = selectedId;
}

function nextTime(): number { logicalTime = Math.max(logicalTime, performance.now()); return logicalTime; }
function resetPreview(): void {
  if (controller === undefined) return;
  if (controller.read().owner !== undefined) controller.dispatchNormalized({ kind: "contact-cancel", reason: "adapter-reset", atMs: nextTime() });
  controller.dispatchNormalized({ kind: "hover-set", hovered: false, atMs: nextTime() });
  controller.dispatchNormalized({ kind: "focus-set", focused: false, focusVisible: false, atMs: nextTime() });
  controller.setModel({ enabled: true, selected: false, status: "idle" });
}

function setPreviewState(state: string): void {
  resetPreview(); if (controller === undefined || state === "idle") return;
  if (state === "hover") controller.dispatchNormalized({ kind: "hover-set", hovered: true, atMs: nextTime() });
  else if (state === "pressed") controller.dispatchNormalized({ kind: "contact-begin", source: "keyboard", sourceId: "preview:pressed", atMs: nextTime() });
  else if (state === "focused") controller.dispatchNormalized({ kind: "focus-set", focused: true, focusVisible: true, atMs: nextTime() });
  else if (state === "selected") controller.setModel({ selected: true });
  else if (state === "disabled") controller.setModel({ enabled: false });
  else controller.setModel({ status: state as ControlStatus });
}

interface TortureResult { readonly name: string; readonly pass: boolean; readonly detail: string; }
function traceTap(sourceId: string, inside = true): void {
  controller?.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId, origin: { x: 0.5, y: 0.5 }, atMs: nextTime() });
  controller?.dispatchNormalized({ kind: "contact-end", sourceId, inside, origin: { x: 0.5, y: 0.5 }, atMs: nextTime() });
}

async function runTorture(name: string): Promise<TortureResult> {
  resetPreview(); if (controller === undefined) return { name, pass: false, detail: "preview unavailable" };
  const before = activationCount;
  if (input("slowFrame").checked) { const until = performance.now() + 90; while (performance.now() < until) { /* deliberate editor-only frame stall */ } }
  if (name === "rapid") for (let index = 0; index < 12; index += 1) traceTap(`rapid:${index}`);
  else if (name === "outside") { controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "outside:1", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-update", sourceId: "outside:1", inside: false, atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-end", sourceId: "outside:1", inside: false, atMs: nextTime() }); }
  else if (name === "drag") { controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "drag:1", origin: { x: 0.2, y: 0.5 }, atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-update", sourceId: "drag:1", inside: false, atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-update", sourceId: "drag:1", inside: true, atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-end", sourceId: "drag:1", inside: true, atMs: nextTime() }); }
  else if (name === "cancel") { controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "cancel:1", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-cancel", sourceId: "cancel:1", reason: "pointer-cancel", atMs: nextTime() }); }
  else if (name === "concurrent") { controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "finger:1", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "finger:2", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-end", sourceId: "finger:2", inside: true, atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-end", sourceId: "finger:1", inside: true, atMs: nextTime() }); }
  else if (name === "keyboard") { controller.dispatchNormalized({ kind: "contact-begin", source: "keyboard", sourceId: "key:Space", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-end", sourceId: "key:Space", inside: true, atMs: nextTime() }); }
  else if (name === "toggle") { const original = design.semantic; design.semantic = "toggle"; remount(); for (let index = 0; index < 6; index += 1) traceTap(`toggle:${index}`); const externallyApplied = controller?.read().model.selected === false; design.semantic = original; remount(); return { name, pass: activationCount - before === 6 && externallyApplied, detail: "6 proposals; application applied external selected state" }; }
  else if (name === "disable") { controller.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: "disable:1", atMs: nextTime() }); controller.setModel({ enabled: false }); }
  else if (name === "focus") { controller.dispatchNormalized({ kind: "contact-begin", source: "keyboard", sourceId: "focus:1", atMs: nextTime() }); controller.dispatchNormalized({ kind: "contact-cancel", sourceId: "focus:1", reason: "focus-lost", atMs: nextTime() }); }
  else if (name === "mute") { const previous = audio.getConfig().muted; audio.updateConfig({ muted: true }); const configured = audio.getConfig().muted; traceTap("mute:1"); audio.updateConfig({ muted: previous }); return { name, pass: configured && activationCount - before === 1, detail: "mute configured; control activation remained authoritative" }; }
  else if (name === "reduced") { const snapshot = controller.setReducedMotion(true); const pass = snapshot.reducedMotion && snapshot.presentation.effects.length === 0; controller.setReducedMotion(input("reducedMotion").checked); return { name, pass, detail: "deterministic no-effect presentation" }; }
  else if (name === "slow") { const until = performance.now() + 90; while (performance.now() < until) { /* deliberate editor-only frame stall */ } traceTap("slow:1"); return { name, pass: activationCount - before === 1 && controller.read().owner === undefined, detail: "90ms frame stall followed by responsive activation" }; }
  const expected = name === "rapid" ? 12 : name === "drag" || name === "concurrent" || name === "keyboard" ? 1 : 0;
  const pass = activationCount - before === expected && controller.read().owner === undefined && controller.read().interaction === "rest";
  return { name, pass, detail: `${activationCount - before}/${expected} activations; owner released` };
}

async function runAllTorture(): Promise<readonly TortureResult[]> {
  const names = ["rapid", "outside", "drag", "cancel", "concurrent", "keyboard", "toggle", "disable", "focus", "mute", "reduced", "slow"];
  const results: TortureResult[] = [];
  for (const name of names) results.push(await runTorture(name));
  lastTorture = Object.freeze(results);
  renderTorture(results); return lastTorture;
}

function renderTorture(results: readonly TortureResult[]): void {
  tortureLog.replaceChildren(...results.map((result) => { const item = document.createElement("li"); item.className = result.pass ? "pass" : "fail"; item.textContent = `${result.pass ? "PASS" : "FAIL"} ${result.name}: ${result.detail}`; return item; }));
}

function currentPack(): ControlPack {
  const preset = buildPreset();
  if (importedPack === undefined || importedPresetId === undefined) return { schema: controlPackSchema, id: `${preset.id}-pack`, title: `${preset.title} Pack`, presets: [preset] };
  return { ...importedPack, presets: importedPack.presets.map((item) => item.id === importedPresetId ? preset : item) };
}
function bundle() { return createControlExportBundle(buildPreset(), currentPack()); }
function download(name: string, contents: string, type: string): void { const url = URL.createObjectURL(new Blob([contents], { type })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0); }
function showExport(kind: string): void { const value = bundle(); exportText.value = kind === "preset" ? value.presetJson : kind === "pack" ? value.packJson : kind === "dom" ? value.domConfigJson : kind === "pixi" ? value.pixiV8ConfigJson : value.noticesText; }

for (const tab of document.querySelectorAll<HTMLButtonElement>(".tab")) tab.addEventListener("click", () => { document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab)); document.querySelectorAll<HTMLElement>(".panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab)); });
for (const element of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(".inspector input:not([type=file]),.inspector select:not(#packPreset)")) element.addEventListener("input", () => readDesign(element.id));
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-state]")) button.addEventListener("click", () => setPreviewState(button.dataset.state ?? "idle"));
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-torture]")) button.addEventListener("click", async () => { const result = await runTorture(button.dataset.torture ?? ""); lastTorture = [result]; renderTorture(lastTorture); });
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-export]")) button.addEventListener("click", () => showExport(button.dataset.export ?? "preset"));
byId("runAll").addEventListener("click", () => void runAllTorture());
byId("savePack").addEventListener("click", () => download(`${design.id}.control-pack.json`, canonicalControlPackJson(currentPack()), "application/json"));
byId("exportDemo").addEventListener("click", () => download(`${design.id}.demo.html`, bundle().demoHtml, "text/html"));
byId("previewSound").addEventListener("click", async (event) => { await audio.unlockFromGesture(event); audio.playCue({ role: "activate", cueId: select("cueFamily").value }); });
document.addEventListener("pointerdown", (event) => { void audio.unlockFromGesture(event); }, { once: true, capture: true });
byId("copyExport").addEventListener("click", async () => { if (exportText.value === "") showExport("preset"); try { await navigator.clipboard.writeText(exportText.value); byId("copyState").textContent = "Copied"; } catch { exportText.focus(); exportText.select(); byId("copyState").textContent = "Selected for copy"; } });
input("importFile").addEventListener("change", async () => { const file = input("importFile").files?.[0]; if (file !== undefined) loadJson(await file.text()); });
select("packPreset").addEventListener("change", () => {
  const pack = currentPack();
  const preset = pack.presets.find((item) => item.id === select("packPreset").value);
  if (preset !== undefined) populateFromPreset(preset, pack);
});

function loadJson(json: string): ControlPreset {
  const value: unknown = JSON.parse(json);
  const pack = isControlPack(value) ? value : undefined;
  const preset = pack?.presets[0] ?? value as ControlPreset;
  const validation = validateControlPreset(preset);
  if (!validation.valid) throw new TypeError(validation.findings.map((item) => `${item.path} ${item.code}`).join(", "));
  populateFromPreset(preset, pack); return preset;
}

const template = select("template");
template.append(new Option("Original editor control", "editor-tactile-control"));
for (const entry of controlFeedbackPresetEntries) template.append(new Option(`${entry.priority} · ${entry.preset.title}`, entry.preset.id));
template.addEventListener("change", () => {
  const preset = findControlFeedbackPreset(template.value);
  if (preset !== undefined) { populateFromPreset(preset); return; }
  importedPack = undefined; importedPreset = undefined; importedPresetId = undefined; designDirty = true;
  dirtyFields.clear(); syncPackPresetSelector();
  design = { ...design, id: "editor-tactile-control", label: "Launch", provenance: { origin: "sfhs-original" } };
  input("presetId").value = design.id; input("label").value = design.label; readDesign();
});

const api = Object.freeze({
  getPreset: buildPreset, getPack: currentPack, getBundle: bundle, loadJson,
  getValidation() { return validateControlPreset(buildPreset()); },
  update(values: Partial<EditorDesign>) {
    design = { ...design, ...values };
    designDirty = true;
    for (const key of Object.keys(values)) dirtyFields.add(key);
    for (const [key, rawValue] of Object.entries(values)) {
      const elementId = key === "id" ? "presetId" : key;
      const element = document.getElementById(elementId);
      if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) continue;
      if (element instanceof HTMLInputElement && element.type === "checkbox") element.checked = Boolean(rawValue);
      else {
        const value = key === "disabledOpacity" || key === "pressScale" || key === "squash" || key === "overshoot" ? Number(rawValue) * 100 : rawValue;
        element.value = String(value);
      }
    }
    updateOutputs(); updateAudioConfig(); remount(); return buildPreset();
  },
  setState: setPreviewState, torture: runTorture, tortureAll: runAllTorture,
  get activationCount() { return activationCount; }, get lastTorture() { return lastTorture; },
  selfCheck() {
    const preset = buildPreset(); const validation = validateControlPreset(preset); const exported = bundle();
    return Object.freeze({ pass: validation.valid && controller !== undefined && controller.interactive.matches("button,input") && !/(?:src|href)=["']https?:/u.test(exported.demoHtml), schema: preset.schema, semantic: preset.semantic.kind, offlineDemo: true, audioSupported: audio.supported, hapticsSupported: haptics.supported });
  }
});

Object.assign(window, { CFEDITOR: api });
updateOutputs(); updateAudioConfig(); remount();
showExport("preset");
document.body.dataset.phase = "ready";

declare global { interface Window { CFEDITOR: typeof api; } }
