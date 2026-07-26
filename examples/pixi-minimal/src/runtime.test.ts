import { describe, expect, it } from "vitest";

import type { PixiMinimalPresentation, PixiMinimalRenderer } from "@sfhs/adapter-pixi-v8";

import { createInitialPixiMinimalFixtureState } from "./fixture.ts";
import { createFixtureActionStore } from "./input.ts";
import {
  advanceFixedStepFrame,
  createFixtureVisibilityController,
  createPixiMinimalFixtureLifecycle,
  fixedStepMilliseconds,
  type FrameScheduler
} from "./runtime.ts";

function createFakeRenderer(): {
  readonly renderer: PixiMinimalRenderer;
  readonly presentations: PixiMinimalPresentation[];
  readonly isDestroyed: () => boolean;
} {
  const presentations: PixiMinimalPresentation[] = [];
  let destroyed = false;

  return {
    renderer: {
      render(presentation): void {
        presentations.push(presentation);
      },
      applyViewport(): void {},
      destroy(): void {
        destroyed = true;
      }
    },
    presentations,
    isDestroyed: () => destroyed
  };
}

function createFakeScheduler(): {
  readonly scheduler: FrameScheduler;
  readonly runNext: (timestampMilliseconds: number) => void;
  readonly cancelledHandles: readonly number[];
} {
  let nextHandle = 1;
  let pendingCallback: ((timestampMilliseconds: number) => void) | undefined;
  const cancelledHandles: number[] = [];

  return {
    scheduler: {
      requestFrame(callback): number {
        pendingCallback = callback;
        const handle = nextHandle;
        nextHandle += 1;
        return handle;
      },
      cancelFrame(handle): void {
        cancelledHandles.push(handle);
        pendingCallback = undefined;
      }
    },
    runNext(timestampMilliseconds): void {
      const callback = pendingCallback;
      pendingCallback = undefined;
      if (callback === undefined) {
        throw new Error("No frame was scheduled.");
      }

      callback(timestampMilliseconds);
    },
    cancelledHandles
  };
}

describe("SFHS Pixi minimal fixed-step runtime", () => {
  it("advances deterministic immutable simulation steps and clamps long frame deltas", () => {
    const initialState = createInitialPixiMinimalFixtureState();
    const oneStep = advanceFixedStepFrame(initialState, 0, fixedStepMilliseconds);
    const longFrame = advanceFixedStepFrame(initialState, 0, 10_000);

    expect(oneStep).toMatchObject({
      state: { phase: "running", visualRevision: 2, ticks: 1, playerX: 240, playerY: 270 },
      stepCount: 1,
      carryMilliseconds: 0
    });
    expect(longFrame.stepCount).toBe(15);
    expect(longFrame.state.ticks).toBe(15);
    expect(initialState).toEqual({
      phase: "ready",
      visualRevision: 1,
      ticks: 0,
      playerX: 240,
      playerY: 270,
      activationCount: 0
    });
  });

  it("owns scheduling and disposal while giving render only frozen presentation values", () => {
    const fakeRenderer = createFakeRenderer();
    const fakeScheduler = createFakeScheduler();
    const lifecycle = createPixiMinimalFixtureLifecycle({
      renderer: fakeRenderer.renderer,
      scheduler: fakeScheduler.scheduler
    });

    lifecycle.start();
    fakeScheduler.runNext(1_000);
    fakeScheduler.runNext(1_000 + fixedStepMilliseconds);

    expect(lifecycle.getState()).toEqual({
      phase: "running",
      visualRevision: 2,
      ticks: 1,
      playerX: 240,
      playerY: 270,
      activationCount: 0
    });
    expect(fakeRenderer.presentations).toHaveLength(3);
    expect(fakeRenderer.presentations.every((presentation) => Object.isFrozen(presentation))).toBe(true);
    expect(Object.isFrozen(lifecycle.getState())).toBe(true);

    lifecycle.stop();
    expect(lifecycle.isRunning()).toBe(false);
    expect(fakeScheduler.cancelledHandles).toHaveLength(1);

    lifecycle.dispose();
    lifecycle.dispose();
    expect(fakeRenderer.isDestroyed()).toBe(true);
  });

  it("samples held actions per step while consuming an activation only once", () => {
    const actions = createFixtureActionStore();
    actions.press("keyboard:KeyD", "move-right");
    actions.queueActivation({ x: 720, y: 270 });

    const frame = advanceFixedStepFrame(
      createInitialPixiMinimalFixtureState(),
      0,
      fixedStepMilliseconds * 2,
      actions
    );

    expect(frame.stepCount).toBe(2);
    expect(frame.state.playerX).toBe(248);
    expect(frame.state.activationCount).toBe(1);
    expect(actions.sampleForStep()).toEqual({ moveX: 1, moveY: 0 });
  });

  it("passes the configured action source through the owned lifecycle", () => {
    const fakeRenderer = createFakeRenderer();
    const fakeScheduler = createFakeScheduler();
    const actions = createFixtureActionStore();
    const lifecycle = createPixiMinimalFixtureLifecycle({
      renderer: fakeRenderer.renderer,
      scheduler: fakeScheduler.scheduler,
      actionSource: actions
    });
    actions.press("keyboard:ArrowRight", "move-right");

    lifecycle.start();
    fakeScheduler.runNext(1_000);
    fakeScheduler.runNext(1_000 + fixedStepMilliseconds);

    expect(lifecycle.getState().playerX).toBe(244);
    lifecycle.dispose();
  });

  it("pauses while hidden and resumes without retaining a catch-up timestamp", () => {
    const fakeRenderer = createFakeRenderer();
    const fakeScheduler = createFakeScheduler();
    const lifecycle = createPixiMinimalFixtureLifecycle({
      renderer: fakeRenderer.renderer,
      scheduler: fakeScheduler.scheduler
    });
    const source = new EventTarget();
    let hidden = false;
    const visibility = createFixtureVisibilityController(lifecycle, {
      source,
      isHidden: () => hidden
    });

    lifecycle.start();
    fakeScheduler.runNext(1_000);
    hidden = true;
    source.dispatchEvent(new Event("visibilitychange"));
    expect(lifecycle.isRunning()).toBe(false);

    hidden = false;
    source.dispatchEvent(new Event("visibilitychange"));
    expect(lifecycle.isRunning()).toBe(true);
    fakeScheduler.runNext(20_000);
    expect(lifecycle.getState().ticks).toBe(0);

    visibility.dispose();
    lifecycle.dispose();
  });
});
