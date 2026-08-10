export const packageIdentity = "@sfhs/control-feedback-contract" as const;

export {
  canonicalControlPresetJson,
  canonicalControlPresetSetJson
} from "./canonical.ts";
export {
  p0ControlPresetIds,
  p0ControlPresets
} from "./fixtures.ts";
export {
  frozenP0DonorSources,
  frozenP0PresetSourceKeys,
  validateFrozenProvenance,
  type FrozenDonorSource
} from "./provenance.ts";
export {
  validateControlPreset,
  validateControlPresets
} from "./validation.ts";
export {
  controlPresetSchema,
  type ActivationRippleEffect,
  type ChoiceSemantic,
  type ControlBorder,
  type ControlContentSlot,
  type ControlCueMap,
  type ControlDonor,
  type ControlDonorSource,
  type ControlEffect,
  type ControlEffectKind,
  type ControlEasing,
  type ControlInteractionState,
  type ControlLayerRole,
  type ControlLayerStyle,
  type ControlLength,
  type ControlLengthUnit,
  type ControlPreset,
  type ControlPresetSchema,
  type ControlProvenance,
  type ControlSemantic,
  type ControlSemanticKind,
  type ControlShadow,
  type ControlShape,
  type ControlStatus,
  type ControlTransform,
  type ControlTransition,
  type ControlValidationCode,
  type ControlValidationFinding,
  type ControlValidationResult,
  type ControlVisualState,
  type ControlVisualStates,
  type FieldRippleEffect,
  type MomentarySemantic,
  type ToggleSemantic,
  type ToggleVisual
} from "./types.ts";
