import { controlPresetSchema, type ControlPreset, type ControlProvenance } from "./types.ts";

const px = (value: number) => ({ value, unit: "px" as const });
const ratio = (value: number) => ({ value, unit: "ratio" as const });
const snap = { durationMs: 70, easing: "ease-out" as const };
const release = { durationMs: 110, easing: "ease-out" as const };

const provenance = {
  plastic: {
    donor: "uiverse",
    license: "MIT",
    modified: true,
    sources: [{ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41", path: "Buttons/cssbuttons-io_plastic-mule-29.html", blobSha: "013cdb596866767dd9c8ca002087b6b01da2233f" }]
  },
  drop: {
    donor: "uiverse",
    license: "MIT",
    modified: true,
    sources: [{ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41", path: "Buttons/krlozCJ_blue-dodo-17.html", blobSha: "d2ba48cdb4e7e7cf1e2d5fe32b706c6a2c9fa682" }]
  },
  diagonal: {
    donor: "uiverse",
    license: "MIT",
    modified: true,
    sources: [{ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41", path: "Buttons/mrhyddenn_mighty-duck-73.html", blobSha: "b8393b2237e9bcf4bbc2194bd786858d82150d1a" }]
  },
  toggle: {
    donor: "uiverse",
    license: "MIT",
    modified: true,
    sources: [{ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41", path: "Toggle-switches/ErzenXz_weak-falcon-28.html", blobSha: "29fc567fdc32f172263ec6a6b5b4f9ab69a01e54" }]
  },
  choice: {
    donor: "uiverse",
    license: "MIT",
    modified: true,
    sources: [{ repository: "uiverse-io/galaxy", commit: "adbd2adde0a299a3956ea288fb444ec01891ca41", path: "Radio-buttons/adamgiebl_hard-vampirebat-36.html", blobSha: "a9f7136b24e21b8585508a10a1391f185507bd82" }]
  },
  fieldRipple: {
    donor: "animata",
    license: "MIT",
    modified: true,
    sources: [
      { repository: "codse/animata", commit: "de9aabb0eed14e0db944bb07720961ddc450c672", path: "animata/button/ripple-button.tsx", blobSha: "36e3b5f331a63cad228e82caeb89f6795893ff46" },
      { repository: "codse/animata", commit: "de9aabb0eed14e0db944bb07720961ddc450c672", path: "animata/button/ripple-button.css", blobSha: "2f599332a773b190ae091aa5cda2ac80b530026d" }
    ]
  },
  status: {
    donor: "animata",
    license: "MIT",
    modified: true,
    sources: [{ repository: "codse/animata", commit: "de9aabb0eed14e0db944bb07720961ddc450c672", path: "animata/button/status-button.tsx", blobSha: "3c227ffadc2f8be1ea487f6618216348b8ae6fcb" }]
  },
  multiRipple: {
    donor: "magicui",
    license: "MIT",
    modified: true,
    sources: [{ repository: "magicuidesign/magicui", commit: "0bd8b9fe0e15c4697c8d22dee1d35d88b5152c25", path: "apps/www/public/r/ripple-button.json", blobSha: "cd88d83d5b29e9385469eefdaa39735a320dbc29" }]
  }
} as const satisfies Record<string, ControlProvenance>;

const commonSurface = {
  role: "surface" as const,
  shape: "round-rect" as const,
  fill: "#6750A4FF",
  transition: snap
};

export const p0ControlPresets = [
  {
    schema: controlPresetSchema,
    id: "uv-plastic-inset-press",
    title: "Plastic Inset Press",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface, shadows: [
        { x: px(0), y: px(-4), blur: px(0), spread: px(0), color: "#25551A80", inset: true },
        { x: px(0), y: px(4), blur: px(0), spread: px(0), color: "#B8FF8DFF", inset: true },
        { x: px(0), y: px(4), blur: px(0), spread: px(0), color: "#00000026", inset: false }
      ] }] },
      pressedInside: { layers: [{ ...commonSurface, transform: { translateY: px(4) }, shadows: [] }] },
      reducedMotion: { layers: [{ ...commonSurface, transform: { translateY: px(2) } }] }
    },
    cues: { press: "press", activate: "activate", cancel: "cancel" },
    provenance: provenance.plastic
  },
  {
    schema: controlPresetSchema,
    id: "uv-simple-drop-press",
    title: "Simple Drop Press",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface, shadows: [{ x: px(0), y: px(5), blur: px(0), spread: px(0), color: "#35276BFF", inset: false }] }] },
      pressedInside: { layers: [{ ...commonSurface, transform: { translateY: px(5) }, shadows: [] }] },
      focus: { layers: [{ role: "focus", shape: "round-rect", border: { width: px(2), color: "#FFFFFFFF", radius: px(8) } }] }
    },
    provenance: provenance.drop
  },
  {
    schema: controlPresetSchema,
    id: "uv-diagonal-offset-press",
    title: "Diagonal Offset Press",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface, shadows: [{ x: px(4), y: px(4), blur: px(0), spread: px(0), color: "#211A33FF", inset: false }] }] },
      pressedInside: { layers: [{ ...commonSurface, transform: { translateX: px(4), translateY: px(4) }, shadows: [] }] }
    },
    provenance: provenance.diagonal
  },
  {
    schema: controlPresetSchema,
    id: "uv-basic-toggle",
    title: "Basic Track Toggle",
    semantic: { kind: "toggle" },
    visuals: {
      base: {},
      selected: { layers: [{ role: "surface", shape: "capsule", fill: "#7A5AF8FF", transition: release }] }
    },
    toggleVisual: {
      track: { role: "surface", shape: "capsule", fill: "#5B5665FF", transition: release },
      thumb: { role: "content", shape: "circle", fill: "#FFFFFFFF", transform: { translateX: ratio(0) }, transition: release },
      selectedThumbTransform: { translateX: ratio(1) }
    },
    cues: { selectOn: "select-on", selectOff: "select-off" },
    provenance: provenance.toggle
  },
  {
    schema: controlPresetSchema,
    id: "uv-skeuo-icon-choice",
    title: "Skeuomorphic Icon Choice Group",
    semantic: { kind: "choice", groupId: "tool-mode", value: "primary" },
    visuals: {
      base: { layers: [
        { role: "depth", shape: "round-rect", fill: "#2C2540FF", transform: { translateY: px(5) } },
        { role: "edge", shape: "round-rect", fill: "#51456FFF", transform: { translateY: px(2) } },
        { role: "surface", shape: "round-rect", fill: "#75649BFF", transition: snap },
        { role: "content", shape: "rect", contentSlot: "icon-leading", transition: snap }
      ] },
      selected: { layers: [{ role: "surface", shape: "round-rect", fill: "#9A7CDBFF" }, { role: "content", shape: "rect", contentSlot: "icon-leading", transform: { scaleX: 1.08, scaleY: 1.08 } }] },
      pressedInside: { layers: [{ role: "surface", shape: "round-rect", transform: { translateY: px(3) } }] }
    },
    provenance: provenance.choice
  },
  {
    schema: controlPresetSchema,
    id: "an-pointer-field-ripple",
    title: "Tracked Pointer Field Ripple",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface }], effects: [{ kind: "field-ripple", diameterFactor: 2, enter: { durationMs: 250, easing: "ease-out" }, leave: { durationMs: 250, easing: "ease-out" }, keyboardOrigin: "center" }] },
      reducedMotion: { effects: [] }
    },
    provenance: provenance.fieldRipple
  },
  {
    schema: controlPresetSchema,
    id: "an-status-cycle",
    title: "Status Cycle Button",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface }, { role: "content", shape: "rect", contentSlot: "label", transition: snap }] },
      status: {
        loading: { layers: [{ role: "content", shape: "circle", contentSlot: "status-icon", transition: snap }] },
        success: { layers: [{ role: "content", shape: "circle", contentSlot: "status-icon", transform: { scaleX: 1.05, scaleY: 1.05 }, transition: snap }] },
        error: { layers: [{ role: "surface", shape: "round-rect", fill: "#B3261EFF" }, { role: "content", shape: "circle", contentSlot: "status-icon" }] }
      }
    },
    cues: { success: "success", error: "error" },
    provenance: provenance.status
  },
  {
    schema: controlPresetSchema,
    id: "mu-multi-activation-ripple",
    title: "Multi-Activation Ripple",
    semantic: { kind: "momentary" },
    visuals: {
      base: { layers: [{ ...commonSurface }], effects: [{ kind: "activation-ripple", concurrentCap: 4, durationMs: 450, keyboardOrigin: "center", idStrategy: "monotonic" }] },
      reducedMotion: { effects: [] }
    },
    provenance: provenance.multiRipple
  }
] as const satisfies readonly ControlPreset[];

export const p0ControlPresetIds = p0ControlPresets.map((preset) => preset.id);
