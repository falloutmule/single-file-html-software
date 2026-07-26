import { Container, Graphics, Matrix } from "pixi.js";
import type { SfhsCompatClipDescriptor, SfhsCompatClipPathOp } from "./context.ts";

/** A Pixi mask materialization for an immutable Canvas clip snapshot. */
export interface SfhsCompatClipPresenter {
  /** Releases materializations from the prior rendered frame before issuing new commands. */
  beginFrame(): void;
  /**
   * Returns a content container nested through every clip. Add presentation objects
   * to this result; its ancestors enforce intersection, never union.
   */
  mount(layer: Container, clips: readonly SfhsCompatClipDescriptor[]): Container;
  destroy(): void;
  getDiagnostics(): Readonly<{ readonly masksCreated: number; readonly masksReused: number; readonly masksDestroyed: number; readonly activeMasks: number; readonly activeScopes: number }>;
}

export class SfhsClipPresentationError extends Error {
  readonly code = "BLOCKED_ON_CLIP_PARITY" as const;
  constructor(message: string) { super(message); this.name = "SfhsClipPresentationError"; }
}

const matrix = (values: readonly number[]): Matrix => new Matrix(values[0]!, values[1]!, values[2]!, values[3]!, values[4]!, values[5]!);

const replay = (graphics: Graphics, op: SfhsCompatClipPathOp): void => {
  const v = op.values;
  switch (op.operation) {
    case "moveTo": graphics.moveTo(v[0]!, v[1]!); return;
    case "lineTo": graphics.lineTo(v[0]!, v[1]!); return;
    case "rect": graphics.rect(v[0]!, v[1]!, v[2]!, v[3]!); return;
    case "closePath": graphics.closePath(); return;
    default: throw new SfhsClipPresentationError(`Clip operation ${op.operation} is not yet exactly representable by the Pixi mask presenter.`);
  }
};

/**
 * Clips are materialized once from the frozen geometry and CTM captured at
 * `clip()` time. Each nesting level owns one mask container, so Pixi's single
 * `mask` property cannot accidentally replace an earlier intersection.
 */
export function createSfhsCompatClipPresenter(): SfhsCompatClipPresenter {
  const masks = new Set<Graphics>();
  const mountedScopes = new Set<Container>();
  let destroyed = false; let created = 0; const reused = 0; let removed = 0;
  const live = (): void => { if (destroyed) throw new SfhsClipPresentationError("Clip presenter is destroyed."); };
  const releaseFrame = (): void => {
    for (const scope of mountedScopes) {
      scope.removeFromParent();
      scope.destroy({ children: false });
    }
    mountedScopes.clear();
    for (const graphic of masks) {
      graphic.removeFromParent();
      graphic.destroy();
      removed += 1;
    }
    masks.clear();
  };
  const materialize = (clip: SfhsCompatClipDescriptor): Graphics => {
    if (clip.fillRule !== "nonzero") throw new SfhsClipPresentationError("evenodd clip filling is not supported by Pixi v8 Graphics and is blocked rather than approximated.");
    const graphic = new Graphics();
    for (const op of clip.path) replay(graphic, op);
    graphic.fill({ color: 0xffffff, alpha: 1 });
    graphic.setFromMatrix(matrix(clip.transform));
    masks.add(graphic); created += 1;
    return graphic;
  };
  return Object.freeze({
    beginFrame() { live(); releaseFrame(); },
    mount(layer: Container, clips: readonly SfhsCompatClipDescriptor[]) {
      live(); let content = layer;
      for (const clip of clips) {
        const scope = content.addChild(new Container()); mountedScopes.add(scope);
        const mask = materialize(clip);
        // The mask shares the scope's parent, preserving the captured clip CTM
        // exactly once while the scope masks all descendants.
        content.addChild(mask); scope.mask = mask; content = scope;
      }
      return content;
    },
    destroy() { if (destroyed) return; releaseFrame(); destroyed = true; },
    getDiagnostics: () => Object.freeze({ masksCreated: created, masksReused: reused, masksDestroyed: removed, activeMasks: masks.size, activeScopes: mountedScopes.size })
  });
}
