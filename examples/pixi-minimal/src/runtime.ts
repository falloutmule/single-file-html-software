import type { PixiMinimalRenderer } from "@sfhs/adapter-pixi-v8";

import {
  advancePixiMinimalFixtureSimulation,
  createInitialPixiMinimalFixtureState,
  presentPixiMinimalFixture,
  type PixiMinimalFixtureState
} from "./fixture.ts";
import { createIdleFixtureActionSnapshot, type FixtureActionSnapshot } from "./input.ts";

export const simulationHz = 60;
export const fixedStepMilliseconds = 1_000 / simulationHz;
export const maximumFrameDeltaMilliseconds = 250;
const timingToleranceMilliseconds = 0.000_001;

export interface FixedStepFrame {
  readonly state: PixiMinimalFixtureState;
  readonly carryMilliseconds: number;
  readonly stepCount: number;
}

export interface FrameScheduler {
  requestFrame(callback: (timestampMilliseconds: number) => void): number;
  cancelFrame(handle: number): void;
}

export interface PixiMinimalFixtureLifecycle {
  start(): void;
  stop(): void;
  dispose(): void;
  getState(): PixiMinimalFixtureState;
  isRunning(): boolean;
}

export interface PixiMinimalFixtureLifecycleOptions {
  readonly renderer: PixiMinimalRenderer;
  readonly scheduler?: FrameScheduler;
  readonly actionSource?: FixtureActionSource;
  readonly onStateChange?: (state: PixiMinimalFixtureState) => void;
}

export interface FixtureVisibilityController {
  dispose(): void;
}

export interface FixtureVisibilityControllerOptions {
  readonly source?: EventTarget;
  readonly isHidden?: () => boolean;
}

export interface FixtureActionSource {
  sampleForStep(): FixtureActionSnapshot;
  clear(): void;
}

function boundedMilliseconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), maximumFrameDeltaMilliseconds);
}

function browserFrameScheduler(): FrameScheduler {
  return {
    requestFrame(callback) {
      return window.requestAnimationFrame(callback);
    },
    cancelFrame(handle) {
      window.cancelAnimationFrame(handle);
    }
  };
}

export function advanceFixedStepFrame(
  state: PixiMinimalFixtureState,
  carryMilliseconds: number,
  frameDeltaMilliseconds: number,
  actionSource?: Pick<FixtureActionSource, "sampleForStep">
): FixedStepFrame {
  let remainingMilliseconds = boundedMilliseconds(carryMilliseconds) + boundedMilliseconds(frameDeltaMilliseconds);
  let nextState = state;
  let stepCount = 0;

  while (remainingMilliseconds + timingToleranceMilliseconds >= fixedStepMilliseconds) {
    nextState = advancePixiMinimalFixtureSimulation(
      nextState,
      actionSource?.sampleForStep() ?? createIdleFixtureActionSnapshot()
    );
    remainingMilliseconds -= fixedStepMilliseconds;
    stepCount += 1;
  }

  return {
    state: nextState,
    carryMilliseconds: Math.max(remainingMilliseconds, 0),
    stepCount
  };
}

export function createPixiMinimalFixtureLifecycle(
  options: PixiMinimalFixtureLifecycleOptions
): PixiMinimalFixtureLifecycle {
  const scheduler = options.scheduler ?? browserFrameScheduler();
  let state = createInitialPixiMinimalFixtureState();
  let carryMilliseconds = 0;
  let lastTimestampMilliseconds: number | undefined;
  let frameHandle: number | undefined;
  let running = false;
  let disposed = false;

  function renderCurrentState(): void {
    options.renderer.render(presentPixiMinimalFixture(state));
    options.onStateChange?.(state);
  }

  function scheduleFrame(): void {
    frameHandle = scheduler.requestFrame(onFrame);
  }

  function onFrame(timestampMilliseconds: number): void {
    frameHandle = undefined;
    if (!running || disposed) {
      return;
    }

    if (lastTimestampMilliseconds !== undefined) {
      const frame = advanceFixedStepFrame(
        state,
        carryMilliseconds,
        timestampMilliseconds - lastTimestampMilliseconds,
        options.actionSource
      );
      state = frame.state;
      carryMilliseconds = frame.carryMilliseconds;
    }

    lastTimestampMilliseconds = timestampMilliseconds;
    renderCurrentState();
    scheduleFrame();
  }

  return {
    start(): void {
      if (disposed) {
        throw new Error("A disposed Pixi minimal fixture lifecycle cannot be restarted.");
      }

      if (running) {
        return;
      }

      running = true;
      lastTimestampMilliseconds = undefined;
      renderCurrentState();
      scheduleFrame();
    },
    stop(): void {
      running = false;
      lastTimestampMilliseconds = undefined;
      options.actionSource?.clear();
      if (frameHandle !== undefined) {
        scheduler.cancelFrame(frameHandle);
        frameHandle = undefined;
      }
    },
    dispose(): void {
      if (disposed) {
        return;
      }

      this.stop();
      disposed = true;
      options.renderer.destroy();
    },
    getState(): PixiMinimalFixtureState {
      return state;
    },
    isRunning(): boolean {
      return running;
    }
  };
}

export function createFixtureVisibilityController(
  lifecycle: Pick<PixiMinimalFixtureLifecycle, "isRunning" | "start" | "stop">,
  options: FixtureVisibilityControllerOptions = {}
): FixtureVisibilityController {
  const source = options.source ?? document;
  const isHidden = options.isHidden ?? (() => document.hidden);
  let resumeWhenVisible = false;

  const onVisibilityChange: EventListener = () => {
    if (isHidden()) {
      resumeWhenVisible = lifecycle.isRunning();
      if (resumeWhenVisible) {
        lifecycle.stop();
      }
      return;
    }

    if (resumeWhenVisible) {
      resumeWhenVisible = false;
      lifecycle.start();
    }
  };

  source.addEventListener("visibilitychange", onVisibilityChange);
  return {
    dispose(): void {
      resumeWhenVisible = false;
      source.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
}
