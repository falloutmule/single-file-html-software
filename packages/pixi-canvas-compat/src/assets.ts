import { FillGradient, Graphics, Sprite, Text, type BLEND_MODES, type Container, type Texture } from "pixi.js";
import { createSfhsCompatTextureRegistry, type SfhsCompatTextureRef } from "./texture-registry.ts";
import type { SfhsCompatClipDescriptor } from "./context.ts";
import type { SfhsCompatClipPresenter } from "./clip-presenter.ts";

export type SfhsImageSmoothing = "enabled" | "disabled";
export type SfhsTextAlign = "center";

export class SfhsPixiAssetCompatError extends Error {
  readonly code = "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES" as const;
  constructor(operation: string) { super(`SFHS Pixi asset compatibility does not support: ${operation}.`); this.name = "SfhsPixiAssetCompatError"; }
}

export interface SfhsAssetCompatDiagnostics {
  readonly texturesRegistered: number;
  readonly activeTextureCount: number;
  readonly textureUploads: number;
  readonly textureDestroys: number;
  readonly spritesAllocated: number;
  readonly spritesReused: number;
  readonly textAllocated: number;
  readonly textReused: number;
  readonly gradientsCreated: number;
  readonly gradientCacheHits: number;
  readonly activeSprites: number;
  readonly activeText: number;
  readonly spriteCapacity: number;
  readonly textCapacity: number;
  readonly clippedGraphicsAllocated: number;
  readonly clippedGraphicsDestroyed: number;
  readonly activeClippedGraphics: number;
}

export interface SfhsPixiCanvasAssetCompat {
  beginFrame(): void;
  registerTexture(id: string, texture: Texture): void;
  setImageSmoothing(value: SfhsImageSmoothing): void;
  setCompositeOperation(value: "multiply"): void;
  drawImage(id: string, dx: number, dy: number, dw?: number, dh?: number, clips?: readonly SfhsCompatClipDescriptor[]): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number, stops: readonly { readonly offset: number; readonly color: string | number }[]): FillGradient;
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, stops: readonly { readonly offset: number; readonly color: string | number }[]): FillGradient;
  fillGradientRect(gradient: FillGradient, x: number, y: number, width: number, height: number, clips?: readonly SfhsCompatClipDescriptor[]): void;
  setFont(value: "700 16px system-ui"): void;
  setTextAlign(value: SfhsTextAlign): void;
  fillText(value: string, x: number, y: number, color?: string | number, clips?: readonly SfhsCompatClipDescriptor[]): void;
  getDiagnostics(): SfhsAssetCompatDiagnostics;
  destroy(): void;
}

const gradientKey = (kind: string, values: readonly number[], stops: readonly { readonly offset: number; readonly color: string | number }[]) => `${kind}:${values.join(",")}:${stops.map((stop) => `${stop.offset}:${String(stop.color)}`).join("|")}`;
const gradientStops = (stops: readonly { readonly offset: number; readonly color: string | number }[]) => stops.map((stop) => ({ offset: stop.offset, color: typeof stop.color === "number" ? `#${stop.color.toString(16).padStart(6, "0")}` : stop.color }));

