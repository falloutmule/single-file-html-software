import {
  controlPackSchema,
  controlPresetSchema,
  frozenDonorSources,
  frozenPresetSourceKeys,
  p0ControlPresets,
  type ControlDonorProvenance,
  type ControlGradient,
  type ControlPack,
  type ControlPreset,
  type ControlProvenance,
  type ControlVisualState,
  type ControlVisualStates
} from "@sfhs/control-feedback-contract";

export type ControlPresetPriority = "P0" | "P1" | "P2";
export type ControlPresetCategory =
  | "choice-radio"
  | "directional-icon"
  | "drop-shadow-press"
  | "glow-gradient"
  | "minimal-tool"
  | "physical-plastic"
  | "recessed"
  | "ripple"
  | "shine-shimmer"
  | "status-state"
  | "toggle";

export interface ControlPresetLibraryEntry {
  readonly preset: ControlPreset;
  readonly category: ControlPresetCategory;
  readonly priority: ControlPresetPriority;
  readonly normalizedPrimitive: string;
}

const px = (value: number) => Object.freeze({ value, unit: "px" as const });
const ratio = (value: number) => Object.freeze({ value, unit: "ratio" as const });
const snap = Object.freeze({ durationMs: 90, easing: "ease-out" as const });
const glide = Object.freeze({ durationMs: 240, easing: "ease-in-out" as const });
const focusLayer = Object.freeze({ role: "focus" as const, shape: "round-rect" as const, border: { width: px(2), color: "#FFFFFFFF", radius: px(10) } });

function gradient(kind: ControlGradient["kind"], angleDeg: number, colors: readonly string[]): ControlGradient {
  return Object.freeze({ kind, angleDeg, stops: Object.freeze(colors.map((color, index) => Object.freeze({ offset: index / (colors.length - 1), color }))) });
}

function donorProvenance(id: string): ControlDonorProvenance {
  const keys = frozenPresetSourceKeys[id];
  if (keys === undefined || keys.length === 0) throw new Error(`Missing frozen provenance for ${id}.`);
  const sources = keys.map((sourceKey) => {
    const source = frozenDonorSources.find((candidate) => `${candidate.repository}:${candidate.path}` === sourceKey);
    if (source === undefined) throw new Error(`Missing frozen donor source ${sourceKey}.`);
    return Object.freeze({ repository: source.repository, commit: source.commit, path: source.path, blobSha: source.blobSha });
  });
  const donor = frozenDonorSources.find((candidate) => `${candidate.repository}:${candidate.path}` === keys[0])?.donor;
  if (donor === undefined) throw new Error(`Missing donor identity for ${id}.`);
  return Object.freeze({ donor, license: "MIT", modified: true, sources: Object.freeze(sources) });
}

function momentary(id: string, title: string, visuals: ControlVisualStates, cues?: ControlPreset["cues"]): ControlPreset {
  return Object.freeze({ schema: controlPresetSchema, id, title, semantic: { kind: "momentary" as const }, visuals, ...(cues === undefined ? {} : { cues }), provenance: donorProvenance(id) });
}

const darkSurface = Object.freeze({ role: "surface" as const, shape: "capsule" as const, fill: "#202735FF", transition: snap });
const purpleSurface = Object.freeze({ role: "surface" as const, shape: "round-rect" as const, fill: "#6750A4FF", transition: snap });
const labelLayer = Object.freeze({ role: "content" as const, shape: "rect" as const, contentSlot: "label" as const, transition: glide });

