/**
 * Public, renderer-neutral command front end for the bounded SFHS Canvas subset.
 * It owns every mutable Canvas-style state value. Pixi backends receive only the
 * frozen command snapshots emitted here; they cannot observe later mutations.
 */
import type { SfhsCompatTextureRef } from "./texture-registry.ts";
export type SfhsCompatMatrix = readonly [number, number, number, number, number, number];
export type SfhsCompatComposite = "source-over" | "multiply";
export type SfhsCompatLineCap = "butt" | "round" | "square";
export type SfhsCompatTextAlign = "start" | "center" | "end";
export type SfhsCompatTextBaseline = "alphabetic" | "top" | "middle" | "bottom";
export type SfhsCompatClipPathOp = Readonly<{ readonly operation: "moveTo" | "lineTo" | "rect" | "closePath" | "arc" | "ellipse" | "quadraticCurveTo"; readonly values: readonly number[] }>;
export interface SfhsCompatClipDescriptor { readonly id: string; readonly path: readonly SfhsCompatClipPathOp[]; readonly transform: SfhsCompatMatrix; readonly fillRule: "nonzero" | "evenodd"; readonly parents: readonly SfhsCompatClipDescriptor[]; }

export interface SfhsPixiCanvasStateSnapshot {
  readonly transform: SfhsCompatMatrix;
  readonly globalAlpha: number;
  readonly globalCompositeOperation: SfhsCompatComposite;
  readonly fillStyle: string | number;
  readonly strokeStyle: string | number;
  readonly lineWidth: number;
  readonly lineCap: SfhsCompatLineCap;
  readonly font: string;
  readonly textAlign: SfhsCompatTextAlign;
  readonly textBaseline: SfhsCompatTextBaseline;
  readonly imageSmoothingEnabled: boolean;
  /** Immutable, materialized clipping state. Backends must use this rather than clipRefs. */
  readonly clips: readonly SfhsCompatClipDescriptor[];
  /** Compatibility-only identifiers derived from clips; never a presentation contract. */
  readonly clipRefs: readonly string[];
}

export type SfhsPixiCanvasCommand = Readonly<{
  id: number;
  frame: number;
  family: "geometry" | "image" | "text" | "clear" | "mask";
  operation: string;
  payload: Readonly<Record<string, unknown>>;
  state: SfhsPixiCanvasStateSnapshot;
}>;

export interface SfhsPixiCanvasContextDiagnostics {
  readonly frame: number;
  readonly currentSaveDepth: number;
  readonly maximumSaveDepth: number;
  readonly stateSnapshotsCreated: number;
  readonly commandsByFamily: Readonly<Record<string, number>>;
  readonly transformMutations: number;
  readonly stateMutations: number;
  readonly backendDispatchCounts: Readonly<Record<string, number>>;
  readonly unsupportedStateTransitionCount: number;
}

