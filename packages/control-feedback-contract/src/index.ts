export const packageIdentity = "@sfhs/control-feedback-contract" as const;

export { canonicalControlPackJson, canonicalControlPresetJson, canonicalControlPresetSetJson } from "./canonical.ts";
export { p0ControlPresetIds, p0ControlPresets } from "./fixtures.ts";
export {
  frozenDonorRevisions,
  frozenDonorSources,
  frozenP0DonorSources,
  frozenP0PresetSourceKeys,
  frozenPresetSourceKeys,
  validateFrozenProvenance,
  type FrozenDonorSource
} from "./provenance.ts";
export { isControlPack, validateControlPack, validateControlPreset, validateControlPresets } from "./validation.ts";
export {
  controlPackSchema,
  controlPresetSchema,
  type ActivationRippleEffect,
  type ChoiceSemantic,
  type ControlBorder,
  type ControlContentSlot,
  type ControlCueMap,
  type ControlDonor,
  type ControlDonorProvenance,
  type ControlDonorSource,
  type ControlEffect,
  type ControlEffectKind,
  type ControlEasing,
  type ControlGradient,
  type ControlGradientStop,
  type ControlInteractionState,
  type ControlLayerRole,
  type ControlLayerStyle,
  type ControlLength,
  type ControlLengthUnit,
  type ControlOriginalProvenance,
  type ControlPack,
  type ControlPackSchema,
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
