import { Graphics, type ColorSource, type Container, type LineCap } from "pixi.js";
import type { SupportedCanvasOperation } from "@sfhs/pixi-canvas-compat-contract";
import type { SfhsCompatClipDescriptor } from "./context.ts";
import type { SfhsCompatClipPresenter } from "./clip-presenter.ts";

export * from "./assets.ts";
export * from "./diagnostics.ts";
export * from "./context.ts";
export * from "./clip-presenter.ts";
export * from "./texture-registry.ts";
export * from "./unified-presenter.ts";

export const packageIdentity = "@sfhs/pixi-canvas-compat" as const;

export type SfhsCompatColor = ColorSource;
export type SfhsGeometryOperation = Extract<SupportedCanvasOperation,
  "arc" | "beginPath" | "closePath" | "ellipse" | "fill" | "fillRect" | "fillStyle" | "globalAlpha" | "lineCap" | "lineTo" | "lineWidth" | "moveTo" | "quadraticCurveTo" | "restore" | "rotate" | "save" | "scale" | "setTransform" | "stroke" | "strokeRect" | "strokeStyle" | "translate">;
export const implementedGeometryOperations: readonly SfhsGeometryOperation[] = Object.freeze([
  "arc", "beginPath", "closePath", "ellipse", "fill", "fillRect", "fillStyle", "globalAlpha", "lineCap", "lineTo", "lineWidth", "moveTo", "quadraticCurveTo", "restore", "rotate", "save", "scale", "setTransform", "stroke", "strokeRect", "strokeStyle", "translate"
]);

export interface SfhsGeometryGraphics {
  clear(): this;
  save(): this;
  restore(): this;
  beginPath(): this;
  closePath(): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): this;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this;
  rect(x: number, y: number, width: number, height: number): this;
  fill(style: { readonly color: SfhsCompatColor; readonly alpha: number }): this;
  stroke(style: { readonly color: SfhsCompatColor; readonly alpha: number; readonly width: number; readonly cap: LineCap }): this;
  translateTransform(x: number, y: number): this;
  rotateTransform(angle: number): this;
  scaleTransform(x: number, y: number): this;
  setTransform(a: number, b: number, c: number, d: number, dx: number, dy: number): this;
  resetTransform(): this;
  destroy?(): void;
}

export interface SfhsGeometryCompatDiagnostics {
  readonly graphicsAllocated: number;
  readonly graphicsReused: number;
  readonly commandsLastFrame: number;
  readonly unsupportedOperationCount: number;
  readonly maximumSaveDepth: number;
  readonly activeSaveDepth: number;
}

