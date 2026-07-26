import type { SfhsAssetCompatDiagnostics } from "./assets.ts";
import type { SfhsGeometryCompatDiagnostics, GeometryCommand } from "./index.ts";

export interface SfhsCompatAttribution { readonly operation: string; readonly source: string; readonly scene: string; }
export interface SfhsCompatFrameInput { readonly commands: readonly GeometryCommand[]; readonly geometry: SfhsGeometryCompatDiagnostics; readonly assets: SfhsAssetCompatDiagnostics; readonly presentationMilliseconds: number; readonly activeLayers: number; }
export interface SfhsCompatDiagnosticsSnapshot {
  readonly frames: number; readonly commandsLastFrame: number; readonly commandsByFamily: Readonly<Record<string, number>>;
  readonly graphicsAllocated: number; readonly graphicsReused: number; readonly spritesAllocated: number; readonly spritesReused: number; readonly textAllocated: number; readonly textReused: number;
  readonly texturesCreated: number; readonly texturesDestroyed: number; readonly gradientCacheHits: number; readonly gradientCacheMisses: number; readonly maskCount: number; readonly renderTextureCount: number;
  readonly unsupportedOperationCount: number; readonly maximumSaveDepth: number; readonly presentationMilliseconds: number; readonly longFrameCount: number; readonly activeCompatibilityLayers: number; readonly firstUnsupported?: SfhsCompatAttribution;
}

export class SfhsCompatibilityBlockedError extends Error {
  readonly code = "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES" as const;
  readonly attribution: SfhsCompatAttribution;
  constructor(attribution: SfhsCompatAttribution) { super(`Unsupported Canvas operation ${attribution.operation} at ${attribution.source} in ${attribution.scene}.`); this.name = "SfhsCompatibilityBlockedError"; this.attribution = attribution; }
}

export function createSfhsPixiCanvasCompatDiagnostics(options: { readonly longFrameMilliseconds?: number; readonly enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true; const longFrameMilliseconds = options.longFrameMilliseconds ?? 16.7;
  let frames = 0; let commandsLastFrame = 0; let presentationMilliseconds = 0; let longFrameCount = 0; let unsupportedOperationCount = 0; let firstUnsupported: SfhsCompatAttribution | undefined;
  const commandsByFamily = new Map<string, number>(); let latest: Omit<SfhsCompatDiagnosticsSnapshot, "frames" | "commandsLastFrame" | "commandsByFamily" | "presentationMilliseconds" | "longFrameCount" | "unsupportedOperationCount" | "firstUnsupported"> | undefined;
  const snapshot = (): SfhsCompatDiagnosticsSnapshot => Object.freeze({ frames, commandsLastFrame, commandsByFamily: Object.freeze(Object.fromEntries([...commandsByFamily.entries()].sort())), presentationMilliseconds, longFrameCount, unsupportedOperationCount, ...(firstUnsupported === undefined ? {} : { firstUnsupported }), ...(latest ?? { graphicsAllocated: 0, graphicsReused: 0, spritesAllocated: 0, spritesReused: 0, textAllocated: 0, textReused: 0, texturesCreated: 0, texturesDestroyed: 0, gradientCacheHits: 0, gradientCacheMisses: 0, maskCount: 0, renderTextureCount: 0, maximumSaveDepth: 0, activeCompatibilityLayers: 0 }) });
  return Object.freeze({
    recordFrame(input: SfhsCompatFrameInput): void { if (!enabled) return; frames += 1; commandsLastFrame = input.commands.length; presentationMilliseconds = input.presentationMilliseconds; if (input.presentationMilliseconds > longFrameMilliseconds) longFrameCount += 1; for (const command of input.commands) commandsByFamily.set(command.operation, (commandsByFamily.get(command.operation) ?? 0) + 1); latest = { graphicsAllocated: input.geometry.graphicsAllocated, graphicsReused: input.geometry.graphicsReused, spritesAllocated: input.assets.spritesAllocated, spritesReused: input.assets.spritesReused, textAllocated: input.assets.textAllocated, textReused: input.assets.textReused, texturesCreated: input.assets.textureUploads, texturesDestroyed: input.assets.textureDestroys, gradientCacheHits: input.assets.gradientCacheHits, gradientCacheMisses: input.assets.gradientsCreated - input.assets.gradientCacheHits, maskCount: 0, renderTextureCount: 0, maximumSaveDepth: input.geometry.maximumSaveDepth, activeCompatibilityLayers: input.activeLayers }; },
    block(attribution: SfhsCompatAttribution): never { unsupportedOperationCount += 1; firstUnsupported ??= Object.freeze({ ...attribution }); throw new SfhsCompatibilityBlockedError(attribution); },
    snapshot
  });
}