const addedPresets: readonly ControlPreset[] = Object.freeze([
  momentary("uv-tilt-level-press", "Tilt-to-Level Press", {
    base: { layers: [{ role: "surface", shape: "round-rect", fill: "#F4B942FF", shadows: [{ x: px(3), y: px(6), blur: px(0), spread: px(0), color: "#5C3D13FF", inset: false }], transform: { rotationDeg: -3 }, transition: glide }] },
    hover: { layers: [{ role: "surface", shape: "round-rect", fill: "#F4B942FF", shadows: [{ x: px(2), y: px(7), blur: px(0), spread: px(0), color: "#5C3D13FF", inset: false }], transform: { translateY: px(-2), rotationDeg: 0 }, transition: glide }] },
    pressedInside: { layers: [{ role: "surface", shape: "round-rect", fill: "#F4B942FF", transform: { translateY: px(4), rotationDeg: 0 }, transition: snap }] },
    reducedMotion: { layers: [{ role: "surface", shape: "round-rect", fill: "#F4B942FF", shadows: [{ x: px(0), y: px(4), blur: px(0), spread: px(0), color: "#5C3D13FF", inset: false }] }] }
  }),
  momentary("uv-hover-lift-pill", "Hover-Lift Pill", {
    base: { layers: [{ role: "surface", shape: "capsule", fill: "#EA4C89FF", shadows: [{ x: px(0), y: px(4), blur: px(0), spread: px(0), color: "#7A2148FF", inset: false }], transition: snap }] },
    hover: { layers: [{ role: "surface", shape: "capsule", fill: "#F15D9AFF", shadows: [{ x: px(0), y: px(8), blur: px(0), spread: px(0), color: "#7A2148FF", inset: false }], transform: { translateY: px(-3) }, transition: snap }] },
    pressedInside: { layers: [{ role: "surface", shape: "capsule", fill: "#EA4C89FF", transform: { translateY: px(4) }, transition: snap }] }
  }),
  momentary("uv-halo-lift", "Halo Lift", {
    base: { layers: [{ role: "effect", shape: "capsule", fill: "#8B5CF633", transform: { scaleX: 1, scaleY: 1 }, transition: glide }, darkSurface] },
    hover: { layers: [{ role: "effect", shape: "capsule", fill: "#8B5CF633", opacity: 0, transform: { scaleX: 1.18, scaleY: 1.35 }, transition: glide }, { ...darkSurface, transform: { translateY: px(-2) } }] },
    pressedInside: { layers: [{ role: "effect", shape: "capsule", fill: "#8B5CF633", opacity: 0.18 }, { ...darkSurface, transform: { translateY: px(2) } }] }
  }),
  momentary("uv-dark-capsule-icon", "Dark Capsule with Icon Well", {
    base: { layers: [{ role: "surface", shape: "capsule", gradient: gradient("linear", 135, ["#111827FF", "#374151FF"]), shadows: [{ x: px(0), y: px(5), blur: px(10), spread: px(0), color: "#00000066", inset: false }], transition: snap }, { role: "content", shape: "circle", fill: "#FFFFFF18", contentSlot: "icon-leading", transition: snap }] },
    hover: { layers: [{ role: "surface", shape: "capsule", gradient: gradient("linear", 135, ["#1F2937FF", "#4B5563FF"]), shadows: [{ x: px(0), y: px(6), blur: px(10), spread: px(0), color: "#00000066", inset: false }] }, { role: "content", shape: "circle", fill: "#FFFFFF24", contentSlot: "icon-leading", transform: { scaleX: 1.08, scaleY: 1.08 }, transition: snap }] },
    pressedInside: { layers: [{ role: "surface", shape: "capsule", gradient: gradient("linear", 135, ["#111827FF", "#374151FF"]), transform: { translateY: px(3) }, transition: snap }, { role: "content", shape: "circle", fill: "#FFFFFF18", contentSlot: "icon-leading", transform: { translateY: px(3) } }] }
  }),
  Object.freeze({
    schema: controlPresetSchema, id: "uv-sun-moon-toggle", title: "Sun–Moon Morph Toggle", semantic: { kind: "toggle" },
    visuals: { base: {}, selected: { layers: [{ role: "surface", shape: "capsule", gradient: gradient("linear", 90, ["#172554FF", "#4338CAFF"]) }, { role: "content", shape: "circle", fill: "#F8FAFCFF", contentSlot: "icon-leading", transform: { rotationDeg: 180 }, transition: glide }] } },
    toggleVisual: { track: { role: "surface", shape: "capsule", gradient: gradient("linear", 90, ["#38BDF8FF", "#FDE68AFF"]), transition: glide }, thumb: { role: "content", shape: "circle", fill: "#FFF7CCFF", transition: glide }, selectedThumbTransform: { translateX: ratio(1), rotationDeg: 180 } },
    cues: { selectOn: "select-on", selectOff: "select-off" }, provenance: donorProvenance("uv-sun-moon-toggle")
  } satisfies ControlPreset),
  Object.freeze({
    schema: controlPresetSchema, id: "uv-like-pop-toggle", title: "Like/Favorite Pop Toggle", semantic: { kind: "toggle", variant: "checkbox" },
    visuals: { base: { layers: [{ role: "surface", shape: "circle", fill: "#F3F4F6FF", border: { width: px(2), color: "#9CA3AFFF", radius: ratio(1) } }, { role: "content", shape: "circle", fill: "#6B7280FF", contentSlot: "icon-leading", transition: snap }] }, selected: { layers: [{ role: "surface", shape: "circle", fill: "#FFE4E6FF", border: { width: px(2), color: "#FB7185FF", radius: ratio(1) } }, { role: "content", shape: "circle", fill: "#E11D48FF", contentSlot: "icon-leading", transform: { scaleX: 1.15, scaleY: 1.15 }, transition: snap }] } },
    cues: { selectOn: "select-on", selectOff: "select-off" }, provenance: donorProvenance("uv-like-pop-toggle")
  } satisfies ControlPreset),
  momentary("an-shine-sweep", "Diagonal Shine Sweep", {
    base: { layers: [purpleSurface, labelLayer, { role: "effect", shape: "rect", gradient: gradient("linear", 110, ["#FFFFFF00", "#FFFFFF80", "#FFFFFF00"]), opacity: 0.45, transform: { translateX: ratio(0) }, transition: { durationMs: 460, easing: "ease-in-out" } }] },
    hover: { layers: [purpleSurface, { ...labelLayer, transform: { translateX: px(4) } }, { role: "effect", shape: "rect", gradient: gradient("linear", 110, ["#FFFFFF00", "#FFFFFFFF", "#FFFFFF00"]), opacity: 0.7, transform: { translateX: ratio(1) }, transition: { durationMs: 460, easing: "ease-in-out" } }] }
  }),
  momentary("an-vertical-label-swap", "Vertical Label Swap", {
    base: { layers: [darkSurface, labelLayer, { ...labelLayer, opacity: 0, transform: { translateY: ratio(1) } }] },
    hover: { layers: [darkSurface, { ...labelLayer, opacity: 0, transform: { translateY: ratio(1) } }, { ...labelLayer, opacity: 1, transform: { translateY: ratio(0) } }] }
  }),
  momentary("an-overlay-arrow-swap", "Overlay Arrow Swap", {
    base: { layers: [darkSurface, { role: "effect", shape: "capsule", fill: "#22C55EFF", transform: { translateX: ratio(1) }, transition: glide }, labelLayer, { role: "content", shape: "rect", contentSlot: "icon-trailing", opacity: 0, transform: { translateX: ratio(1) }, transition: glide }] },
    hover: { layers: [darkSurface, { role: "effect", shape: "capsule", fill: "#22C55EFF", transform: { translateX: ratio(0) }, transition: glide }, { ...labelLayer, opacity: 0, transform: { translateX: ratio(1) } }, { role: "content", shape: "rect", contentSlot: "icon-trailing", opacity: 1, transform: { translateX: ratio(0) }, transition: glide }] }
  }),
  momentary("an-expanding-leading-fill", "Expanding Leading Fill", {
    base: { layers: [{ role: "surface", shape: "capsule", fill: "#F8FAFCFF", border: { width: px(2), color: "#111827FF", radius: px(999) } }, { role: "effect", shape: "circle", fill: "#111827FF", transform: { translateX: ratio(0), scaleX: 0.18, scaleY: 0.18 }, transition: glide }, { ...labelLayer, transform: { translateX: px(10) } }] },
    hover: { layers: [{ role: "surface", shape: "capsule", fill: "#F8FAFCFF", border: { width: px(2), color: "#111827FF", radius: px(999) } }, { role: "effect", shape: "circle", fill: "#111827FF", transform: { translateX: ratio(0), scaleX: 1.35, scaleY: 1.35 }, transition: glide }, { ...labelLayer, transform: { translateX: px(16) } }] }
  }),
  momentary("an-rising-bubble-fill", "Rising Bubble Fill", {
    base: { layers: [{ role: "surface", shape: "round-rect", fill: "#F8FAFCFF", border: { width: px(2), color: "#0F766EFF", radius: px(12) } }, { role: "effect", shape: "circle", fill: "#14B8A6FF", transform: { translateY: ratio(1), scaleX: 1.5, scaleY: 1.5 }, transition: glide }, labelLayer] },
    hover: { layers: [{ role: "surface", shape: "round-rect", fill: "#F8FAFCFF", border: { width: px(2), color: "#0F766EFF", radius: px(12) } }, { role: "effect", shape: "circle", fill: "#14B8A6FF", transform: { translateY: ratio(0), scaleX: 1.5, scaleY: 1.5 }, transition: glide }, labelLayer] }
  }),
  momentary("an-arrow-conveyor", "Arrow Conveyor", {
    base: { layers: [darkSurface, labelLayer, { role: "content", shape: "circle", fill: "#F8FAFCFF", contentSlot: "icon-trailing", transition: glide }, { role: "content", shape: "circle", fill: "#F8FAFCFF", contentSlot: "icon-trailing", transform: { translateX: ratio(1) }, transition: glide }] },
    hover: { layers: [{ ...darkSurface, fill: "#F8FAFCFF" }, labelLayer, { role: "content", shape: "circle", fill: "#111827FF", contentSlot: "icon-trailing", transform: { translateX: ratio(1) }, transition: glide }, { role: "content", shape: "circle", fill: "#111827FF", contentSlot: "icon-trailing", transform: { translateX: ratio(0) }, transition: glide }] }
  }),
  momentary("mu-perimeter-shimmer", "Perimeter Shimmer", {
    base: { layers: [{ role: "edge", shape: "round-rect", gradient: gradient("conic", 0, ["#FFFFFF00", "#A78BFAFF", "#FFFFFF00", "#38BDF8FF", "#FFFFFF00"]), border: { width: px(3), color: "#A78BFAFF", radius: px(12) }, transition: { durationMs: 700, easing: "linear" } }, { role: "surface", shape: "round-rect", fill: "#18181BFF", transform: { scaleX: 0.96, scaleY: 0.86 } }] },
    hover: { layers: [{ role: "edge", shape: "round-rect", gradient: gradient("conic", 180, ["#FFFFFF00", "#38BDF8FF", "#FFFFFF00", "#A78BFAFF", "#FFFFFF00"]), border: { width: px(3), color: "#38BDF8FF", radius: px(12) }, transform: { rotationDeg: 180 }, transition: { durationMs: 700, easing: "linear" } }, { role: "surface", shape: "round-rect", fill: "#18181BFF", transform: { scaleX: 0.96, scaleY: 0.86 } }] }
  }),
  momentary("mu-rainbow-border", "Animated Rainbow Border", {
    base: { layers: [{ role: "edge", shape: "round-rect", gradient: gradient("linear", 90, ["#FF3B30FF", "#FFCC00FF", "#34C759FF", "#007AFFFF", "#AF52DEFF"]), shadows: [{ x: px(0), y: px(0), blur: px(12), spread: px(2), color: "#AF52DE66", inset: false }] }, { role: "surface", shape: "round-rect", fill: "#111827FF", transform: { scaleX: 0.97, scaleY: 0.88 } }] },
    selected: { layers: [{ role: "edge", shape: "round-rect", gradient: gradient("linear", 270, ["#AF52DEFF", "#007AFFFF", "#34C759FF", "#FFCC00FF", "#FF3B30FF"]), transform: { scaleX: 1.03, scaleY: 1.03 }, transition: glide }, { role: "surface", shape: "round-rect", fill: "#111827FF", transform: { scaleX: 0.97, scaleY: 0.88 } }] }
  }),
  momentary("mu-dot-flood-reveal", "Dot Flood Reveal", {
    base: { layers: [{ role: "surface", shape: "capsule", fill: "#F8FAFCFF", border: { width: px(2), color: "#111827FF", radius: px(999) } }, { role: "effect", shape: "circle", fill: "#111827FF", transform: { translateX: ratio(0), scaleX: 0.08, scaleY: 0.08 }, transition: glide }, labelLayer] },
    hover: { layers: [{ role: "surface", shape: "capsule", fill: "#F8FAFCFF", border: { width: px(2), color: "#111827FF", radius: px(999) } }, { role: "effect", shape: "circle", fill: "#111827FF", transform: { translateX: ratio(0), scaleX: 1.45, scaleY: 1.45 }, transition: glide }, { ...labelLayer, transform: { translateX: px(8) } }] }
  }),
  momentary("mu-attention-pulse", "Attention Pulse", {
    base: { layers: [{ role: "effect", shape: "capsule", fill: "#7C3AED33", shadows: [{ x: px(0), y: px(0), blur: px(10), spread: px(5), color: "#7C3AED55", inset: false }], transition: { durationMs: 650, easing: "ease-out" } }, { role: "surface", shape: "capsule", fill: "#7C3AEDFF" }] },
    hover: { layers: [{ role: "effect", shape: "capsule", fill: "#7C3AED22", opacity: 0, transform: { scaleX: 1.16, scaleY: 1.5 }, transition: { durationMs: 650, easing: "ease-out" } }, { role: "surface", shape: "capsule", fill: "#8B5CF6FF" }] }
  }),
  momentary("mu-glare-sweep", "Configurable Glare Sweep", {
    base: { layers: [{ role: "surface", shape: "round-rect", gradient: gradient("linear", 135, ["#0F172AFF", "#334155FF"]) }, { role: "effect", shape: "rect", gradient: gradient("linear", 120, ["#FFFFFF00", "#FFFFFF99", "#FFFFFF00"]), opacity: 0.55, transform: { translateX: ratio(0), rotationDeg: 12 }, transition: { durationMs: 520, easing: "ease-in-out" } }] },
    hover: { layers: [{ role: "surface", shape: "round-rect", gradient: gradient("linear", 135, ["#0F172AFF", "#334155FF"]) }, { role: "effect", shape: "rect", gradient: gradient("linear", 120, ["#FFFFFF00", "#FFFFFFFF", "#FFFFFF00"]), opacity: 0.75, transform: { translateX: ratio(1), rotationDeg: 12 }, transition: { durationMs: 520, easing: "ease-in-out" } }] }
  })
]);

