import type { ControlPreset, ControlStatus } from "@sfhs/control-feedback-contract";
import type { DomControlController, DomControlCue } from "@sfhs/control-feedback-dom";
import type { MobileControlsController, MobileControlsSnapshot } from "@sfhs/mobile-controls";

export interface MobileControlFeedbackBinding {
  readonly controlId: string;
  readonly preset: ControlPreset;
}

export interface MobileControlFeedbackModel {
  readonly enabled?: boolean;
  readonly status?: ControlStatus;
}

export interface AttachMobileControlsFeedbackOptions {
  readonly root: HTMLElement;
  readonly controller: MobileControlsController;
  readonly bindings: readonly MobileControlFeedbackBinding[];
  readonly reducedMotion?: boolean;
  readonly clock?: () => number;
  readonly model?: (controlId: string, snapshot: MobileControlsSnapshot) => MobileControlFeedbackModel;
  readonly onCue?: (controlId: string, cue: DomControlCue) => void;
}

export interface MobileControlsFeedbackBridge {
  readonly controlIds: readonly string[];
  read(controlId: string): ReturnType<DomControlController["read"]>;
  sync(): void;
  destroy(): void;
}
