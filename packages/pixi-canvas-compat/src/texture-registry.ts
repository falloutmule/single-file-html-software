import { Matrix, Rectangle, Sprite, Texture, type Container, type TextureSource } from "pixi.js";
import type { SfhsPixiCanvasCommand } from "./context.ts";
import type { SfhsCompatClipPresenter } from "./clip-presenter.ts";

export type SfhsCanvasSourceOrigin = "generated" | "embedded" | "imported";
export type SfhsCanvasSourceUpdatePolicy = "static" | "explicit-dirty";

export interface SfhsCanvasSourceRegistration {
  readonly owner: string;
  readonly purpose: string;
  readonly origin: SfhsCanvasSourceOrigin;
  readonly updatePolicy: SfhsCanvasSourceUpdatePolicy;
  readonly expectedWidth: number;
  readonly expectedHeight: number;
  readonly sourceHash?: string;
}

export interface SfhsCompatTextureRef { readonly id: string; readonly owner: string; readonly generation: number; }
export interface SfhsCompatTextureDiagnostics {
  readonly registeredSourceCount: number; readonly activeTextureCount: number; readonly sourcesByOwner: Readonly<Record<string, number>>; readonly sourcesByOrigin: Readonly<Record<string, number>>; readonly sourcesByUpdatePolicy: Readonly<Record<string, number>>;
  readonly textureUploads: number; readonly textureRefreshes: number; readonly cacheHits: number; readonly cacheMisses: number; readonly samplingVariantsCreated: number; readonly samplingVariantsReused: number; readonly samplingVariantsInvalidated: number; readonly samplingVariantsDestroyed: number; readonly visibleSourceRejections: number; readonly unattributedSourceRejections: number; readonly policyViolations: number; readonly individualReleases: number; readonly ownerCleanupCount: number; readonly destroyedTextureCount: number; readonly borrowedTextureCount: number; readonly leakedOwnerCount: number;
}

export interface SfhsCompatTextureRegistry {
  registerCanvasSource(source: HTMLCanvasElement, metadata: SfhsCanvasSourceRegistration): SfhsCompatTextureRef;
  registerTexture(id: string, texture: Texture, metadata: Omit<SfhsCanvasSourceRegistration, "expectedWidth" | "expectedHeight"> & Partial<Pick<SfhsCanvasSourceRegistration, "expectedWidth" | "expectedHeight">>): SfhsCompatTextureRef;
  markDirty(ref: SfhsCompatTextureRef): void; resolve(ref: SfhsCompatTextureRef): Texture; resolveVariant(ref: SfhsCompatTextureRef, smoothing: "linear" | "nearest"): Texture; getGeneration(ref: SfhsCompatTextureRef): number; release(ref: SfhsCompatTextureRef): void; destroyOwner(owner: string): void; destroy(): void; getDiagnostics(): SfhsCompatTextureDiagnostics;
}

export interface SfhsResolvedDrawImage {
  readonly texture: Texture; readonly sourceId: string; readonly sourceGeneration: number; readonly source: readonly [number, number, number, number] | undefined; readonly destination: readonly [number, number, number, number]; readonly isNoOp: boolean; readonly state: SfhsPixiCanvasCommand["state"];
}
export interface SfhsDrawImageMatrix { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly tx: number; readonly ty: number; }
export interface SfhsDrawImagePresenter {
  present(layer: Container, image: SfhsResolvedDrawImage, clipPresenter?: SfhsCompatClipPresenter): Sprite | undefined;
  destroy(): void;
  getDiagnostics(): Readonly<{ readonly croppedTexturesCreated: number; readonly croppedTexturesReused: number; readonly croppedTexturesDestroyed: number }>;
}

export class SfhsCanvasSourceRegistryError extends Error {
  readonly code: "BLOCKED_ON_VISIBLE_CANVAS_SOURCE" | "BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE" | "BLOCKED_ON_TEXTURE_LIFECYCLE" | "BLOCKED_ON_DRAWIMAGE_PARITY";
  constructor(code: SfhsCanvasSourceRegistryError["code"], message: string) { super(message); this.name = "SfhsCanvasSourceRegistryError"; this.code = code; }
}

