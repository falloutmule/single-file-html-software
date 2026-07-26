import { describe, expect, it } from "vitest";
import { createSfhsPixiCanvasGeometryCompat, implementedGeometryOperations, SfhsUnsupportedCanvasOperationError, type SfhsGeometryGraphics } from "./index.ts";
import { Container } from "pixi.js";
import { createSfhsCompatClipPresenter } from "./clip-presenter.ts";
import { createSfhsPixiCanvasCompatContext } from "./context.ts";

class SpyGraphics implements SfhsGeometryGraphics {
  readonly calls: string[] = [];
  clear() { this.calls.push("clear"); return this; } save() { this.calls.push("save"); return this; } restore() { this.calls.push("restore"); return this; }
  beginPath() { this.calls.push("beginPath"); return this; } closePath() { this.calls.push("closePath"); return this; }
  moveTo(x: number, y: number) { this.calls.push(`moveTo:${x},${y}`); return this; } lineTo(x: number, y: number) { this.calls.push(`lineTo:${x},${y}`); return this; }
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) { this.calls.push(`quadratic:${cpx},${cpy},${x},${y}`); return this; }
  arc(x: number, y: number, radius: number) { this.calls.push(`arc:${x},${y},${radius}`); return this; }
  ellipse(x: number, y: number, radiusX: number, radiusY: number) { this.calls.push(`ellipse:${x},${y},${radiusX},${radiusY}`); return this; }
  rect(x: number, y: number, width: number, height: number) { this.calls.push(`rect:${x},${y},${width},${height}`); return this; }
  fill(style: { readonly color: unknown; readonly alpha: number }) { this.calls.push(`fill:${String(style.color)}:${style.alpha}`); return this; }
  stroke(style: { readonly color: unknown; readonly alpha: number; readonly width: number; readonly cap: string }) { this.calls.push(`stroke:${String(style.color)}:${style.alpha}:${style.width}:${style.cap}`); return this; }
  translateTransform(x: number, y: number) { this.calls.push(`translate:${x},${y}`); return this; } rotateTransform(angle: number) { this.calls.push(`rotate:${angle}`); return this; }
  scaleTransform(x: number, y?: number) { this.calls.push(`scale:${x},${y ?? x}`); return this; }
  setTransform(a: number, b: number, c: number, d: number, dx: number, dy: number) { this.calls.push(`matrix:${a},${b},${c},${d},${dx},${dy}`); return this; }
  resetTransform() { this.calls.push("resetTransform"); return this; } destroy() { this.calls.push("destroy"); }
}

describe("SFHS Pixi Canvas geometry compatibility", () => {
  it("declares only the approved B1 geometry subset", () => {
    expect(implementedGeometryOperations).toEqual(["arc", "beginPath", "closePath", "ellipse", "fill", "fillRect", "fillStyle", "globalAlpha", "lineCap", "lineTo", "lineWidth", "moveTo", "quadraticCurveTo", "restore", "rotate", "save", "scale", "setTransform", "stroke", "strokeRect", "strokeStyle", "translate"]);
  });

  it("buffers and replays Canvas-style state, paths, transforms, fills, and strokes through one Graphics object", () => {
    const graphics = new SpyGraphics(); const compat = createSfhsPixiCanvasGeometryCompat({ graphics });
    compat.beginFrame(); compat.save(); compat.setGlobalAlpha(0.4); compat.setFillStyle("#22d3ee"); compat.translate(5, 7); compat.beginPath(); compat.moveTo(0, 0); compat.quadraticCurveTo(2, 3, 5, 6); compat.arc(8, 9, 4, 0, Math.PI); compat.closePath(); compat.fill(); compat.restore(); compat.setStrokeStyle("#ffffff"); compat.setLineWidth(3); compat.setLineCap("round"); compat.strokeRect(1, 2, 3, 4); compat.present();
    expect(graphics.calls).toEqual(expect.arrayContaining(["clear", "resetTransform", "save", "translate:5,7", "moveTo:0,0", "quadratic:2,3,5,6", "arc:8,9,4", "fill:#22d3ee:0.4", "restore", "rect:1,2,3,4", "stroke:#ffffff:1:3:round"]));
    expect(compat.getDiagnostics()).toMatchObject({ graphicsAllocated: 1, graphicsReused: 1, activeSaveDepth: 0, maximumSaveDepth: 1 });
  });

  it("preserves transform command order and resets bounded frame state", () => {
    const graphics = new SpyGraphics(); const compat = createSfhsPixiCanvasGeometryCompat({ graphics });
    compat.beginFrame(); compat.translate(2, 3); compat.rotate(0.5); compat.scale(4, 5); compat.setTransform(1, 0, 0, 1, 9, 10); compat.fillRect(0, 0, 1, 1); compat.present();
    expect(graphics.calls).toEqual(expect.arrayContaining(["translate:2,3", "rotate:0.5", "scale:4,5", "matrix:1,0,0,1,9,10", "rect:0,0,1,1"]));
    compat.beginFrame(); expect(compat.getCommands()).toEqual([]); expect(compat.getDiagnostics().activeSaveDepth).toBe(0);
  });

  it("fails closed on unsupported operations and save-stack underflow", () => {
    const compat = createSfhsPixiCanvasGeometryCompat({ graphics: new SpyGraphics() });
    expect(() => compat.restore()).toThrow(SfhsUnsupportedCanvasOperationError);
    expect(() => compat.unsupported("clip")).toThrow(SfhsUnsupportedCanvasOperationError);
    expect(compat.getDiagnostics().unsupportedOperationCount).toBe(1);
  });

  it("reuses one graphics object across frames and cleans up", () => {
    const graphics = new SpyGraphics(); const compat = createSfhsPixiCanvasGeometryCompat({ graphics });
    for (let frame = 0; frame < 3; frame += 1) { compat.beginFrame(); compat.fillRect(frame, 0, 1, 1); compat.present(); }
    expect(compat.getDiagnostics()).toMatchObject({ graphicsAllocated: 1, graphicsReused: 3, commandsLastFrame: 1 });
    compat.destroy(); expect(graphics.calls).toContain("destroy"); expect(() => compat.beginFrame()).toThrow("destroyed");
  });

  it("mounts geometry through the shared materialized clip presenter", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(0, 0, 4, 4); context.clip(); context.fillRect(0, 0, 1, 1); const layer = new Container(); const presenter = createSfhsCompatClipPresenter(); const compat = createSfhsPixiCanvasGeometryCompat({ layer }); compat.beginFrame(); compat.fillRect(0, 0, 2, 2); compat.present(context.getCommands().at(-1)!.state.clips, presenter); expect(presenter.getDiagnostics().masksCreated).toBe(1); presenter.destroy(); compat.destroy();
  });

  it("fails closed when a custom graphics backend cannot be mounted into a materialized clip", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(0, 0, 4, 4); context.clip(); context.fillRect(0, 0, 1, 1); const compat = createSfhsPixiCanvasGeometryCompat({ graphics: new SpyGraphics() }); compat.beginFrame(); compat.fillRect(0, 0, 1, 1); expect(() => compat.present(context.getCommands().at(-1)!.state.clips, createSfhsCompatClipPresenter())).toThrow(SfhsUnsupportedCanvasOperationError);
  });
});
