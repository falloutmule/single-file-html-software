import { Container, Texture } from "pixi.js";
import { describe, expect, it } from "vitest";
import { createSfhsPixiCanvasAssetCompat, SfhsPixiAssetCompatError } from "./assets.ts";
import { createSfhsCompatClipPresenter } from "./clip-presenter.ts";
import { createSfhsPixiCanvasCompatContext } from "./context.ts";

describe("SFHS Pixi Canvas asset compatibility", () => {
  it("owns registered textures and reuses bounded sprites and gradient descriptors", () => {
    const assets = createSfhsPixiCanvasAssetCompat({ layer: new Container(), maximumCachedObjects: 2 });
    assets.registerTexture("white", Texture.WHITE); assets.beginFrame(); assets.setImageSmoothing("disabled"); assets.setCompositeOperation("multiply"); assets.drawImage("white", 1, 2, 3, 4); assets.drawImage("white", 5, 6);
    const a = assets.createLinearGradient(0, 0, 10, 0, [{ offset: 0, color: "#fff" }, { offset: 1, color: 0 }]); const b = assets.createLinearGradient(0, 0, 10, 0, [{ offset: 0, color: "#fff" }, { offset: 1, color: 0 }]);
    expect(a).toBe(b); expect(assets.getDiagnostics()).toMatchObject({ texturesRegistered: 1, spritesAllocated: 2, gradientCacheHits: 1, activeSprites: 2 });
  });

  it("fails closed for unknown textures, unsupported font, and cache overflow", () => {
    const assets = createSfhsPixiCanvasAssetCompat({ layer: new Container(), maximumCachedObjects: 1 }); assets.beginFrame();
    expect(() => assets.drawImage("unknown", 0, 0)).toThrow(SfhsPixiAssetCompatError);
    expect(() => assets.setFont("400 12px serif" as never)).toThrow(SfhsPixiAssetCompatError);
    assets.registerTexture("white", Texture.WHITE); assets.drawImage("white", 0, 0); expect(() => assets.drawImage("white", 1, 1)).toThrow(SfhsPixiAssetCompatError);
  });

  it("routes image and text through one materialized clip presenter", () => {
    const context = createSfhsPixiCanvasCompatContext(); context.beginFrame(); context.beginPath(); context.rect(0, 0, 10, 10); context.clip(); context.fillRect(0, 0, 1, 1); const clips = context.getCommands().at(-1)!.state.clips;
    const presenter = createSfhsCompatClipPresenter(); const assets = createSfhsPixiCanvasAssetCompat({ layer: new Container(), clipPresenter: presenter }); assets.registerTexture("white", Texture.WHITE); assets.beginFrame(); assets.drawImage("white", 0, 0, 2, 2, clips); assets.fillText("clip", 1, 1, "#fff", clips);
    expect(presenter.getDiagnostics().masksCreated).toBe(2); assets.destroy(); presenter.destroy();
  });

  it("keeps image and text allocations bounded across repeated compatibility frames", () => {
    const assets = createSfhsPixiCanvasAssetCompat({ layer: new Container(), maximumCachedObjects: 2 });
    assets.registerTexture("white", Texture.WHITE);
    for (let frame = 0; frame < 8; frame += 1) {
      assets.beginFrame(); assets.drawImage("white", frame, 0, 3, 4); assets.fillText(`frame-${frame}`, 8, 9);
    }
    expect(assets.getDiagnostics()).toMatchObject({ spritesAllocated: 1, textAllocated: 1, spritesReused: 7, textReused: 7, spriteCapacity: 1, textCapacity: 1, activeSprites: 1, activeText: 1 });
    assets.destroy();
    expect(() => assets.beginFrame()).toThrow("destroyed");
  });

  it("bounds gradient descriptors instead of allowing unbounded presentation cache growth", () => {
    const assets = createSfhsPixiCanvasAssetCompat({ layer: new Container(), maximumCachedObjects: 1 });
    assets.createLinearGradient(0, 0, 10, 0, [{ offset: 0, color: "#fff" }, { offset: 1, color: "#000" }]);
    expect(() => assets.createLinearGradient(0, 1, 10, 1, [{ offset: 0, color: "#fff" }, { offset: 1, color: "#000" }])).toThrow(SfhsPixiAssetCompatError);
    assets.destroy();
  });
});