const metadata = [
  ["uv-plastic-inset-press", "physical-plastic", "P0", "Layered face with four-direction inset bevel, bottom depth shadow, and press travel that collapses depth."],
  ["uv-simple-drop-press", "drop-shadow-press", "P0", "Flat face, one-color depth shadow, 5 px press travel, 100 ms transition."],
  ["uv-tilt-level-press", "physical-plastic", "P2", "Resting rotation, multi-layer cast shadow, level-on-emphasis transition, and 4 px press."],
  ["uv-diagonal-offset-press", "drop-shadow-press", "P0", "Hard 4 px diagonal offset shadow with matching X/Y press travel."],
  ["uv-hover-lift-pill", "drop-shadow-press", "P1", "Pill face, hover lift with expanded depth, and active depression to zero depth."],
  ["uv-halo-lift", "glow-gradient", "P2", "Lift plus expanding, fading silhouette/halo behind the control."],
  ["uv-dark-capsule-icon", "directional-icon", "P1", "Dark gradient capsule, nested circular icon well, short press travel, and icon emphasis."],
  ["uv-basic-toggle", "toggle", "P0", "Track color transition plus translated circular handle."],
  ["uv-sun-moon-toggle", "toggle", "P1", "Knob travel synchronized with sun-ray collapse and moon-crescent morph."],
  ["uv-like-pop-toggle", "toggle", "P1", "State-change scale pop with recolored vector icon."],
  ["uv-skeuo-icon-choice", "choice-radio", "P0", "Three-layer shadow, edge, and front treatment with selected emphasis and short press travel."],
  ["an-pointer-field-ripple", "ripple", "P0", "Single radial field sized from control bounds and positioned from normalized contact coordinates."],
  ["an-status-cycle", "status-state", "P0", "Externally driven idle, loading, success, and error content transitions."],
  ["an-shine-sweep", "shine-shimmer", "P1", "Angled translucent strip crosses the control while trailing content shifts."],
  ["an-vertical-label-swap", "status-state", "P1", "Two content layers swap vertically within a clipped control."],
  ["an-overlay-arrow-swap", "directional-icon", "P1", "Full-width colored overlay enters laterally as label exits and icon replaces it."],
  ["an-expanding-leading-fill", "directional-icon", "P1", "Leading circular icon well expands to fill the pill while content shifts."],
  ["an-rising-bubble-fill", "glow-gradient", "P2", "Oversized rounded fill rises from below inside the control."],
  ["an-arrow-conveyor", "directional-icon", "P1", "Color inversion plus paired icon conveyor through a circular well."],
  ["mu-perimeter-shimmer", "shine-shimmer", "P1", "Conic-gradient spark travels around the perimeter with inset highlight response."],
  ["mu-rainbow-border", "glow-gradient", "P2", "Multi-stop border gradient with bounded under-glow and static reduced-motion fallback."],
  ["mu-dot-flood-reveal", "minimal-tool", "P1", "Small leading dot scales to flood the control while content shifts."],
  ["mu-attention-pulse", "glow-gradient", "P1", "Bounded outward attention pulse using color, duration, and distance."],
  ["mu-multi-activation-ripple", "ripple", "P0", "Bounded ephemeral activation ripples originate at normalized contact coordinates."],
  ["mu-glare-sweep", "shine-shimmer", "P1", "Parameterized diagonal glare with angle, size, color, opacity, and duration." ]
] as const satisfies readonly (readonly [string, ControlPresetCategory, ControlPresetPriority, string])[];