type SourceLike = { readonly nodeName?: string; readonly isConnected?: boolean; readonly width?: number; readonly height?: number; };
type Entry = { id: string; readonly source: object | undefined; readonly metadata: SfhsCanvasSourceRegistration; readonly borrowed: boolean; texture: Texture | undefined; readonly variants: Map<string, Texture>; dirty: boolean; generation: number; references: number; readonly owners: Map<string, number>; };
const metadataKey = (value: SfhsCanvasSourceRegistration): string => [value.owner, value.purpose, value.origin, value.updatePolicy, value.expectedWidth, value.expectedHeight, value.sourceHash ?? ""].join("|");
const ensureMetadata = (value: SfhsCanvasSourceRegistration): void => { if (!value.owner.trim() || !value.purpose.trim() || value.expectedWidth <= 0 || value.expectedHeight <= 0) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE", "Canvas texture sources require non-empty owner, purpose, and positive expected dimensions."); };
const frozenRef = (entry: Entry): SfhsCompatTextureRef => Object.freeze({ id: entry.id, owner: entry.metadata.owner, generation: entry.generation });

export function createSfhsCompatTextureRegistry(options: { readonly textureFrom?: (source: HTMLCanvasElement) => Texture; readonly variantFrom?: (base: Texture, smoothing: "linear" | "nearest") => Texture; } = {}): SfhsCompatTextureRegistry {
  const bySource = new WeakMap<object, Entry>(); const byId = new Map<string, Entry>(); let next = 1; let destroyed = false;
  let uploads = 0; let refreshes = 0; let hits = 0; let misses = 0; let variantsCreated = 0; let variantsReused = 0; let variantsInvalidated = 0; let variantsDestroyed = 0; let visibleRejections = 0; let attributionRejections = 0; let policyViolations = 0; let releases = 0; let ownerCleanups = 0; let destroyedTextures = 0; let borrowedTextures = 0;
  const live = (): void => { if (destroyed) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Texture registry is destroyed."); };
  const entryFor = (ref: SfhsCompatTextureRef): Entry => { const entry = byId.get(ref.id); if (entry === undefined || entry.metadata.owner !== ref.owner) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Unknown or foreign texture reference."); return entry; };
  const addReference = (entry: Entry): SfhsCompatTextureRef => { entry.references += 1; entry.owners.set(entry.metadata.owner, (entry.owners.get(entry.metadata.owner) ?? 0) + 1); return frozenRef(entry); };
  const destroyVariants = (entry: Entry, reason: "refresh" | "cleanup"): void => { for (const texture of entry.variants.values()) { texture.destroy(true); destroyedTextures += 1; variantsDestroyed += 1; if (reason === "refresh") variantsInvalidated += 1; } entry.variants.clear(); };
  const destroyEntry = (entry: Entry): void => { byId.delete(entry.id); if (entry.source !== undefined) bySource.delete(entry.source); destroyVariants(entry, "cleanup"); if (!entry.borrowed && entry.texture !== undefined) { entry.texture.destroy(true); destroyedTextures += 1; } entry.texture = undefined; };
  const register = (source: object | undefined, texture: Texture | undefined, metadata: SfhsCanvasSourceRegistration, borrowed: boolean): SfhsCompatTextureRef => {
    live(); try { ensureMetadata(metadata); } catch (error) { attributionRejections += 1; throw error; }
    const existing = source === undefined ? undefined : bySource.get(source);
    if (existing !== undefined) { if (metadataKey(existing.metadata) !== metadataKey(metadata)) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE", "A Canvas source cannot be registered with conflicting attribution or update policy."); return addReference(existing); }
    const entry: Entry = { id: `sfhs-texture-${next++}`, source, metadata, borrowed, texture, variants: new Map(), dirty: false, generation: 0, references: 0, owners: new Map() }; byId.set(entry.id, entry); if (source !== undefined) bySource.set(source, entry); if (borrowed) borrowedTextures += 1; return addReference(entry);
  };
  const api: SfhsCompatTextureRegistry = {
    registerCanvasSource(source, metadata) { const candidate = source as unknown as SourceLike; if (candidate.nodeName !== "CANVAS" || typeof candidate.width !== "number" || typeof candidate.height !== "number") throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE", "Only generated HTMLCanvasElement sources are supported by this task."); if (candidate.isConnected) { visibleRejections += 1; throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_VISIBLE_CANVAS_SOURCE", "Connected Canvas sources cannot be registered as SFHS texture assets."); } if (candidate.width !== metadata.expectedWidth || candidate.height !== metadata.expectedHeight) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "Canvas source dimensions must match its attributed expected dimensions."); return register(source, undefined, metadata, false); },
    registerTexture(id, texture, partial) { const metadata: SfhsCanvasSourceRegistration = { ...partial, purpose: partial.purpose, owner: partial.owner, origin: partial.origin, updatePolicy: partial.updatePolicy, expectedWidth: partial.expectedWidth ?? texture.width, expectedHeight: partial.expectedHeight ?? texture.height }; if (!id.trim()) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE", "Borrowed texture registration requires a stable id."); const existing = byId.get(`borrowed:${id}`); if (existing !== undefined) { if (metadataKey(existing.metadata) !== metadataKey(metadata)) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_UNATTRIBUTED_CANVAS_SOURCE", "Borrowed texture id has conflicting attribution."); return addReference(existing); } const ref = register(undefined, texture, metadata, true); const entry = entryFor(ref); byId.delete(entry.id); entry.id = `borrowed:${id}`; byId.set(entry.id, entry); return frozenRef(entry); },
    markDirty(ref) { const entry = entryFor(ref); if (entry.borrowed) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Borrowed textures are refreshed by their external owner."); if (entry.metadata.updatePolicy !== "explicit-dirty") { policyViolations += 1; throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Static Canvas sources cannot be marked dirty."); } entry.dirty = true; },
    resolve(ref) { const entry = entryFor(ref); if (entry.texture === undefined) { if (entry.source === undefined) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Texture entry has no source."); const factory = options.textureFrom ?? ((source: HTMLCanvasElement) => Texture.from(source)); entry.texture = factory(entry.source as HTMLCanvasElement); uploads += 1; misses += 1; return entry.texture; } if (entry.dirty) { const source = entry.texture.source as TextureSource & { update?: () => void }; if (typeof source.update !== "function") throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Installed Pixi texture source does not support controlled update()."); source.update(); destroyVariants(entry, "refresh"); entry.dirty = false; entry.generation += 1; refreshes += 1; return entry.texture; } hits += 1; return entry.texture; },
    resolveVariant(ref, smoothing) { const entry = entryFor(ref); const base = api.resolve(ref); const key = `${entry.generation}:${smoothing}`; const existing = entry.variants.get(key); if (existing !== undefined) { hits += 1; variantsReused += 1; return existing; } const variant = options.variantFrom?.(base, smoothing) ?? (() => { const baseSource = base.source as TextureSource; const SourceConstructor = baseSource.constructor as new (options: { readonly resource: TextureSource["resource"]; readonly scaleMode: "linear" | "nearest" }) => TextureSource; return new Texture({ source: new SourceConstructor({ resource: baseSource.resource, scaleMode: smoothing }) }); })(); entry.variants.set(key, variant); uploads += 1; misses += 1; variantsCreated += 1; return variant; },
    getGeneration(ref) { return entryFor(ref).generation; },
    release(ref) { const entry = entryFor(ref); const count = entry.owners.get(ref.owner) ?? 0; if (count < 1 || entry.references < 1) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Texture reference was already released."); entry.references -= 1; entry.owners.set(ref.owner, count - 1); if (count === 1) entry.owners.delete(ref.owner); releases += 1; if (entry.references === 0) destroyEntry(entry); },
    destroyOwner(owner) { live(); ownerCleanups += 1; for (const entry of [...byId.values()]) { const count = entry.owners.get(owner) ?? 0; if (count === 0) continue; entry.owners.delete(owner); entry.references -= count; if (entry.references === 0) destroyEntry(entry); } },
    destroy() { if (destroyed) return; for (const entry of [...byId.values()]) destroyEntry(entry); destroyed = true; },
    getDiagnostics() { const entries = [...byId.values()]; const count = (key: "owner" | "origin" | "updatePolicy") => Object.freeze(Object.fromEntries(entries.reduce((all, entry) => { const value = key === "owner" ? entry.metadata.owner : key === "origin" ? entry.metadata.origin : entry.metadata.updatePolicy; all.set(value, (all.get(value) ?? 0) + 1); return all; }, new Map<string, number>()))); return Object.freeze({ registeredSourceCount: entries.filter((entry) => entry.source !== undefined).length, activeTextureCount: entries.filter((entry) => entry.texture !== undefined).length, sourcesByOwner: count("owner"), sourcesByOrigin: count("origin"), sourcesByUpdatePolicy: count("updatePolicy"), textureUploads: uploads, textureRefreshes: refreshes, cacheHits: hits, cacheMisses: misses, samplingVariantsCreated: variantsCreated, samplingVariantsReused: variantsReused, samplingVariantsInvalidated: variantsInvalidated, samplingVariantsDestroyed: variantsDestroyed, visibleSourceRejections: visibleRejections, unattributedSourceRejections: attributionRejections, policyViolations, individualReleases: releases, ownerCleanupCount: ownerCleanups, destroyedTextureCount: destroyedTextures, borrowedTextureCount: borrowedTextures, leakedOwnerCount: [...new Set(entries.flatMap((entry) => [...entry.owners.keys()]))].length }); }
  };
  return Object.freeze(api);
}

