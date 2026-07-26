import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { buildProject } from "@sfhs/builder";
import { startExactArtifactServer } from "@sfhs/browser-runner";
import { packIntermediate } from "@sfhs/packer";
import { describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-compat-geometry/", import.meta.url));

describe("Pixi compatibility geometry browser fixture", () => {
  it("uses browser Canvas as the drawImage source-rectangle oracle", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const samples = await page.evaluate(() => {
        const source = document.createElement("canvas"); source.width = 4; source.height = 1;
        const from = source.getContext("2d")!; from.fillStyle = "#ff0000"; from.fillRect(0, 0, 1, 1); from.fillStyle = "#00ff00"; from.fillRect(1, 0, 1, 1); from.fillStyle = "#0000ff"; from.fillRect(2, 0, 1, 1); from.fillStyle = "#ffffff"; from.fillRect(3, 0, 1, 1);
        const output = document.createElement("canvas"); output.width = 40; output.height = 10; const target = output.getContext("2d")!;
        target.drawImage(source, -1, 0, 3, 1, 0, 0, 30, 10); const pixel = (x: number) => Array.from(target.getImageData(x, 5, 1, 1).data);
        return [pixel(5), pixel(15), pixel(25), pixel(35)];
      });
      expect(samples).toEqual([[0, 0, 0, 0], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 0, 0]]);
    } finally { await browser.close(); }
  }, 30_000);

  it("presents geometry through one WebGL Pixi canvas and no Canvas2D context", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const server = await startExactArtifactServer(artifact.bytes); const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
      await page.addInitScript(() => {
        const prototype = HTMLCanvasElement.prototype as unknown as { getContext(...args: unknown[]): unknown };
        const original = prototype.getContext;
        const records: Array<{ readonly canvas: HTMLCanvasElement; readonly contexts: Set<string> }> = [];
        Object.defineProperty(window, "__SFHS_CONTEXT_REQUESTS__", { value: Object.freeze({ snapshot: () => records.map((record) => ({ connected: record.canvas.isConnected, width: record.canvas.getBoundingClientRect().width, height: record.canvas.getBoundingClientRect().height, contexts: [...record.contexts].sort() })) }) });
        prototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]) { const record = records.find((candidate) => candidate.canvas === this) ?? (() => { const created = { canvas: this, contexts: new Set<string>() }; records.push(created); return created; })(); record.contexts.add(String(args[0])); return original.apply(this, args); };
      });
      await page.goto(server.url); await page.waitForFunction(() => "CR" in window);
      const result = await page.evaluate(() => ({ snapshot: (window as unknown as { CR: { snapshot(): unknown } }).CR.snapshot(), canvases: (window as unknown as { __SFHS_CONTEXT_REQUESTS__: { snapshot(): unknown } }).__SFHS_CONTEXT_REQUESTS__.snapshot() as readonly { connected: boolean; width: number; height: number; contexts: readonly string[] }[] }));
      expect(result.snapshot).toMatchObject({ renderer: "PIXI", canvasCount: 1, canvasSize: { width: 320, height: 180 }, diagnostics: { graphicsAllocated: 1, graphicsReused: 1 }, assets: { texturesRegistered: 1, spritesAllocated: 1, textAllocated: 1, gradientsCreated: 2 }, assetLifecycle: { frames: 8, allocationsStable: true, capacitiesStable: true, diagnostics: { spriteCapacity: 1, textCapacity: 1 } }, unified: { commandsByFamily: { image: 2 } }, textures: { textureUploads: 3, activeTextureCount: 1, samplingVariantsCreated: 2 }, sampling: { distinctSources: true, reverseResolutionStable: true, orderIndependent: true, dirtyRefreshIndependent: true, nearestMode: "nearest", linearMode: "linear" }, gradientShapes: { transformedRadialCircle: true, transformedRadialEllipse: true, radialPixelsVary: true }, clipIntersection: { outsideLeft: true, inside: true, outsideRight: true, textWeight: "700" }, clipLifecycle: { releasedEveryMask: true, activeMasks: 0, activeScopes: 0 }, compatibility: { frames: 1, commandsLastFrame: 19, activeCompatibilityLayers: 1 } });
      const visible = result.canvases.filter((canvas) => canvas.connected && canvas.width > 0 && canvas.height > 0);
      expect(visible).toHaveLength(1); expect(visible[0]?.contexts).not.toContain("2d"); expect(visible[0]?.contexts.some((context) => context === "webgl" || context === "webgl2")).toBe(true); expect(server.servedRequestCount()).toBe(1);
    } finally { await browser.close(); await server.close(); }
  }, 30_000);
});