function dimmed(state: ControlVisualState): ControlVisualState {
  return Object.freeze({ layers: Object.freeze((state.layers ?? []).map((layer) => Object.freeze({ ...layer, opacity: Math.min(layer.opacity ?? 1, 0.5) }))), effects: Object.freeze([]) });
}

function defaultPressed(base: ControlVisualState): ControlVisualState {
  return Object.freeze({ layers: Object.freeze((base.layers ?? []).map((layer) => layer.role === "surface" ? Object.freeze({ ...layer, transform: { ...layer.transform, translateY: px(2) }, transition: snap }) : layer)), ...(base.effects === undefined ? {} : { effects: base.effects }) });
}

function harden(preset: ControlPreset): ControlPreset {
  const visuals = preset.visuals;
  const hardened: ControlVisualStates = Object.freeze({
    ...visuals,
    focus: visuals.focus ?? Object.freeze({ layers: Object.freeze([focusLayer]) }),
    pressedInside: visuals.pressedInside ?? defaultPressed(visuals.base),
    pressedOutside: visuals.pressedOutside ?? visuals.base,
    disabled: visuals.disabled ?? dimmed(visuals.base),
    reducedMotion: visuals.reducedMotion ?? Object.freeze({ ...(visuals.base.layers === undefined ? {} : { layers: visuals.base.layers }), effects: Object.freeze([]) })
  });
  return Object.freeze({ ...preset, visuals: hardened });
}