export function resolveSfhsDrawImage(command: SfhsPixiCanvasCommand, registry: SfhsCompatTextureRegistry): SfhsResolvedDrawImage {
  if (command.family !== "image" || command.operation !== "drawImage") throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "Expected a unified drawImage command.");
  const payload = command.payload as { texture?: unknown; rect?: unknown };
  if (!payload.texture || typeof payload.texture !== "object" || !Array.isArray(payload.rect)) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "drawImage requires an attributed registry reference.");
  const ref = payload.texture as SfhsCompatTextureRef; const values = payload.rect as number[];
  if (![2, 4, 8].includes(values.length) || values.some((value) => !Number.isFinite(value))) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "drawImage rectangle is invalid.");
  const texture = registry.resolveVariant(ref, command.state.imageSmoothingEnabled ? "linear" : "nearest");
  let source = values.length === 8 ? [values[0]!, values[1]!, values[2]!, values[3]!] as [number, number, number, number] : undefined;
  const sourceWidth = source?.[2] ?? texture.width; const sourceHeight = source?.[3] ?? texture.height;
  let destination = (values.length === 2 ? [values[0]!, values[1]!, sourceWidth, sourceHeight] : values.length === 4 ? [values[0]!, values[1]!, values[2]!, values[3]!] : [values[4]!, values[5]!, values[6]!, values[7]!]) as [number, number, number, number];
  if (source !== undefined && source[2] < 0) { source[0] += source[2]; source[2] = -source[2]; }
  if (source !== undefined && source[3] < 0) { source[1] += source[3]; source[3] = -source[3]; }
  if (destination[2] < 0) { destination[0] += destination[2]; destination[2] = -destination[2]; }
  if (destination[3] < 0) { destination[1] += destination[3]; destination[3] = -destination[3]; }
  let isNoOp = sourceWidth === 0 || sourceHeight === 0 || destination[2] === 0 || destination[3] === 0;
  if (source !== undefined && !isNoOp) {
    const original = [...source] as [number, number, number, number];
    const left = Math.max(0, source[0]); const top = Math.max(0, source[1]); const right = Math.min(texture.width, source[0] + source[2]); const bottom = Math.min(texture.height, source[1] + source[3]);
    if (right <= left || bottom <= top) isNoOp = true;
    else {
      destination = [destination[0] + ((left - original[0]) / original[2]) * destination[2], destination[1] + ((top - original[1]) / original[3]) * destination[3], ((right - left) / original[2]) * destination[2], ((bottom - top) / original[3]) * destination[3]];
      source = [left, top, right - left, bottom - top];
    }
  }
  return Object.freeze({ texture, sourceId: ref.id, sourceGeneration: registry.getGeneration(ref), source: source === undefined ? undefined : Object.freeze(source) as readonly [number, number, number, number], destination: Object.freeze(destination) as readonly [number, number, number, number], isNoOp, state: command.state });
}

