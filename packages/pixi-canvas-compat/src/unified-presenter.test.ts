import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createSfhsPixiCanvasCompatContext } from "./context.ts";
import { presentSfhsGradientShape, SfhsUnifiedPresentationError } from "./unified-presenter.ts";

describe("SFHS unified gradient shape presenter", () => {
  it("fails before mounting when a path ellipse cannot be represented exactly", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.fillRect(0, 0, 1, 1);
    const layer = new Container(); const state = context.getCommands().at(-1)!.state;
    expect(() => presentSfhsGradientShape(layer, state, {} as never, { kind: "path", operations: [{ operation: "ellipse", values: [0, 0, 4, 2, .1, 0, Math.PI * 2, 0] }] })).toThrow(SfhsUnifiedPresentationError);
    expect(layer.children).toHaveLength(0);
  });
});
