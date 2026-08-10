import type { ControlPreset, ControlStatus } from "@sfhs/control-feedback-contract";
import type {
  ControlFeedbackActivationProposal,
  ControlFeedbackCueRole,
  ControlFeedbackDispatchResult,
  ControlFeedbackSignal,
  ControlFeedbackSnapshot
} from "@sfhs/control-feedback-runtime";
import type { Container } from "pixi.js";

export interface PixiControlGeometry {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PixiControlCue {
  readonly role: ControlFeedbackCueRole;
  readonly cueId?: string;
}

export interface CreatePixiV8ControlOptions {
  readonly parent: Container;
  readonly controlId: string;
  readonly preset: ControlPreset;
  readonly label?: string;
  readonly geometry?: PixiControlGeometry;
  readonly enabled?: boolean;
  readonly selected?: boolean;
  readonly status?: ControlStatus;
  readonly reducedMotion?: boolean;
  readonly clock?: () => number;
  readonly keyboardTarget?: HTMLElement;
  readonly lifecycleWindow?: Window;
  readonly onActivate?: (proposal: ControlFeedbackActivationProposal) => void;
  readonly onCue?: (cue: PixiControlCue) => void;
  readonly onDispatch?: (result: ControlFeedbackDispatchResult) => void;
}

export interface PixiControlModelUpdate {
  readonly enabled?: boolean;
  readonly selected?: boolean;
  readonly status?: ControlStatus;
}

export interface PixiV8ControlController {
  readonly root: Container;
  read(): ControlFeedbackSnapshot;
  dispatchNormalized(signal: ControlFeedbackSignal): ControlFeedbackDispatchResult;
  keyDown(code: "Space" | "Enter", repeat?: boolean): ControlFeedbackDispatchResult | undefined;
  keyUp(code: "Space" | "Enter"): ControlFeedbackDispatchResult | undefined;
  setModel(update: PixiControlModelUpdate): ControlFeedbackSnapshot;
  setReducedMotion(reducedMotion: boolean): ControlFeedbackSnapshot;
  setGeometry(geometry: PixiControlGeometry): void;
  update(atMs?: number): void;
  destroy(): void;
}

export interface PixiControlApproximation {
  readonly id: string;
  readonly contractPrimitive: string;
  readonly pixiV8Strategy: string;
  readonly limitation: string;
}
