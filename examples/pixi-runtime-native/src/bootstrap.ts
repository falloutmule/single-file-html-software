import { createSfhsPixiGameRuntime } from "@sfhs/pixi-runtime";
import {
  createKeyboardActions,
  createNativeFixturePresentation,
  nativeFixtureScene
} from "./game.ts";

export async function bootNativePixiRuntimeFixture(host: HTMLElement, inputTarget: EventTarget = window) {
  return createSfhsPixiGameRuntime({
    host,
    presentation: createNativeFixturePresentation(),
    scene: nativeFixtureScene,
    actions: createKeyboardActions(inputTarget),
    viewport: {
      mode: "adaptive",
      logicalWidth: 960,
      logicalHeight: 540,
      maximumDevicePixelRatio: 2,
      scalePolicy: "stretch"
    },
    simulationHz: 60,
    maximumFrameDeltaMilliseconds: 250
  });
}
