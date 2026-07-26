import { describe, expect, it } from "vitest";
import { createSfhsPixiCanvasCompatContext, SfhsPixiCanvasStateError } from "./context.ts";

describe("unified SFHS Pixi Canvas compatibility context", () => {
  it("shares frozen transform and alpha state across geometry, image, and text", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.save(); context.translate(12, 4); context.rotate(Math.PI / 2); context.setGlobalAlpha(.35); context.fillRect(0, 0, 2, 2); context.drawImage("registered", 0, 0, 20, 10); context.fillText("state", 4, 5); context.restore(); context.fillRect(0, 0, 1, 1);
    const commands = context.endFrame(); const [geometry, image, text] = commands.filter((command) => command.operation !== "save" && command.operation !== "restore");
    expect(geometry!.state).toEqual(image!.state); expect(image!.state).toEqual(text!.state); expect(Object.isFrozen(image!.state)).toBe(true); expect(Object.isFrozen(image!.state.transform)).toBe(true); expect(image!.state.globalAlpha).toBe(.35); expect(image!.state.transform[0]).toBeCloseTo(0); expect(image!.state.transform[1]).toBeCloseTo(1); expect(image!.state.transform[2]).toBeCloseTo(-1); expect(image!.state.transform[3]).toBeCloseTo(0); expect(image!.state.transform.slice(4)).toEqual([12, 4]); expect(commands.at(-1)!.state.globalAlpha).toBe(1);
  });
  it("captures snapshots before later mutations and handles nested state", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.setFillStyle("red"); context.drawImage("sprite", 0, 0); context.save(); context.setFillStyle("blue"); context.scale(2, 3); context.fillText("inner", 2, 3); context.restore(); context.stroke(); const commands = context.getCommands();
    expect(commands.find((command) => command.operation === "drawImage")!.state.fillStyle).toBe("red"); expect(commands.find((command) => command.operation === "fillText")!.state.fillStyle).toBe("blue"); expect(commands.at(-1)!.state.fillStyle).toBe("red"); expect(context.getDiagnostics().currentSaveDepth).toBe(0); expect(context.getDiagnostics().maximumSaveDepth).toBe(1);
  });
  it("fails restore underflow and validates the image command shape", () => {
    const context = createSfhsPixiCanvasCompatContext(); expect(() => context.restore()).toThrow(SfhsPixiCanvasStateError); expect(() => context.drawImage("sprite", 1, 2, 3)).toThrow(SfhsPixiCanvasStateError);
  });

  it("captures immutable clip geometry at clip time and preserves nested save/restore intersections", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(1, 2, 30, 40); context.translate(9, 4); const outer = context.clip(); context.save(); context.beginPath(); context.moveTo(0, 0); context.lineTo(8, 0); context.lineTo(0, 8); context.closePath(); const inner = context.clip(); context.fillRect(0, 0, 1, 1); context.restore(); context.fillText("outer", 0, 0);
    const [innerDraw, outerDraw] = context.getCommands().filter((command) => command.operation === "fillRect" || command.operation === "fillText");
    expect(outer.path).toEqual([{ operation: "rect", values: [1, 2, 30, 40] }]); expect(outer.transform).toEqual([1, 0, 0, 1, 9, 4]); expect(inner.parents).toEqual([outer]); expect(innerDraw!.state.clips).toEqual([outer, inner]); expect(outerDraw!.state.clips).toEqual([outer]); expect(Object.isFrozen(innerDraw!.state.clips)).toBe(true); expect(Object.isFrozen(outer.path)).toBe(true);
  });
});
