import { describe, expect, it } from "vitest";
import homeostasisFixture from "../fixtures/homeostasis-dual-render.json";
import { analyzeRendererSource, classifyRenderer, type RuntimeSurfaceEvidence } from "./index.ts";

const base = (id: string, contextType: RuntimeSurfaceEvidence["contextType"], overrides: Partial<RuntimeSurfaceEvidence> = {}): RuntimeSurfaceEvidence => ({
  id, tag: "CANVAS", contextType, creationOrder: 0, cssWidth: 800, cssHeight: 600, backingWidth: 800, backingHeight: 600,
  x: 0, y: 0, visible: true, opacity: 1, display: "block", zIndex: "auto", pointerEvents: "auto", domOrder: 0,
  changedPixels: 100, drawCount: 20, clearCount: 1, eventCount: 2, hitTest: true, resized: true, frameCallbacks: 1, ...overrides
});
const source = (text: string) => analyzeRendererSource(text);

describe("renderer classification", () => {
  it("inventories static renderer evidence", () => {
    const evidence = source(`document.createElement("canvas").getContext("2d"); new PIXI.Application(); requestAnimationFrame(draw); setInterval(render, 16); <svg>`);
    expect(evidence).toMatchObject({ canvas2d: 1, pixi: 1, svg: 1, canvasCreation: 1, animationFrames: 1, renderIntervals: 1 });
  });

  it.each([
    ["Canvas2D-only", source(`getContext("2d")`), [base("game", "2d")], "CANVAS_2D", "MIGRATION_REQUIRED"],
    ["Pixi-only", source("new PIXI.Application()"), [base("pixi", "webgl", { pixiOwned: true })], "PIXI", "ANALYSIS_PASS"],
    ["DOM-only", source("node.animate([])"), [base("dom", null, { tag: "DOM" })], "DOM", "BLOCKED_ON_UNSUPPORTED_RENDERER"],
    ["generic WebGL", source(`getContext("webgl")`), [base("gl", "webgl")], "WEBGL_GENERIC", "BLOCKED_ON_UNSUPPORTED_RENDERER"],
    ["intentional mixed", source("new PIXI.Application()"), [base("pixi", "webgl", { pixiOwned: true }), base("hud", null, { tag: "DOM", hitTest: false, domOrder: 1, changedPixels: 20 })], "MIXED_INTENTIONAL", "ANALYSIS_PASS"],
    ["visible Canvas2D over empty Pixi", source(`getContext("2d"); new PIXI.Application()`), [base("pixi", "webgl", { pixiOwned: true, drawCount: 0, clearCount: 20, changedPixels: 0, hitTest: false }), base("game", "2d", { domOrder: 1 })], "MIXED_REDUNDANT", "BLOCKED_ON_ADAPTER_MISMATCH"],
    ["hidden Canvas2D under Pixi", source(`getContext("2d"); new PIXI.Application()`), [base("legacy", "2d", { visible: false, hitTest: false }), base("pixi", "webgl", { pixiOwned: true, domOrder: 1 })], "PIXI", "ANALYSIS_PASS"],
    ["never changes", source(`getContext("2d")`), [base("idle", "2d", { drawCount: 0, clearCount: 0, changedPixels: 0 })], "UNKNOWN", "BLOCKED_ON_RENDERER_AMBIGUITY"],
    ["clears only", source("new PIXI.Application()"), [base("empty", "webgl", { pixiOwned: true, drawCount: 0, clearCount: 60, changedPixels: 0 })], "UNKNOWN", "BLOCKED_ON_RENDERER_AMBIGUITY"]
  ] as const)("classifies %s fail-closed", (_name, staticEvidence, surfaces, classification, verdict) => {
    expect(classifyRenderer(staticEvidence, surfaces)).toMatchObject({ classification, verdict });
  });

  it("blocks two active ambiguous canvases", () => {
    const result = classifyRenderer(source(`getContext("2d")`), [base("a", "2d"), base("b", "2d")]);
    expect(result).toMatchObject({ classification: "UNKNOWN", verdict: "BLOCKED_ON_RENDERER_AMBIGUITY" });
  });

  it("does not let a Pixi declaration override Canvas runtime evidence", () => {
    expect(classifyRenderer(source("new PIXI.Application()"), [base("actual", "2d")])).toMatchObject({ primary: { kind: "CANVAS_2D" }, verdict: "MIGRATION_REQUIRED" });
  });

  it("keeps the preserved HOMEOSTASIS dual-render arrangement blocked", () => {
    const result = classifyRenderer(source(homeostasisFixture.source), homeostasisFixture.surfaces as readonly RuntimeSurfaceEvidence[]);
    expect(result).toMatchObject({
      classification: homeostasisFixture.expected.classification,
      primary: { kind: homeostasisFixture.expected.primaryKind },
      secondary: [{ kind: homeostasisFixture.expected.secondaryKind, meaningful: homeostasisFixture.expected.secondaryMeaningful }],
      verdict: homeostasisFixture.expected.verdict
    });
  });
});
