import { Graphics, Matrix, Text, type Container, type FillGradient, type TextStyleFontWeight } from "pixi.js";
import type { SfhsCompatClipPathOp } from "./context.ts";
import type { SfhsCompatClipPresenter } from "./clip-presenter.ts";
import type { SfhsPixiCanvasCommand, SfhsPixiCanvasStateSnapshot } from "./context.ts";

export class SfhsUnifiedPresentationError extends Error {
  readonly code = "BLOCKED_ON_UNSUPPORTED_CANVAS_FEATURES" as const;
  constructor(operation: string) { super(`Unified Pixi presentation cannot represent ${operation} exactly.`); this.name = "SfhsUnifiedPresentationError"; }
}

const target = (layer: Container, state: SfhsPixiCanvasStateSnapshot, clips: SfhsCompatClipPresenter | undefined): Container => {
  if (state.clips.length === 0) return layer;
  if (clips === undefined) throw new SfhsUnifiedPresentationError("materialized-clip-presenter");
  return clips.mount(layer, state.clips);
};
const matrixAt = (state: SfhsPixiCanvasStateSnapshot, x: number, y: number): Matrix => {
  const [a, b, c, d, tx, ty] = state.transform;
  return new Matrix(a, b, c, d, a * x + c * y + tx, b * x + d * y + ty);
};
const blend = (state: SfhsPixiCanvasStateSnapshot): "normal" | "multiply" => state.globalCompositeOperation === "multiply" ? "multiply" : "normal";
const multiplyMatrix = (left: Matrix, right: Matrix): Matrix => new Matrix(left.a * right.a + left.c * right.b, left.b * right.a + left.d * right.b, left.a * right.c + left.c * right.d, left.b * right.c + left.d * right.d, left.a * right.tx + left.c * right.ty + left.tx, left.b * right.tx + left.d * right.ty + left.ty);

/** A local Canvas path that can be filled by an attributed Pixi gradient. */
export type SfhsGradientShape =
  | Readonly<{ readonly kind: "rect"; readonly x: number; readonly y: number; readonly width: number; readonly height: number }>
  | Readonly<{ readonly kind: "circle"; readonly x: number; readonly y: number; readonly radius: number }>
  | Readonly<{ readonly kind: "ellipse"; readonly x: number; readonly y: number; readonly radiusX: number; readonly radiusY: number; readonly rotation: number }>
  | Readonly<{ readonly kind: "path"; readonly operations: readonly SfhsCompatClipPathOp[] }>;

const finite = (value: number, name: string): number => { if (!Number.isFinite(value)) throw new SfhsUnifiedPresentationError(`${name} must be finite`); return value; };
const replayGradientPath = (graphic: Graphics, operation: SfhsCompatClipPathOp): void => {
  const values = operation.values;
  switch (operation.operation) {
    case "moveTo": graphic.moveTo(values[0]!, values[1]!); return;
    case "lineTo": graphic.lineTo(values[0]!, values[1]!); return;
    case "rect": graphic.rect(values[0]!, values[1]!, values[2]!, values[3]!); return;
    case "closePath": graphic.closePath(); return;
    case "arc": graphic.arc(values[0]!, values[1]!, values[2]!, values[3]!, values[4]!, values[5] === 1); return;
    case "ellipse": {
      const start = values[5]!; const end = values[6]!; const rotation = values[4]!;
      if (rotation !== 0 || start !== 0 || end !== Math.PI * 2 || values[7] === 1) throw new SfhsUnifiedPresentationError("partial or rotated path ellipse");
      graphic.ellipse(values[0]!, values[1]!, values[2]!, values[3]!); return;
    }
    case "quadraticCurveTo": graphic.quadraticCurveTo(values[0]!, values[1]!, values[2]!, values[3]!); return;
  }
};

/**
 * Fills an immutable local Canvas shape through a frozen shared state snapshot.
 * The gradient and shape stay in logical Canvas coordinates; one exact affine
 * matrix is applied after local geometry is constructed, preserving skew/shear.
 */
