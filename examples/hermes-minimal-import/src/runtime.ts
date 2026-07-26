import type { PixiCircleStageRenderer } from "@sfhs/adapter-pixi-v8";

import type { CollectorInput } from "./input";
import {
  advanceCollectorState,
  createInitialCollectorState,
  presentCollectorState,
  type CollectorState
} from "./state";

const fixedStepMilliseconds = 1_000 / 60;
const maximumFrameDeltaMilliseconds = 250;

export interface CollectorLifecycle {
  start(): void;
  stop(): void;
  dispose(): void;
  getState(): CollectorState;
  isRunning(): boolean;
}

export function createCollectorLifecycle(
  renderer: PixiCircleStageRenderer,
  input: CollectorInput,
  onState: (state: CollectorState) => void
): CollectorLifecycle {
  let state = createInitialCollectorState();
  let running = false;
  let disposed = false;
  let frameHandle: number | undefined;
  let lastTimestamp: number | undefined;
  let carry = 0;

  function render(): void {
    renderer.render(presentCollectorState(state));
    onState(state);
  }

  function frame(timestamp: number): void {
    frameHandle = undefined;
    if (!running || disposed) return;
    if (lastTimestamp !== undefined) {
      carry += Math.min(Math.max(timestamp - lastTimestamp, 0), maximumFrameDeltaMilliseconds);
      while (carry >= fixedStepMilliseconds) {
        state = advanceCollectorState(state, input.sample());
        carry -= fixedStepMilliseconds;
      }
    }
    lastTimestamp = timestamp;
    render();
    frameHandle = window.requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (disposed) throw new Error("A disposed collector lifecycle cannot restart.");
      if (running) return;
      running = true;
      lastTimestamp = undefined;
      render();
      frameHandle = window.requestAnimationFrame(frame);
    },
    stop(): void {
      running = false;
      lastTimestamp = undefined;
      carry = 0;
      input.clear();
      if (frameHandle !== undefined) {
        window.cancelAnimationFrame(frameHandle);
        frameHandle = undefined;
      }
    },
    dispose(): void {
      if (disposed) return;
      this.stop();
      disposed = true;
      renderer.destroy();
    },
    getState(): CollectorState {
      return state;
    },
    isRunning(): boolean {
      return running;
    }
  };
}
