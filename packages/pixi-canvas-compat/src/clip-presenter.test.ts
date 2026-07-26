import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createSfhsCompatClipPresenter, SfhsClipPresentationError } from "./clip-presenter.ts";
import { createSfhsPixiCanvasCompatContext } from "./context.ts";

const clips = () => {
  const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(0, 0, 20, 20); context.translate(4, 3); context.clip(); context.save(); context.beginPath(); context.rect(2, 2, 10, 10); context.clip(); context.fillRect(0, 0, 1, 1); return context.getCommands().at(-1)!.state.clips;
};

describe("materialized SFHS Pixi clip presenter", () => {
  it("creates scope-owned nested masks so simultaneous intersections cannot reparent each other", () => {
    const presenter = createSfhsCompatClipPresenter(); const layer = new Container(); const first = presenter.mount(layer, clips()); const second = presenter.mount(layer, clips());
    expect(first.parent).not.toBe(layer); expect(second.parent).not.toBe(layer); expect(first.parent?.mask).not.toBe(second.parent?.mask); expect(presenter.getDiagnostics()).toEqual({ masksCreated: 4, masksReused: 0, masksDestroyed: 0, activeMasks: 4, activeScopes: 4 }); presenter.beginFrame(); expect(presenter.getDiagnostics()).toEqual({ masksCreated: 4, masksReused: 0, masksDestroyed: 4, activeMasks: 0, activeScopes: 0 }); expect(layer.children).toHaveLength(0); presenter.destroy();
  });

  it("fails closed for an evenodd descriptor rather than silently changing clip meaning", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(0, 0, 4, 4); context.clip("evenodd"); context.fillRect(0, 0, 1, 1);
    expect(() => createSfhsCompatClipPresenter().mount(new Container(), context.getCommands().at(-1)!.state.clips)).toThrow(SfhsClipPresentationError);
  });
});