export function createSfhsPixiCanvasAssetCompat(options: { readonly layer: Container; readonly maximumCachedObjects?: number; readonly clipPresenter?: SfhsCompatClipPresenter }): SfhsPixiCanvasAssetCompat {
  const limit = options.maximumCachedObjects ?? 64;
  const textures = new Map<string, Texture>(); const textureRefs = new Map<string, SfhsCompatTextureRef>(); const textureRegistry = createSfhsCompatTextureRegistry(); const gradients = new Map<string, FillGradient>(); const sprites: Sprite[] = []; const text: Text[] = []; const gradientGraphics = options.layer.addChild(new Graphics()); const clippedGraphics: Graphics[] = [];
  let activeSprites = 0; let activeText = 0; let spritesAllocated = 0; let spritesReused = 0; let textAllocated = 0; let textReused = 0; let gradientsCreated = 0; let gradientCacheHits = 0; let clippedAllocated = 0; let clippedDestroyed = 0; let smoothing: SfhsImageSmoothing = "enabled"; let blendMode: BLEND_MODES = "normal"; let destroyed = false;
  const live = (): void => { if (destroyed) throw new Error("SFHS Pixi asset compatibility is destroyed."); };
  const target = (clips: readonly SfhsCompatClipDescriptor[] | undefined): Container => { if (clips === undefined || clips.length === 0) return options.layer; if (options.clipPresenter === undefined) throw new SfhsPixiAssetCompatError("materialized-clip-presenter"); return options.clipPresenter.mount(options.layer, clips); };
  const spriteAt = (index: number): Sprite => { const existing = sprites[index]; if (existing !== undefined) { spritesReused += 1; return existing; } if (sprites.length >= limit) throw new SfhsPixiAssetCompatError("sprite-cache-limit"); const created = options.layer.addChild(new Sprite()); sprites.push(created); spritesAllocated += 1; return created; };
  const textAt = (index: number): Text => { const existing = text[index]; if (existing !== undefined) { textReused += 1; return existing; } if (text.length >= limit) throw new SfhsPixiAssetCompatError("text-cache-limit"); const created = options.layer.addChild(new Text()); text.push(created); textAllocated += 1; return created; };
  const gradient = (kind: "linear" | "radial", values: readonly number[], stops: readonly { readonly offset: number; readonly color: string | number }[]): FillGradient => { const key = gradientKey(kind, values, stops); const cached = gradients.get(key); if (cached !== undefined) { gradientCacheHits += 1; return cached; } if (gradients.size >= limit) throw new SfhsPixiAssetCompatError("gradient-cache-limit"); if (stops.some((stop) => !Number.isFinite(stop.offset) || stop.offset < 0 || stop.offset > 1)) throw new SfhsPixiAssetCompatError("gradient-stop"); const colorStops = gradientStops(stops); const created = kind === "linear" ? new FillGradient({ type: "linear", start: { x: values[0]!, y: values[1]! }, end: { x: values[2]!, y: values[3]! }, colorStops }) : new FillGradient({ type: "radial", center: { x: values[0]!, y: values[1]! }, innerRadius: values[2]!, outerCenter: { x: values[3]!, y: values[4]! }, outerRadius: values[5]!, colorStops }); gradients.set(key, created); gradientsCreated += 1; return created; };
  const api: SfhsPixiCanvasAssetCompat = {
    beginFrame() { live(); activeSprites = 0; activeText = 0; gradientGraphics.clear(); for (const value of clippedGraphics) { value.destroy(); clippedDestroyed += 1; } clippedGraphics.length = 0; for (const value of sprites) value.visible = false; for (const value of text) value.visible = false; },
    registerTexture(id, texture) { live(); if (id.length === 0) throw new SfhsPixiAssetCompatError("texture-id"); const previous = textureRefs.get(id); if (previous !== undefined) textureRegistry.release(previous); textures.set(id, texture); textureRefs.set(id, textureRegistry.registerTexture(`asset-compat:${id}`, texture, { owner: "pixi-canvas-asset-compat", purpose: `registered texture ${id}`, origin: "embedded", updatePolicy: "static" })); },
    setImageSmoothing(value) { live(); smoothing = value; },
    setCompositeOperation(value) { live(); blendMode = value; },
    drawImage(id, dx, dy, dw, dh, clips) { live(); if (!textures.has(id)) throw new SfhsPixiAssetCompatError(`texture:${id}`); const ref = textureRefs.get(id); if (ref === undefined) throw new SfhsPixiAssetCompatError(`texture-ref:${id}`); const sprite = spriteAt(activeSprites++); target(clips).addChild(sprite); sprite.texture = textureRegistry.resolveVariant(ref, smoothing === "enabled" ? "linear" : "nearest"); sprite.position.set(dx, dy); if (dw !== undefined) sprite.width = dw; if (dh !== undefined) sprite.height = dh; sprite.blendMode = blendMode; sprite.visible = true; },
    createLinearGradient(x0, y0, x1, y1, stops) { live(); return gradient("linear", [x0, y0, x1, y1], stops); },
    createRadialGradient(x0, y0, r0, x1, y1, r1, stops) { live(); return gradient("radial", [x0, y0, r0, x1, y1, r1], stops); },
    fillGradientRect(value, x, y, width, height, clips) { live(); const graphics = clips === undefined || clips.length === 0 ? gradientGraphics : target(clips).addChild(new Graphics()); if (graphics !== gradientGraphics) { clippedGraphics.push(graphics); clippedAllocated += 1; } graphics.rect(x, y, width, height).fill(value); graphics.blendMode = blendMode; },
    setFont(value) { live(); if (value !== "700 16px system-ui") throw new SfhsPixiAssetCompatError("font"); },
    setTextAlign(value) { live(); if (value !== "center") throw new SfhsPixiAssetCompatError("textAlign"); },
    fillText(value, x, y, color = "#ffffff", clips) { live(); const textTarget = textAt(activeText++); target(clips).addChild(textTarget); textTarget.text = value; textTarget.style = { fontFamily: "system-ui", fontSize: 16, fontWeight: "700", fill: color }; textTarget.anchor.set(0.5, 0); textTarget.position.set(x, y); textTarget.blendMode = blendMode; textTarget.visible = true; },
    getDiagnostics: () => { const textureDiagnostics = textureRegistry.getDiagnostics(); return Object.freeze({ texturesRegistered: textures.size, activeTextureCount: textureDiagnostics.activeTextureCount, textureUploads: textureDiagnostics.textureUploads, textureDestroys: textureDiagnostics.destroyedTextureCount, spritesAllocated, spritesReused, textAllocated, textReused, gradientsCreated, gradientCacheHits, activeSprites, activeText, spriteCapacity: sprites.length, textCapacity: text.length, clippedGraphicsAllocated: clippedAllocated, clippedGraphicsDestroyed: clippedDestroyed, activeClippedGraphics: clippedGraphics.length }); },
    destroy() { if (destroyed) return; gradientGraphics.destroy(); for (const value of clippedGraphics) { value.destroy(); clippedDestroyed += 1; } clippedGraphics.length = 0; for (const value of sprites) value.destroy(); for (const value of text) value.destroy(); for (const value of gradients.values()) value.destroy(); gradients.clear(); textureRegistry.destroy(); textureRefs.clear(); textures.clear(); destroyed = true; }
  };
  return Object.freeze(api);
}
