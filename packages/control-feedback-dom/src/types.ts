import type { ControlPreset, ControlStatus } from "@sfhs/control-feedback-contract";
import type {
  ControlFeedbackActivationProposal,
  ControlFeedbackCueRole,
  ControlFeedbackDispatchResult,
  ControlFeedbackModel,
  ControlFeedbackSignal,
  ControlFeedbackSnapshot
} from "@sfhs/control-feedback-runtime";

export interface DomControlCue {
  readonly role: ControlFeedbackCueRole;
  readonly cueId?: string;
}

export interface MountDomControlOptions {
  readonly container: HTMLElement;
  readonly controlId: string;
  readonly preset: ControlPreset;
  readonly label: string;
  readonly visualLabel?: string;
  readonly enabled?: boolean;
  readonly selected?: boolean;
  readonly status?: ControlStatus;
  readonly reducedMotion?: boolean;
  readonly visualInsetPx?: number;
  readonly clock?: () => number;
  readonly onActivate?: (proposal: ControlFeedbackActivationProposal) => void;
  readonly onCue?: (cue: DomControlCue) => void;
  readonly onDispatch?: (result: ControlFeedbackDispatchResult) => void;
}

export interface DomControlModelUpdate {
  readonly enabled?: boolean;
  readonly selected?: boolean;
  readonly status?: ControlStatus;
}

export interface DomControlController {
  readonly root: HTMLElement;
  readonly interactive: HTMLButtonElement | HTMLInputElement;
  read(): ControlFeedbackSnapshot;
  dispatchNormalized(signal: ControlFeedbackSignal): ControlFeedbackDispatchResult;
  setModel(update: DomControlModelUpdate): ControlFeedbackSnapshot;
  setReducedMotion(reducedMotion: boolean): ControlFeedbackSnapshot;
  destroy(): void;
}

export type DomControlSemanticElement = "button" | "checkbox" | "checkbox-switch" | "radio";

export function semanticElementForPreset(preset: ControlPreset): DomControlSemanticElement {
  if (preset.semantic.kind === "toggle") return preset.semantic.variant === "checkbox" ? "checkbox" : "checkbox-switch";
  if (preset.semantic.kind === "choice") return "radio";
  return "button";
}

export type { ControlFeedbackModel };
