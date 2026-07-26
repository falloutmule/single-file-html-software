import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { analyzeRendererSource, captureRuntimeSurfaces, classifyRenderer, installRuntimeRendererInstrumentation } from "./index.ts";

describe("runtime renderer instrumentation", () => {
  it("proves visible Canvas2D over clear-only Pixi-like WebGL is blocked", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 240 } });
      await installRuntimeRendererInstrumentation(page);
      const fixtureHtml = `<style>canvas{position:absolute;inset:0;width:320px;height:240px}</style><canvas id="pixi" data-pixi></canvas><canvas id="game"></canvas>`;
      await page.goto(`data:text/html,${encodeURIComponent(fixtureHtml)}`);
      await page.evaluate(() => {
        const pixi = document.querySelector<HTMLCanvasElement>("#pixi");
        const game = document.querySelector<HTMLCanvasElement>("#game");
        if (pixi === null || game === null) throw new Error("fixture canvases missing");
        pixi.getContext("webgl")?.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
        const context = game.getContext("2d");
        if (context === null) throw new Error("Canvas2D unavailable");
        context.fillStyle = "red";
        context.fillRect(0, 0, 100, 100);
      });
      const surfaces = await captureRuntimeSurfaces(page);
      const result = classifyRenderer(analyzeRendererSource(`new PIXI.Application(); canvas.getContext("2d")`), surfaces);
      expect(result).toMatchObject({ classification: "MIXED_REDUNDANT", primary: { id: "game", kind: "CANVAS_2D" }, verdict: "BLOCKED_ON_ADAPTER_MISMATCH" });
      expect(result.secondary).toContainEqual(expect.objectContaining({ id: "pixi", kind: "PIXI", meaningful: false, clearCount: 1 }));
    } finally {
      await browser.close();
    }
  });
});