export interface SfhsPixiCanvasCompatContext {
  beginFrame(): void;
  endFrame(): readonly SfhsPixiCanvasCommand[];
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(radians: number): void;
  scale(x: number, y: number): void;
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  resetTransform(): void;
  setGlobalAlpha(value: number): void;
  setCompositeOperation(value: SfhsCompatComposite): void;
  setFillStyle(value: string | number): void;
  setStrokeStyle(value: string | number): void;
  setLineWidth(value: number): void;
  setLineCap(value: SfhsCompatLineCap): void;
  setFont(value: string): void;
  setTextAlign(value: SfhsCompatTextAlign): void;
  setTextBaseline(value: SfhsCompatTextBaseline): void;
  setImageSmoothingEnabled(value: boolean): void;
  setClips(value: readonly SfhsCompatClipDescriptor[]): void;
  setClipRefs(value: readonly string[]): void;
  clip(fillRule?: "nonzero" | "evenodd"): SfhsCompatClipDescriptor;
  beginPath(): void; closePath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void;
  rect(x: number, y: number, width: number, height: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  fill(): void; stroke(): void; fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void; clearRect(x: number, y: number, width: number, height: number): void;
  drawImage(texture: string | SfhsCompatTextureRef, ...rect: readonly number[]): void;
  fillText(value: string, x: number, y: number): void; strokeText(value: string, x: number, y: number): void;
  getCommands(): readonly SfhsPixiCanvasCommand[];
  getDiagnostics(): SfhsPixiCanvasContextDiagnostics;
}

type MutableState = Omit<SfhsPixiCanvasStateSnapshot, "transform" | "clips" | "clipRefs"> & { transform: [number, number, number, number, number, number]; clips: SfhsCompatClipDescriptor[]; clipRefs: string[] };
const identity = (): [number, number, number, number, number, number] => [1, 0, 0, 1, 0, 0];
const initial = (): MutableState => ({ transform: identity(), globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, lineCap: "butt", font: "10px sans-serif", textAlign: "start", textBaseline: "alphabetic", imageSmoothingEnabled: true, clips: [], clipRefs: [] });
const finite = (value: number, name: string): number => { if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`); return value; };
const multiply = (left: SfhsCompatMatrix, right: SfhsCompatMatrix): [number, number, number, number, number, number] => [left[0] * right[0] + left[2] * right[1], left[1] * right[0] + left[3] * right[1], left[0] * right[2] + left[2] * right[3], left[1] * right[2] + left[3] * right[3], left[0] * right[4] + left[2] * right[5] + left[4], left[1] * right[4] + left[3] * right[5] + left[5]];
const freezeState = (state: MutableState): SfhsPixiCanvasStateSnapshot => Object.freeze({ ...state, transform: Object.freeze([...state.transform]) as SfhsCompatMatrix, clips: Object.freeze([...state.clips]), clipRefs: Object.freeze([...state.clipRefs]) });
const cloneState = (state: MutableState): MutableState => ({ ...state, transform: [...state.transform] as MutableState["transform"], clips: [...state.clips], clipRefs: [...state.clipRefs] });

export class SfhsPixiCanvasStateError extends Error { readonly code = "BLOCKED_ON_UNIFIED_COMPAT_STATE" as const; }

export function createSfhsPixiCanvasCompatContext(): SfhsPixiCanvasCompatContext {
  let state = initial(); let frame = 0; let nextId = 1; let maximumSaveDepth = 0; let snapshots = 0; let transformMutations = 0; let stateMutations = 0; let unsupported = 0;
  const stack: MutableState[] = []; const commands: SfhsPixiCanvasCommand[] = []; const path: SfhsCompatClipPathOp[] = []; const families: Record<string, number> = {}; const dispatch: Record<string, number> = {}; let nextClip = 1;
  const emit = (family: SfhsPixiCanvasCommand["family"], operation: string, payload: Record<string, unknown> = {}): void => { const frozen = freezeState(state); snapshots += 1; families[family] = (families[family] ?? 0) + 1; dispatch[family] = (dispatch[family] ?? 0) + 1; commands.push(Object.freeze({ id: nextId++, frame, family, operation, payload: Object.freeze({ ...payload }), state: frozen })); };
  const matrix = (...values: number[]): [number, number, number, number, number, number] => values.map((value, index) => finite(value, `matrix[${index}]`)) as [number, number, number, number, number, number];
  const mutate = <K extends keyof MutableState>(key: K, value: MutableState[K]): void => { state = { ...state, [key]: value }; stateMutations += 1; };
  const numeric = (operation: string, ...values: number[]): number[] => values.map((value, index) => finite(value, `${operation}[${index}]`));
  const api: SfhsPixiCanvasCompatContext = {
    beginFrame() { frame += 1; commands.length = 0; stack.length = 0; state = initial(); }, endFrame: () => Object.freeze([...commands]),
    save() { stack.push(cloneState(state)); maximumSaveDepth = Math.max(maximumSaveDepth, stack.length); emit("mask", "save"); },
    restore() { const restored = stack.pop(); if (restored === undefined) { unsupported += 1; throw new SfhsPixiCanvasStateError("restore underflow"); } state = restored; emit("mask", "restore"); },
    translate(x, y) { state = { ...state, transform: multiply(state.transform, matrix(1, 0, 0, 1, x, y)) }; transformMutations += 1; },
    rotate(radians) { finite(radians, "rotate"); state = { ...state, transform: multiply(state.transform, [Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0]) }; transformMutations += 1; },
    scale(x, y) { state = { ...state, transform: multiply(state.transform, matrix(x, 0, 0, y, 0, 0)) }; transformMutations += 1; },
    transform(a, b, c, d, e, f) { state = { ...state, transform: multiply(state.transform, matrix(a, b, c, d, e, f)) }; transformMutations += 1; },
    setTransform(a, b, c, d, e, f) { state = { ...state, transform: matrix(a, b, c, d, e, f) }; transformMutations += 1; }, resetTransform() { state = { ...state, transform: identity() }; transformMutations += 1; },
    setGlobalAlpha(value) { mutate("globalAlpha", Math.max(0, Math.min(1, finite(value, "globalAlpha")))); }, setCompositeOperation(value) { mutate("globalCompositeOperation", value); }, setFillStyle(value) { mutate("fillStyle", value); }, setStrokeStyle(value) { mutate("strokeStyle", value); },
    setLineWidth(value) { if (finite(value, "lineWidth") < 0) throw new RangeError("lineWidth must not be negative."); mutate("lineWidth", value); }, setLineCap(value) { mutate("lineCap", value); }, setFont(value) { mutate("font", value); }, setTextAlign(value) { mutate("textAlign", value); }, setTextBaseline(value) { mutate("textBaseline", value); }, setImageSmoothingEnabled(value) { mutate("imageSmoothingEnabled", value); }, setClips(value) { mutate("clips", [...value]); mutate("clipRefs", value.map((clip) => clip.id)); }, setClipRefs(value) { if (value.length > 0) throw new SfhsPixiCanvasStateError("identifier-only clipping is not a representable presentation contract"); mutate("clips", []); mutate("clipRefs", []); },
    clip(fillRule = "nonzero") { if (path.length === 0) throw new SfhsPixiCanvasStateError("clip requires a non-empty current path"); const descriptor = Object.freeze({ id: `clip-${nextClip++}`, path: Object.freeze(path.map((op) => Object.freeze({ operation: op.operation, values: Object.freeze([...op.values]) }))), transform: Object.freeze([...state.transform]) as SfhsCompatMatrix, fillRule, parents: Object.freeze([...state.clips]) }); mutate("clips", [...state.clips, descriptor]); mutate("clipRefs", [...state.clipRefs, descriptor.id]); emit("mask", "clip", { descriptor }); return descriptor; },
    beginPath: () => { path.length = 0; emit("geometry", "beginPath"); }, closePath: () => { path.push(Object.freeze({ operation: "closePath", values: Object.freeze([]) })); emit("geometry", "closePath"); }, moveTo: (x, y) => { const values = [finite(x, "moveTo.x"), finite(y, "moveTo.y")]; path.push(Object.freeze({ operation: "moveTo", values: Object.freeze(values) })); emit("geometry", "moveTo", { x: values[0], y: values[1] }); }, lineTo: (x, y) => { const values = [finite(x, "lineTo.x"), finite(y, "lineTo.y")]; path.push(Object.freeze({ operation: "lineTo", values: Object.freeze(values) })); emit("geometry", "lineTo", { x: values[0], y: values[1] }); }, rect: (x, y, width, height) => { const values = [finite(x, "rect.x"), finite(y, "rect.y"), finite(width, "rect.width"), finite(height, "rect.height")]; path.push(Object.freeze({ operation: "rect", values: Object.freeze(values) })); emit("geometry", "rect", { x, y, width, height }); },
    arc: (x, y, radius, startAngle, endAngle, counterclockwise = false) => { if (radius < 0) throw new RangeError("arc radius must not be negative."); const values = [finite(x, "arc.x"), finite(y, "arc.y"), finite(radius, "arc.radius"), finite(startAngle, "arc.startAngle"), finite(endAngle, "arc.endAngle"), counterclockwise ? 1 : 0]; path.push(Object.freeze({ operation: "arc", values: Object.freeze(values) })); emit("geometry", "arc", { x, y, radius, startAngle, endAngle, counterclockwise }); }, ellipse: (x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise = false) => { const values = [finite(x, "ellipse.x"), finite(y, "ellipse.y"), finite(radiusX, "ellipse.radiusX"), finite(radiusY, "ellipse.radiusY"), finite(rotation, "ellipse.rotation"), finite(startAngle, "ellipse.startAngle"), finite(endAngle, "ellipse.endAngle"), counterclockwise ? 1 : 0]; path.push(Object.freeze({ operation: "ellipse", values: Object.freeze(values) })); emit("geometry", "ellipse", { x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise }); }, quadraticCurveTo: (cpx, cpy, x, y) => { const values = [finite(cpx, "quadraticCurveTo.cpx"), finite(cpy, "quadraticCurveTo.cpy"), finite(x, "quadraticCurveTo.x"), finite(y, "quadraticCurveTo.y")]; path.push(Object.freeze({ operation: "quadraticCurveTo", values: Object.freeze(values) })); emit("geometry", "quadraticCurveTo", { cpx, cpy, x, y }); }, fill: () => emit("geometry", "fill"), stroke: () => emit("geometry", "stroke"),
    fillRect: (x, y, width, height) => emit("geometry", "fillRect", { x, y, width, height }), strokeRect: (x, y, width, height) => emit("geometry", "strokeRect", { x, y, width, height }), clearRect: (x, y, width, height) => emit("clear", "clearRect", { x, y, width, height }),
    drawImage(texture, ...rect) { if ((typeof texture === "string" && texture.length === 0) || ![2, 4, 8].includes(rect.length)) throw new SfhsPixiCanvasStateError("drawImage requires a texture reference and 2, 4, or 8 numeric rectangle values."); emit("image", "drawImage", { texture: typeof texture === "string" ? texture : Object.freeze({ ...texture }), rect: Object.freeze(numeric("drawImage", ...rect)) }); }, fillText: (value, x, y) => emit("text", "fillText", { value, x: finite(x, "fillText.x"), y: finite(y, "fillText.y") }), strokeText: (value, x, y) => emit("text", "strokeText", { value, x: finite(x, "strokeText.x"), y: finite(y, "strokeText.y") }),
    getCommands: () => Object.freeze([...commands]), getDiagnostics: () => Object.freeze({ frame, currentSaveDepth: stack.length, maximumSaveDepth, stateSnapshotsCreated: snapshots, commandsByFamily: Object.freeze({ ...families }), transformMutations, stateMutations, backendDispatchCounts: Object.freeze({ ...dispatch }), unsupportedStateTransitionCount: unsupported })
  };
  return Object.freeze(api);
}
