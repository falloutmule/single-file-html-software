export const packageIdentity = "@sfhs/control-feedback-presets" as const;
export {
  controlFeedbackPresetEntries,
  controlFeedbackVisualConformance,
  controlFeedbackPresetIds,
  controlFeedbackPresets,
  findControlFeedbackPreset,
  isDonorProvenance,
  presetsInCategory,
  vettedControlFeedbackPack,
  type ControlPresetCategory,
  type ControlPresetLibraryEntry,
  type ControlPresetPriority,
  type ControlVisualConformanceFinding,
  type ControlVisualConformanceLevel
} from "./library.ts";
