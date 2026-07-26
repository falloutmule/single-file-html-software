import { describe, expect, it } from "vitest";
import { createKeyboardActions, nativeFixtureScene } from "./game.ts";

describe("Pixi runtime native fixture", () => {
  it("uses semantic input and renderer-neutral immutable snapshots", () => {
    const target = new EventTarget(); const actions = createKeyboardActions(target);
    const event = new Event("keydown"); Object.defineProperty(event, "code", { value: "ArrowRight" }); target.dispatchEvent(event);
    const state = nativeFixtureScene.update(nativeFixtureScene.mount(), actions.sampleForStep(), 1 / 60);
    expect(state).toEqual({ x: 104, ticks: 1 }); expect(Object.isFrozen(nativeFixtureScene.snapshot(state))).toBe(true);
    actions.destroy();
  });
});