const multiply = (left: SfhsDrawImageMatrix, right: SfhsDrawImageMatrix): SfhsDrawImageMatrix => Object.freeze({ a: left.a * right.a + left.c * right.b, b: left.b * right.a + left.d * right.b, c: left.a * right.c + left.c * right.d, d: left.b * right.c + left.d * right.d, tx: left.a * right.tx + left.c * right.ty + left.tx, ty: left.b * right.tx + left.d * right.ty + left.ty });
export function composeSfhsDrawImageMatrix(image: SfhsResolvedDrawImage): SfhsDrawImageMatrix {
  const [a, b, c, d, tx, ty] = image.state.transform; const [dx, dy, dw, dh] = image.destination; const sourceWidth = image.source?.[2] ?? image.texture.width; const sourceHeight = image.source?.[3] ?? image.texture.height;
  if (sourceWidth <= 0 || sourceHeight <= 0 || dw <= 0 || dh <= 0) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "drawImage requires positive source and destination dimensions.");
  return multiply({ a, b, c, d, tx, ty }, { a: dw / sourceWidth, b: 0, c: 0, d: dh / sourceHeight, tx: dx, ty: dy });
}

/** B4B's bounded image dispatcher: it uses the frozen B4A command state, never mutable backend state. */
const present = (layer: Container, image: SfhsResolvedDrawImage, clipPresenter: SfhsCompatClipPresenter | undefined, croppedTexture: (image: SfhsResolvedDrawImage) => Texture): Sprite | undefined => {
  if (image.isNoOp) return undefined;
  const texture = image.source === undefined ? image.texture : croppedTexture(image);
  if (image.state.clips.length > 0 && clipPresenter === undefined) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_DRAWIMAGE_PARITY", "drawImage requires the shared clip presenter when a materialized clip is active.");
  const matrix = composeSfhsDrawImageMatrix(image); const sprite = (clipPresenter === undefined ? layer : clipPresenter.mount(layer, image.state.clips)).addChild(new Sprite(texture));
  sprite.setFromMatrix(new Matrix(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty)); sprite.alpha = image.state.globalAlpha; sprite.blendMode = image.state.globalCompositeOperation === "multiply" ? "multiply" : "normal";
  return sprite;
};

