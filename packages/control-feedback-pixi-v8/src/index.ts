export const packageIdentity = "@sfhs/control-feedback-pixi-v8" as const;

export { pixiV8ControlApproximations } from "./approximations.ts";
export { createPixiV8Control } from "./pixi.ts";
export type {
  CreatePixiV8ControlOptions,
  PixiControlApproximation,
  PixiControlCue,
  PixiControlGeometry,
  PixiControlModelUpdate,
  PixiV8ControlController
} from "./types.ts";
