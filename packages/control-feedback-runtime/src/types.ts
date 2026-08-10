import type {
  ControlEffect,
  ControlInteractionState,
  ControlLayerStyle,
  ControlPreset,
  ControlStatus,
  ToggleVisual
} from "@sfhs/control-feedback-contract";

export const controlFeedbackStateSchema = "sfhs.control-feedback-state@0" as const;
export const controlFeedbackEventSchema = "sfhs.control-feedback-event@0" as const;

export type ControlFeedbackSource = "pointer" | "keyboard";
export type ControlFeedbackCancelReason =
  | "release-outside"
  | "pointer-cancel"
  | "capture-lost"
  | "focus-lost"
  | "window-blur"
  | "document-hidden"
  | "disabled"
  | "disposed"
  | "adapter-reset";
export type ControlFeedbackEventKind = "contact" | "activate" | "cancel" | "effect-spawn" | "cue" | "state-changed";
export type ControlFeedbackCueRole = "press" | "activate" | "cancel" | "select-on" | "select-off" | "success" | "error";

export interface ControlFeedbackOrigin {
  readonly x: number;
  readonly y: number;
}

export interface ControlFeedbackModel {
  readonly enabled: boolean;
  readonly selected: boolean;
  readonly status: ControlStatus;
  readonly focused: boolean;
  readonly focusVisible: boolean;
  readonly hovered: boolean;
}

export interface ControlFeedbackOwner {
  readonly source: ControlFeedbackSource;
  readonly sourceId: string;
}

export interface MomentaryActivationProposal {
  readonly kind: "momentary";
}

export interface ToggleActivationProposal {
  readonly kind: "toggle";
  readonly proposedSelected: boolean;
}

export interface ChoiceActivationProposal {
  readonly kind: "choice";
  readonly groupId: string;
  readonly value: string;
}

export type ControlFeedbackActivationProposal =
  | MomentaryActivationProposal
  | ToggleActivationProposal
  | ChoiceActivationProposal;

export interface ControlFeedbackTransitionTarget {
  readonly revision: number;
  readonly fromRevision: number;
  readonly startedAtMs: number;
  readonly mode: "retarget-current";
  readonly interaction: ControlInteractionState;
}

export interface ControlFeedbackPresentation {
  readonly layers: readonly ControlLayerStyle[];
  readonly effects: readonly ControlEffect[];
  readonly transition: ControlFeedbackTransitionTarget;
  readonly toggleVisual?: ToggleVisual;
}

export interface ControlFeedbackRippleInstance {
  readonly kind: "activation-ripple";
  readonly id: number;
  readonly origin: ControlFeedbackOrigin;
  readonly startedAtMs: number;
  readonly expiresAtMs: number;
}

export interface ControlFeedbackFieldRipple {
  readonly kind: "field-ripple";
  readonly origin: ControlFeedbackOrigin;
}

export interface ControlFeedbackSnapshot {
  readonly schema: typeof controlFeedbackStateSchema;
  readonly controlId: string;
  readonly sequence: number;
  readonly interaction: ControlInteractionState;
  readonly model: ControlFeedbackModel;
  readonly owner?: ControlFeedbackOwner;
  readonly origin?: ControlFeedbackOrigin;
  readonly reducedMotion: boolean;
  readonly presentation: ControlFeedbackPresentation;
  readonly fieldRipple?: ControlFeedbackFieldRipple;
  readonly activationRipples: readonly ControlFeedbackRippleInstance[];
}

export interface ControlFeedbackEvent {
  readonly schema: typeof controlFeedbackEventSchema;
  readonly sequence: number;
  readonly atMs: number;
  readonly controlId: string;
  readonly kind: ControlFeedbackEventKind;
  readonly source?: ControlFeedbackSource;
  readonly sourceId?: string;
  readonly origin?: ControlFeedbackOrigin;
  readonly interaction?: ControlInteractionState;
  readonly reason?: ControlFeedbackCancelReason;
  readonly proposal?: ControlFeedbackActivationProposal;
  readonly effectId?: number;
  readonly cueRole?: ControlFeedbackCueRole;
  readonly cueId?: string;
}

interface TimedSignal {
  readonly atMs: number;
}

export interface ContactBeginSignal extends TimedSignal {
  readonly kind: "contact-begin";
  readonly source: ControlFeedbackSource;
  readonly sourceId: string;
  readonly origin?: ControlFeedbackOrigin;
}

export interface ContactUpdateSignal extends TimedSignal {
  readonly kind: "contact-update";
  readonly sourceId: string;
  readonly inside: boolean;
  readonly origin?: ControlFeedbackOrigin;
}

export interface ContactEndSignal extends TimedSignal {
  readonly kind: "contact-end";
  readonly sourceId: string;
  readonly inside: boolean;
  readonly origin?: ControlFeedbackOrigin;
}

export interface ContactCancelSignal extends TimedSignal {
  readonly kind: "contact-cancel";
  readonly sourceId?: string;
  readonly reason: ControlFeedbackCancelReason;
}

export interface HoverSetSignal extends TimedSignal {
  readonly kind: "hover-set";
  readonly hovered: boolean;
}

export interface FocusSetSignal extends TimedSignal {
  readonly kind: "focus-set";
  readonly focused: boolean;
  readonly focusVisible: boolean;
}

export interface ModelSetSignal extends TimedSignal {
  readonly kind: "model-set";
  readonly enabled?: boolean;
  readonly selected?: boolean;
  readonly status?: ControlStatus;
}

export interface ReducedMotionSetSignal extends TimedSignal {
  readonly kind: "reduced-motion-set";
  readonly reducedMotion: boolean;
}

export interface TickSignal extends TimedSignal {
  readonly kind: "tick";
}

export type ControlFeedbackSignal =
  | ContactBeginSignal
  | ContactUpdateSignal
  | ContactEndSignal
  | ContactCancelSignal
  | HoverSetSignal
  | FocusSetSignal
  | ModelSetSignal
  | ReducedMotionSetSignal
  | TickSignal;

export interface ControlFeedbackDispatchResult {
  readonly snapshot: ControlFeedbackSnapshot;
  readonly events: readonly ControlFeedbackEvent[];
}

export type ControlFeedbackListener = (result: ControlFeedbackDispatchResult) => void;

export interface CreateControlFeedbackRuntimeOptions {
  readonly controlId: string;
  readonly preset: ControlPreset;
  readonly initialModel?: Partial<ControlFeedbackModel>;
  readonly reducedMotion?: boolean;
}

export interface ControlFeedbackRuntime {
  read(): ControlFeedbackSnapshot;
  dispatch(signal: ControlFeedbackSignal): ControlFeedbackDispatchResult;
  subscribe(listener: ControlFeedbackListener): () => void;
  dispose(atMs: number): ControlFeedbackDispatchResult;
}
