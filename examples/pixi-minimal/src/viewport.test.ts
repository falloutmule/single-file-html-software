import { describe, expect, it } from "vitest";

import {
  calculateFixtureViewport,
  createFixtureViewportController,
  type FixtureViewportElement,
  type FixtureViewportSource,
  type FixtureWindowViewportSource
} from "./viewport.ts";

class FakeVisualViewport extends EventTarget implements FixtureViewportSource {
  width = 384;
  height = 854;
  offsetLeft = 0;
  offsetTop = 0;
}

class FakeWindowViewport extends EventTarget implements FixtureWindowViewportSource {
  innerWidth = 800;
  innerHeight = 600;
  devicePixelRatio = 3.75;
  readonly visualViewport = new FakeVisualViewport();
}

function fakeElement(): FixtureViewportElement & { readonly properties: Map<string, string> } {
  const properties = new Map<string, string>();
  return {
    dataset: {},
    properties,
    style: {
      setProperty(name, value): void {
        properties.set(name, value ?? "");
      }
    }
  };
}

describe("SFHS Pixi mobile viewport", () => {
  it("calculates fixed-contain portrait and landscape snapshots with capped DPR", () => {
    const portrait = calculateFixtureViewport({ width: 384, height: 854, devicePixelRatio: 3.75 });
    const landscape = calculateFixtureViewport({ width: 854, height: 384, devicePixelRatio: 3.75 });

    expect(portrait).toMatchObject({
      orientation: "portrait",
      logicalWidth: 960,
      logicalHeight: 540,
      resolution: 2,
      containedWidth: 384,
      containedHeight: 216
    });
    expect(landscape).toMatchObject({
      orientation: "landscape",
      resolution: 2,
      containedHeight: 384
    });
    expect(landscape.containedWidth).toBeCloseTo(682.666_667);
    expect(Object.isFrozen(portrait)).toBe(true);
  });

  it("uses visualViewport values, updates CSS state, and stops after disposal", () => {
    const windowSource = new FakeWindowViewport();
    const element = fakeElement();
    const changes: string[] = [];
    const controller = createFixtureViewportController({
      element,
      windowSource,
      onChange: (snapshot) => changes.push(snapshot.orientation)
    });

    expect(controller.getSnapshot().viewportWidth).toBe(384);
    expect(element.dataset.orientation).toBe("portrait");
    expect(element.properties.get("--sfhs-visual-viewport-height")).toBe("854px");

    windowSource.visualViewport.width = 854;
    windowSource.visualViewport.height = 384;
    windowSource.visualViewport.dispatchEvent(new Event("resize"));
    expect(controller.getSnapshot().orientation).toBe("landscape");
    expect(changes).toEqual(["portrait", "landscape"]);

    controller.dispose();
    windowSource.visualViewport.width = 500;
    windowSource.visualViewport.dispatchEvent(new Event("resize"));
    expect(controller.getSnapshot().viewportWidth).toBe(854);
  });
});