/** Presenting a crop requires an explicit lifecycle owner so frame Textures cannot leak. */
export function presentSfhsDrawImage(layer: Container, image: SfhsResolvedDrawImage, clipPresenter?: SfhsCompatClipPresenter): Sprite | undefined {
  if (image.source !== undefined) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "Cropped drawImage presentation requires createSfhsDrawImagePresenter().");
  return present(layer, image, clipPresenter, () => image.texture);
}

export function createSfhsDrawImagePresenter(): SfhsDrawImagePresenter {
  const frames = new Map<string, Texture>(); const generations = new Map<string, number>(); let destroyed = false; let created = 0; let reused = 0; let removed = 0;
  const removeFrames = (sourceId: string): void => { for (const [key, texture] of frames) { if (!key.startsWith(`${sourceId}:`)) continue; texture.destroy(false); frames.delete(key); removed += 1; } };
  const frame = (image: SfhsResolvedDrawImage): Texture => { if (image.source === undefined) return image.texture; const previousGeneration = generations.get(image.sourceId); if (previousGeneration !== undefined && previousGeneration !== image.sourceGeneration) removeFrames(image.sourceId); generations.set(image.sourceId, image.sourceGeneration); const key = `${image.sourceId}:${image.sourceGeneration}:${image.texture.source.uid}:${image.source.join(",")}`; const existing = frames.get(key); if (existing !== undefined) { reused += 1; return existing; } const next = new Texture({ source: image.texture.source, frame: new Rectangle(...image.source) }); frames.set(key, next); created += 1; return next; };
  return Object.freeze({ present(layer: Container, image: SfhsResolvedDrawImage, clipPresenter?: SfhsCompatClipPresenter) { if (destroyed) throw new SfhsCanvasSourceRegistryError("BLOCKED_ON_TEXTURE_LIFECYCLE", "DrawImage presenter is destroyed."); return present(layer, image, clipPresenter, frame); }, destroy() { if (destroyed) return; for (const texture of frames.values()) { texture.destroy(false); removed += 1; } frames.clear(); generations.clear(); destroyed = true; }, getDiagnostics: () => Object.freeze({ croppedTexturesCreated: created, croppedTexturesReused: reused, croppedTexturesDestroyed: removed }) });
}