const presetById = new Map<string, ControlPreset>([...p0ControlPresets, ...addedPresets].map((preset) => [preset.id, preset]));

export const controlFeedbackPresetEntries: readonly ControlPresetLibraryEntry[] = Object.freeze(metadata.map(([id, category, priority, normalizedPrimitive]) => {
  const preset = presetById.get(id);
  if (preset === undefined) throw new Error(`Missing vetted preset ${id}.`);
  return Object.freeze({ preset: harden(preset), category, priority, normalizedPrimitive });
}));

export const controlFeedbackPresets: readonly ControlPreset[] = Object.freeze(controlFeedbackPresetEntries.map((entry) => entry.preset));
export const controlFeedbackPresetIds: readonly string[] = Object.freeze(controlFeedbackPresets.map((preset) => preset.id));
export const vettedControlFeedbackPack: ControlPack = Object.freeze({ schema: controlPackSchema, id: "sfhs-vetted-controls", title: "SFHS Vetted Control Library", presets: controlFeedbackPresets });

export function findControlFeedbackPreset(id: string): ControlPreset | undefined {
  return controlFeedbackPresets.find((preset) => preset.id === id);
}

export function presetsInCategory(category: ControlPresetCategory): readonly ControlPreset[] {
  return Object.freeze(controlFeedbackPresetEntries.filter((entry) => entry.category === category).map((entry) => entry.preset));
}

export function isDonorProvenance(provenance: ControlProvenance): provenance is ControlDonorProvenance {
  return "donor" in provenance;
}
