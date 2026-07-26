import { describe, expect, it } from "vitest";
import { createSfhsPixiCanvasCompatDiagnostics, SfhsCompatibilityBlockedError } from "./diagnostics.ts";

const command = { operation: "arc", x: 0, y: 0, radius: 1, startAngle: 0, endAngle: 1, counterclockwise: false, state: { globalAlpha: 1, fillStyle: "#000", strokeStyle: "#000", lineWidth: 1, lineCap: "butt" } } as const;
const frame = { commands: [command], geometry: { graphicsAllocated: 1, graphicsReused: 20, commandsLastFrame: 1, unsupportedOperationCount: 0, maximumSaveDepth: 2, activeSaveDepth: 0 }, assets: { texturesRegistered: 1, activeTextureCount: 1, textureUploads: 3, textureDestroys: 2, spritesAllocated: 2, spritesReused: 20, textAllocated: 1, textReused: 20, gradientsCreated: 2, gradientCacheHits: 18, activeSprites: 1, activeText: 1, spriteCapacity: 2, textCapacity: 1, clippedGraphicsAllocated: 0, clippedGraphicsDestroyed: 0, activeClippedGraphics: 0 }, presentationMilliseconds: 20, activeLayers: 1 } as const;

describe("SFHS Pixi compatibility diagnostics", () => {
  it("records command load, bounded object counts, lifecycle counts, and long frames", () => { const diagnostics = createSfhsPixiCanvasCompatDiagnostics(); for (let index = 0; index < 20; index += 1) diagnostics.recordFrame(frame); expect(diagnostics.snapshot()).toMatchObject({ frames: 20, commandsLastFrame: 1, commandsByFamily: { arc: 20 }, graphicsAllocated: 1, spritesAllocated: 2, textAllocated: 1, texturesCreated: 3, texturesDestroyed: 2, longFrameCount: 20, activeCompatibilityLayers: 1 }); });
  it("blocks with first-operation attribution", () => { const diagnostics = createSfhsPixiCanvasCompatDiagnostics(); expect(() => diagnostics.block({ operation: "clip", source: "legacy.ts:10", scene: "title" })).toThrow(SfhsCompatibilityBlockedError); expect(diagnostics.snapshot()).toMatchObject({ unsupportedOperationCount: 1, firstUnsupported: { operation: "clip", source: "legacy.ts:10", scene: "title" } }); });
});
