import { describe, expect, it } from "vitest";

import { createInitialPixiMinimalFixtureState } from "./fixture.ts";
import { installFixtureDiagnostics } from "./diagnostics.ts";
import { calculateFixtureViewport } from "./viewport.ts";

describe("SFHS Pixi runtime diagnostics", () => {
  it("exposes one frozen CR API and leaves fixture state unchanged", async () => {
    const state = createInitialPixiMinimalFixtureState();
    const target = {};
    const installation = installFixtureDiagnostics(target, {
      getState: () => state,
      isRunning: () => false,
      getViewport: () => calculateFixtureViewport({ width: 384, height: 854, devicePixelRatio: 3.75 }),
      getAudioStatus: () => "locked"
    });

    expect(Object.keys(target)).toEqual([]);
    expect(Object.isFrozen(installation.api)).toBe(true);
    expect(installation.api.getSnapshot()).toMatchObject({
      schema: "sfhs.runtime@1",
      phase: "ready",
      running: false,
      player: { x: 240, y: 270 },
      orientation: "portrait",
      audio: "locked"
    });
    await expect(installation.api.runFullSelfCheck()).resolves.toMatchObject({ pass: true });
    expect(state).toEqual(createInitialPixiMinimalFixtureState());

    installation.dispose();
    expect(Reflect.has(target, "CR")).toBe(false);
  });

  it("fails honestly when audio is in a failed state", async () => {
    const installation = installFixtureDiagnostics({}, {
      getState: createInitialPixiMinimalFixtureState,
      isRunning: () => false,
      getViewport: () => calculateFixtureViewport({ width: 800, height: 600, devicePixelRatio: 1 }),
      getAudioStatus: () => "failed"
    });

    const result = await installation.api.runFullSelfCheck();
    expect(result.pass).toBe(false);
    expect(result.checks).toContainEqual({ name: "audio-not-failed", pass: false });
  });
});