export interface SfhsPixiCanvasGeometryCompat {
  beginFrame(): void;
  present(clips?: readonly SfhsCompatClipDescriptor[], clipPresenter?: SfhsCompatClipPresenter): void;
  destroy(): void;
  save(): void;
  restore(): void;
  setGlobalAlpha(alpha: number): void;
  setFillStyle(color: SfhsCompatColor): void;
  setStrokeStyle(color: SfhsCompatColor): void;
  setLineWidth(width: number): void;
  setLineCap(cap: LineCap): void;
  translate(x: number, y: number): void;
  rotate(radians: number): void;
  scale(x: number, y: number): void;
  setTransform(a: number, b: number, c: number, d: number, dx: number, dy: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
  fill(): void;
  stroke(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  strokeRect(x: number, y: number, width: number, height: number): void;
  unsupported(operation: string): never;
  getCommands(): readonly GeometryCommand[];
  getDiagnostics(): SfhsGeometryCompatDiagnostics;
}

export class SfhsUnsupportedCanvasOperationError extends Error {
  readonly code = "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES" as const;
  readonly operation: string;

  constructor(operation: string) {
    super(`SFHS Pixi geometry compatibility does not support Canvas operation: ${operation}.`);
    this.name = "SfhsUnsupportedCanvasOperationError";
    this.operation = operation;
  }
}

type GeometryState = { readonly globalAlpha: number; readonly fillStyle: SfhsCompatColor; readonly strokeStyle: SfhsCompatColor; readonly lineWidth: number; readonly lineCap: LineCap; };
export type GeometryCommand =
  | { readonly operation: "save" | "restore" | "beginPath" | "closePath" | "fill" | "stroke"; readonly state: GeometryState }
  | { readonly operation: "setGlobalAlpha"; readonly alpha: number; readonly state: GeometryState }
  | { readonly operation: "setFillStyle" | "setStrokeStyle"; readonly color: SfhsCompatColor; readonly state: GeometryState }
  | { readonly operation: "setLineWidth"; readonly width: number; readonly state: GeometryState }
  | { readonly operation: "setLineCap"; readonly cap: LineCap; readonly state: GeometryState }
  | { readonly operation: "translate"; readonly x: number; readonly y: number; readonly state: GeometryState }
  | { readonly operation: "rotate"; readonly radians: number; readonly state: GeometryState }
  | { readonly operation: "scale"; readonly x: number; readonly y: number; readonly state: GeometryState }
  | { readonly operation: "setTransform"; readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly dx: number; readonly dy: number; readonly state: GeometryState }
  | { readonly operation: "moveTo" | "lineTo"; readonly x: number; readonly y: number; readonly state: GeometryState }
  | { readonly operation: "quadraticCurveTo"; readonly cpx: number; readonly cpy: number; readonly x: number; readonly y: number; readonly state: GeometryState }
  | { readonly operation: "arc"; readonly x: number; readonly y: number; readonly radius: number; readonly startAngle: number; readonly endAngle: number; readonly counterclockwise: boolean; readonly state: GeometryState }
  | { readonly operation: "ellipse"; readonly x: number; readonly y: number; readonly radiusX: number; readonly radiusY: number; readonly rotation: number; readonly startAngle: number; readonly endAngle: number; readonly counterclockwise: boolean; readonly state: GeometryState }
  | { readonly operation: "fillRect" | "strokeRect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly state: GeometryState };

const initialState = (): GeometryState => Object.freeze({ globalAlpha: 1, fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, lineCap: "butt" });
const copyState = (state: GeometryState): GeometryState => Object.freeze({ ...state });
const finite = (value: number, name: string): number => { if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`); return value; };
const alpha = (value: number): number => { finite(value, "globalAlpha"); return Math.min(1, Math.max(0, value)); };

export function createSfhsPixiCanvasGeometryCompat(options: { readonly layer?: Container; readonly graphics?: SfhsGeometryGraphics } = {}): SfhsPixiCanvasGeometryCompat {
  const createdGraphics = options.graphics === undefined ? new Graphics() : undefined;
  const graphics: SfhsGeometryGraphics = options.graphics ?? createdGraphics as Graphics;
  if (options.graphics === undefined && options.layer === undefined) throw new Error("A Pixi layer is required when SFHS creates the geometry Graphics object.");
  if (createdGraphics !== undefined) options.layer?.addChild(createdGraphics);
  const commands: GeometryCommand[] = [];
  const stack: GeometryState[] = [];
  let state = initialState();
  let graphicsReused = 0;
  let commandsLastFrame = 0;
  let unsupportedOperationCount = 0;
  let maximumSaveDepth = 0;
  let destroyed = false;
  const assertLive = (): void => { if (destroyed) throw new Error("SFHS Pixi geometry compatibility is destroyed."); };
  const emit = (command: GeometryCommand): void => { assertLive(); commands.push(command); };
  const setState = (next: GeometryState): void => { state = Object.freeze(next); };

  const api: SfhsPixiCanvasGeometryCompat = {
    beginFrame() { assertLive(); commands.length = 0; stack.length = 0; state = initialState(); },
    present(clips, clipPresenter) {
      assertLive(); graphics.clear().resetTransform();
      if (clips !== undefined && clips.length > 0) { if (clipPresenter === undefined) throw new SfhsUnsupportedCanvasOperationError("materialized-clip-presenter"); if (createdGraphics === undefined) throw new SfhsUnsupportedCanvasOperationError("clip-with-custom-graphics"); clipPresenter.mount(options.layer!, clips).addChild(createdGraphics); }
      for (const command of commands) {
        switch (command.operation) {
          case "save": graphics.save(); break;
          case "restore": graphics.restore(); break;
          case "beginPath": graphics.beginPath(); break;
          case "closePath": graphics.closePath(); break;
          case "setGlobalAlpha": case "setFillStyle": case "setStrokeStyle": case "setLineWidth": case "setLineCap": break;
          case "translate": graphics.translateTransform(command.x, command.y); break;
          case "rotate": graphics.rotateTransform(command.radians); break;
          case "scale": graphics.scaleTransform(command.x, command.y); break;
          case "setTransform": graphics.setTransform(command.a, command.b, command.c, command.d, command.dx, command.dy); break;
          case "moveTo": graphics.moveTo(command.x, command.y); break;
          case "lineTo": graphics.lineTo(command.x, command.y); break;
          case "quadraticCurveTo": graphics.quadraticCurveTo(command.cpx, command.cpy, command.x, command.y); break;
          case "arc": graphics.arc(command.x, command.y, command.radius, command.startAngle, command.endAngle, command.counterclockwise); break;
          case "ellipse": graphics.ellipse(command.x, command.y, command.radiusX, command.radiusY, command.rotation, command.startAngle, command.endAngle, command.counterclockwise); break;
          case "fill": graphics.fill({ color: command.state.fillStyle, alpha: command.state.globalAlpha }); break;
          case "stroke": graphics.stroke({ color: command.state.strokeStyle, alpha: command.state.globalAlpha, width: command.state.lineWidth, cap: command.state.lineCap }); break;
          case "fillRect": graphics.rect(command.x, command.y, command.width, command.height).fill({ color: command.state.fillStyle, alpha: command.state.globalAlpha }).beginPath(); break;
          case "strokeRect": graphics.rect(command.x, command.y, command.width, command.height).stroke({ color: command.state.strokeStyle, alpha: command.state.globalAlpha, width: command.state.lineWidth, cap: command.state.lineCap }).beginPath(); break;
        }
      }
      commandsLastFrame = commands.length; graphicsReused += 1;
    },
    destroy() { if (destroyed) return; commands.length = 0; stack.length = 0; graphics.destroy?.(); destroyed = true; },
    save() { emit({ operation: "save", state }); stack.push(copyState(state)); maximumSaveDepth = Math.max(maximumSaveDepth, stack.length); },
    restore() { assertLive(); const restored = stack.pop(); if (restored === undefined) throw new SfhsUnsupportedCanvasOperationError("restore-underflow"); setState(restored); emit({ operation: "restore", state }); },
    setGlobalAlpha(value) { setState({ ...state, globalAlpha: alpha(value) }); emit({ operation: "setGlobalAlpha", alpha: state.globalAlpha, state }); },
    setFillStyle(color) { setState({ ...state, fillStyle: color }); emit({ operation: "setFillStyle", color, state }); },
    setStrokeStyle(color) { setState({ ...state, strokeStyle: color }); emit({ operation: "setStrokeStyle", color, state }); },
    setLineWidth(width) { finite(width, "lineWidth"); if (width < 0) throw new RangeError("lineWidth must not be negative."); setState({ ...state, lineWidth: width }); emit({ operation: "setLineWidth", width, state }); },
    setLineCap(cap) { setState({ ...state, lineCap: cap }); emit({ operation: "setLineCap", cap, state }); },
    translate(x, y) { emit({ operation: "translate", x: finite(x, "translate.x"), y: finite(y, "translate.y"), state }); },
    rotate(radians) { emit({ operation: "rotate", radians: finite(radians, "rotate"), state }); },
    scale(x, y) { emit({ operation: "scale", x: finite(x, "scale.x"), y: finite(y, "scale.y"), state }); },
    setTransform(a, b, c, d, dx, dy) { emit({ operation: "setTransform", a: finite(a, "a"), b: finite(b, "b"), c: finite(c, "c"), d: finite(d, "d"), dx: finite(dx, "dx"), dy: finite(dy, "dy"), state }); },
    beginPath() { emit({ operation: "beginPath", state }); },
    closePath() { emit({ operation: "closePath", state }); },
    moveTo(x, y) { emit({ operation: "moveTo", x: finite(x, "moveTo.x"), y: finite(y, "moveTo.y"), state }); },
    lineTo(x, y) { emit({ operation: "lineTo", x: finite(x, "lineTo.x"), y: finite(y, "lineTo.y"), state }); },
    quadraticCurveTo(cpx, cpy, x, y) { emit({ operation: "quadraticCurveTo", cpx: finite(cpx, "quadraticCurveTo.cpx"), cpy: finite(cpy, "quadraticCurveTo.cpy"), x: finite(x, "quadraticCurveTo.x"), y: finite(y, "quadraticCurveTo.y"), state }); },
    arc(x, y, radius, startAngle, endAngle, counterclockwise = false) { if (radius < 0) throw new RangeError("arc.radius must not be negative."); emit({ operation: "arc", x: finite(x, "arc.x"), y: finite(y, "arc.y"), radius: finite(radius, "arc.radius"), startAngle: finite(startAngle, "arc.startAngle"), endAngle: finite(endAngle, "arc.endAngle"), counterclockwise, state }); },
    ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise = false) { if (radiusX < 0 || radiusY < 0) throw new RangeError("ellipse radii must not be negative."); emit({ operation: "ellipse", x: finite(x, "ellipse.x"), y: finite(y, "ellipse.y"), radiusX: finite(radiusX, "ellipse.radiusX"), radiusY: finite(radiusY, "ellipse.radiusY"), rotation: finite(rotation, "ellipse.rotation"), startAngle: finite(startAngle, "ellipse.startAngle"), endAngle: finite(endAngle, "ellipse.endAngle"), counterclockwise, state }); },
    fill() { emit({ operation: "fill", state }); },
    stroke() { emit({ operation: "stroke", state }); },
    fillRect(x, y, width, height) { emit({ operation: "fillRect", x: finite(x, "fillRect.x"), y: finite(y, "fillRect.y"), width: finite(width, "fillRect.width"), height: finite(height, "fillRect.height"), state }); },
    strokeRect(x, y, width, height) { emit({ operation: "strokeRect", x: finite(x, "strokeRect.x"), y: finite(y, "strokeRect.y"), width: finite(width, "strokeRect.width"), height: finite(height, "strokeRect.height"), state }); },
    unsupported(operation) { unsupportedOperationCount += 1; throw new SfhsUnsupportedCanvasOperationError(operation); },
    getCommands: () => Object.freeze([...commands]),
    getDiagnostics: () => Object.freeze({ graphicsAllocated: 1, graphicsReused, commandsLastFrame, unsupportedOperationCount, maximumSaveDepth, activeSaveDepth: stack.length })
  };
  return Object.freeze(api);
}
