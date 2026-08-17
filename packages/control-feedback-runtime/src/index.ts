export const packageIdentity = "@sfhs/control-feedback-runtime" as const;

import { validateControlPreset } from "@sfhs/control-feedback-contract";
import { createControlFeedbackRuntimeUnchecked } from "./runtime.ts";
import type { ControlFeedbackRuntime, CreateControlFeedbackRuntimeOptions } from "./types.ts";

export function createControlFeedbackRuntime(options: CreateControlFeedbackRuntimeOptions): ControlFeedbackRuntime {
  const validation = validateControlPreset(options.preset);
  if (!validation.valid) throw new Error(`Invalid control preset: ${validation.findings.map((finding) => `${finding.path}: ${finding.message}`).join("; ")}`);
  return createControlFeedbackRuntimeUnchecked(options);
}
export {
  controlFeedbackEventSchema,
  controlFeedbackStateSchema,
  type ChoiceActivationProposal,
  type ContactBeginSignal,
  type ContactCancelSignal,
  type ContactEndSignal,
  type ContactUpdateSignal,
  type ControlFeedbackActivationProposal,
  type ControlFeedbackCancelReason,
  type ControlFeedbackCueRole,
  type ControlFeedbackDispatchResult,
  type ControlFeedbackEvent,
  type ControlFeedbackEventKind,
  type ControlFeedbackFieldRipple,
  type ControlFeedbackListener,
  type ControlFeedbackModel,
  type ControlFeedbackOrigin,
  type ControlFeedbackOwner,
  type ControlFeedbackPresentation,
  type ControlFeedbackRippleInstance,
  type ControlFeedbackRuntime,
  type ControlFeedbackSignal,
  type ControlFeedbackSnapshot,
  type ControlFeedbackSource,
  type ControlFeedbackTransitionTarget,
  type CreateControlFeedbackRuntimeOptions,
  type FocusSetSignal,
  type HoverSetSignal,
  type ModelSetSignal,
  type MomentaryActivationProposal,
  type ReducedMotionSetSignal,
  type TickSignal,
  type ToggleActivationProposal
} from "./types.ts";