export function presentSfhsGradientShape(layer: Container, state: SfhsPixiCanvasStateSnapshot, gradient: FillGradient, shape: SfhsGradientShape, clips?: SfhsCompatClipPresenter): Graphics {
  const graphic = new Graphics(); let localMatrix = new Matrix();
  switch (shape.kind) {
    case "rect": graphic.rect(finite(shape.x, "rect.x"), finite(shape.y, "rect.y"), finite(shape.width, "rect.width"), finite(shape.height, "rect.height")); break;
    case "circle": if (shape.radius < 0) throw new SfhsUnifiedPresentationError("circle radius must not be negative"); graphic.circle(finite(shape.x, "circle.x"), finite(shape.y, "circle.y"), finite(shape.radius, "circle.radius")); break;
    case "ellipse": {
      if (shape.radiusX < 0 || shape.radiusY < 0) throw new SfhsUnifiedPresentationError("ellipse radii must not be negative");
      const x = finite(shape.x, "ellipse.x"); const y = finite(shape.y, "ellipse.y"); const rotation = finite(shape.rotation, "ellipse.rotation");
      graphic.ellipse(x, y, finite(shape.radiusX, "ellipse.radiusX"), finite(shape.radiusY, "ellipse.radiusY"));
      localMatrix = new Matrix().translate(x, y).rotate(rotation).translate(-x, -y); break;
    }
    case "path": if (shape.operations.length === 0) throw new SfhsUnifiedPresentationError("gradient path must not be empty"); for (const operation of shape.operations) replayGradientPath(graphic, operation); break;
  }
  const [a, b, c, d, tx, ty] = state.transform;
  graphic.fill(gradient); graphic.setFromMatrix(multiplyMatrix(new Matrix(a, b, c, d, tx, ty), localMatrix)); graphic.alpha = state.globalAlpha; graphic.blendMode = blend(state); target(layer, state, clips).addChild(graphic);
  return graphic;
}

/** Renders a gradient-filled local rectangle through the frozen Canvas state. */
export function presentSfhsGradientRect(layer: Container, state: SfhsPixiCanvasStateSnapshot, gradient: FillGradient, x: number, y: number, width: number, height: number, clips?: SfhsCompatClipPresenter): Graphics {
  return presentSfhsGradientShape(layer, state, gradient, { kind: "rect", x, y, width, height }, clips);
}

/** Renders the supported text subset using the same state/clip/matrix boundary as images and gradients. */
export function presentSfhsText(layer: Container, command: SfhsPixiCanvasCommand, clips?: SfhsCompatClipPresenter): Text {
  if (command.family !== "text" || command.operation !== "fillText") throw new SfhsUnifiedPresentationError("text operation");
  const payload = command.payload as { readonly value?: unknown; readonly x?: unknown; readonly y?: unknown };
  if (typeof payload.value !== "string" || typeof payload.x !== "number" || typeof payload.y !== "number") throw new SfhsUnifiedPresentationError("text payload");
  if (command.state.textBaseline === "alphabetic") throw new SfhsUnifiedPresentationError("alphabetic text baseline");
  const font = /^(?:(normal|bold|[1-9]00)\s+)?(\d+(?:\.\d+)?)px\s+(.+)$/.exec(command.state.font);
  if (font === null) throw new SfhsUnifiedPresentationError("font syntax");
  const weight = (font[1] ?? "normal") as TextStyleFontWeight;
  const text = target(layer, command.state, clips).addChild(new Text({ text: payload.value, style: { fontFamily: font[3]!, fontSize: Number(font[2]), fontWeight: weight, fill: command.state.fillStyle } }));
  text.anchor.set(command.state.textAlign === "center" ? .5 : command.state.textAlign === "end" ? 1 : 0, command.state.textBaseline === "top" ? 0 : command.state.textBaseline === "middle" ? .5 : 1);
  text.setFromMatrix(matrixAt(command.state, payload.x, payload.y)); text.alpha = command.state.globalAlpha; text.blendMode = blend(command.state);
  return text;
}
