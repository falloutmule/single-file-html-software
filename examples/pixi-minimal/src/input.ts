export type FixtureDirectionAction = "move-up" | "move-down" | "move-left" | "move-right";

export interface FixtureLogicalPoint {
  readonly x: number;
  readonly y: number;
}

export interface FixtureActionSnapshot {
  readonly moveX: number;
  readonly moveY: number;
  readonly activateAt?: FixtureLogicalPoint;
}

export interface FixtureActionStore {
  press(sourceId: string, action: FixtureDirectionAction): void;
  release(sourceId: string): void;
  queueActivation(point: FixtureLogicalPoint): void;
  sampleForStep(): FixtureActionSnapshot;
  clear(): void;
}

export interface FixturePointerSurface extends EventTarget {
  getBoundingClientRect(): Pick<DOMRect, "left" | "top" | "width" | "height">;
  setPointerCapture(pointerId: number): void;
}

export interface PixiMinimalInput extends FixtureActionStore {
  dispose(): void;
}

export interface PixiMinimalInputOptions {
  readonly surface: FixturePointerSurface;
  readonly directionControls: Readonly<Partial<Record<FixtureDirectionAction, FixturePointerSurface>>>;
  readonly keyboardTarget?: EventTarget;
  readonly visibilityTarget?: EventTarget;
  readonly isDocumentHidden?: () => boolean;
}

const keyboardActions: Readonly<Record<string, FixtureDirectionAction>> = Object.freeze({
  ArrowUp: "move-up",
  KeyW: "move-up",
  ArrowDown: "move-down",
  KeyS: "move-down",
  ArrowLeft: "move-left",
  KeyA: "move-left",
  ArrowRight: "move-right",
  KeyD: "move-right"
});

function boundedAxis(positive: boolean, negative: boolean): number {
  return Number(positive) - Number(negative);
}

function frozenPoint(point: FixtureLogicalPoint): FixtureLogicalPoint {
  return Object.freeze({ x: point.x, y: point.y });
}

export function createIdleFixtureActionSnapshot(): FixtureActionSnapshot {
  return Object.freeze({ moveX: 0, moveY: 0 });
}

export function createFixtureActionStore(): FixtureActionStore {
  const heldActions = new Map<string, FixtureDirectionAction>();
  const activationQueue: FixtureLogicalPoint[] = [];

  return {
    press(sourceId, action): void {
      heldActions.set(sourceId, action);
    },
    release(sourceId): void {
      heldActions.delete(sourceId);
    },
    queueActivation(point): void {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
        return;
      }

      activationQueue.push(frozenPoint(point));
    },
    sampleForStep(): FixtureActionSnapshot {
      const activeActions = new Set(heldActions.values());
      const activateAt = activationQueue.shift();
      return Object.freeze({
        moveX: boundedAxis(activeActions.has("move-right"), activeActions.has("move-left")),
        moveY: boundedAxis(activeActions.has("move-down"), activeActions.has("move-up")),
        ...(activateAt === undefined ? {} : { activateAt })
      });
    },
    clear(): void {
      heldActions.clear();
      activationQueue.length = 0;
    }
  };
}

export function mapClientPointToLogical(
  surface: Pick<FixturePointerSurface, "getBoundingClientRect">,
  clientX: number,
  clientY: number,
  logicalWidth = 960,
  logicalHeight = 540
): FixtureLogicalPoint {
  const bounds = surface.getBoundingClientRect();
  const width = Math.max(bounds.width, 1);
  const height = Math.max(bounds.height, 1);
  const x = Math.min(Math.max((clientX - bounds.left) / width, 0), 1) * logicalWidth;
  const y = Math.min(Math.max((clientY - bounds.top) / height, 0), 1) * logicalHeight;
  return frozenPoint({ x, y });
}

function pointerSource(pointerId: number): string {
  return `pointer:${pointerId}`;
}

function keyboardSource(code: string): string {
  return `keyboard:${code}`;
}

function pointerEvent(event: Event): PointerEvent {
  return event as PointerEvent;
}

function keyboardEvent(event: Event): KeyboardEvent {
  return event as KeyboardEvent;
}

export function createPixiMinimalInput(options: PixiMinimalInputOptions): PixiMinimalInput {
  const store = createFixtureActionStore();
  const keyboardTarget = options.keyboardTarget ?? window;
  const visibilityTarget = options.visibilityTarget ?? document;
  const isDocumentHidden = options.isDocumentHidden ?? (() => document.hidden);
  const pendingActivations = new Set<number>();
  const removers: Array<() => void> = [];

  function listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener, { passive: false });
    removers.push(() => target.removeEventListener(type, listener));
  }

  function capturePointer(surface: FixturePointerSurface, pointerId: number): void {
    try {
      surface.setPointerCapture(pointerId);
    } catch {
      // Detached test surfaces and browsers ending a gesture early may reject capture.
    }
  }

  const onKeyDown: EventListener = (event) => {
    const key = keyboardEvent(event);
    const action = keyboardActions[key.code];
    if (action === undefined) {
      return;
    }

    key.preventDefault();
    store.press(keyboardSource(key.code), action);
  };
  const onKeyUp: EventListener = (event) => {
    const key = keyboardEvent(event);
    if (keyboardActions[key.code] === undefined) {
      return;
    }

    key.preventDefault();
    store.release(keyboardSource(key.code));
  };
  listen(keyboardTarget, "keydown", onKeyDown);
  listen(keyboardTarget, "keyup", onKeyUp);
  listen(keyboardTarget, "blur", () => store.clear());
  listen(visibilityTarget, "visibilitychange", () => {
    if (isDocumentHidden()) {
      pendingActivations.clear();
      store.clear();
    }
  });

  for (const [action, control] of Object.entries(options.directionControls) as Array<[
    FixtureDirectionAction,
    FixturePointerSurface | undefined
  ]>) {
    if (control === undefined) {
      continue;
    }

    const release = (event: Event): void => {
      store.release(pointerSource(pointerEvent(event).pointerId));
    };
    listen(control, "pointerdown", (event) => {
      const pointer = pointerEvent(event);
      if (pointer.button !== 0) {
        return;
      }

      pointer.preventDefault();
      store.press(pointerSource(pointer.pointerId), action);
      capturePointer(control, pointer.pointerId);
    });
    listen(control, "pointerup", release);
    listen(control, "pointercancel", release);
    listen(control, "lostpointercapture", release);
  }

  listen(options.surface, "pointerdown", (event) => {
    const pointer = pointerEvent(event);
    if (pointer.button !== 0) {
      return;
    }

    pointer.preventDefault();
    pendingActivations.add(pointer.pointerId);
    capturePointer(options.surface, pointer.pointerId);
  });
  listen(options.surface, "pointerup", (event) => {
    const pointer = pointerEvent(event);
    if (!pendingActivations.delete(pointer.pointerId)) {
      return;
    }

    pointer.preventDefault();
    store.queueActivation(mapClientPointToLogical(options.surface, pointer.clientX, pointer.clientY));
  });
  const cancelActivation: EventListener = (event) => {
    pendingActivations.delete(pointerEvent(event).pointerId);
  };
  listen(options.surface, "pointercancel", cancelActivation);
  listen(options.surface, "lostpointercapture", cancelActivation);

  return {
    ...store,
    clear(): void {
      pendingActivations.clear();
      store.clear();
    },
    dispose(): void {
      pendingActivations.clear();
      store.clear();
      for (const remove of removers.splice(0)) {
        remove();
      }
    }
  };
}
