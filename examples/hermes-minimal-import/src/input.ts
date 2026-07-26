import type { CollectorActionSnapshot } from "./state";

export interface CollectorInput {
  sample(): CollectorActionSnapshot;
  clear(): void;
  dispose(): void;
}

export function createCollectorInput(
  leftButton: HTMLButtonElement,
  rightButton: HTMLButtonElement,
  source: Window = window
): CollectorInput {
  const keys = new Set<string>();
  const pointers = { left: new Set<number>(), right: new Set<number>() };
  const disposers: Array<() => void> = [];

  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    disposers.push(() => target.removeEventListener(type, listener));
  }

  listen(source, "keydown", ((event: KeyboardEvent) => {
    keys.add(event.code);
  }) as EventListener);
  listen(source, "keyup", ((event: KeyboardEvent) => {
    keys.delete(event.code);
  }) as EventListener);
  listen(source, "blur", () => {
    keys.clear();
    pointers.left.clear();
    pointers.right.clear();
  });

  for (const [action, button] of [["left", leftButton], ["right", rightButton]] as const) {
    listen(button, "pointerdown", ((event: PointerEvent) => {
      event.preventDefault();
      pointers[action].add(event.pointerId);
      button.setPointerCapture?.(event.pointerId);
    }) as EventListener);
    const release = ((event: PointerEvent) => {
      pointers[action].delete(event.pointerId);
    }) as EventListener;
    listen(button, "pointerup", release);
    listen(button, "pointercancel", release);
    listen(button, "lostpointercapture", release);
  }

  return {
    sample(): CollectorActionSnapshot {
      return Object.freeze({
        left: keys.has("ArrowLeft") || keys.has("KeyA") || pointers.left.size > 0,
        right: keys.has("ArrowRight") || keys.has("KeyD") || pointers.right.size > 0
      });
    },
    clear(): void {
      keys.clear();
      pointers.left.clear();
      pointers.right.clear();
    },
    dispose(): void {
      this.clear();
      for (const dispose of disposers.splice(0)) dispose();
    }
  };
}
