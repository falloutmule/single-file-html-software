import { describe, expect, it } from "vitest";

import {
  advanceCollectorState,
  collectorPlayerRadius,
  collectorStarRadius,
  collectorStarX,
  collectorWidth,
  createInitialCollectorState,
  presentCollectorState,
  runCollectorStateSelfCheck
} from "./state";

describe("Hermes minimal import simulation", () => {
  it("moves at a fixed step and clamps to the logical view", () => {
    let state = createInitialCollectorState();
    state = advanceCollectorState(state, { left: true, right: false });
    expect(state.playerX).toBe(38);
    for (let index = 0; index < 300; index += 1) {
      state = advanceCollectorState(state, { left: false, right: true });
    }
    expect(state.playerX).toBe(collectorWidth - collectorPlayerRadius);
  });

  it("preserves the source fixture's one-star scoring behavior", () => {
    const nearStar = Object.freeze({
      ...createInitialCollectorState(),
      playerX: collectorStarX - collectorPlayerRadius - collectorStarRadius + 1
    });
    const collected = advanceCollectorState(nearStar, { left: false, right: false });
    const later = advanceCollectorState(collected, { left: false, right: false });
    expect(collected).toMatchObject({ starTaken: true, score: 1 });
    expect(later.score).toBe(1);
  });

  it("presents state without mutating simulation and passes its focused self-check", () => {
    const state = createInitialCollectorState();
    const scene = presentCollectorState(state);
    expect(scene.circles.map((circle) => circle.id)).toEqual(["star", "player"]);
    expect(state).toEqual(createInitialCollectorState());
    expect(Object.values(runCollectorStateSelfCheck()).every(Boolean)).toBe(true);
  });
});
