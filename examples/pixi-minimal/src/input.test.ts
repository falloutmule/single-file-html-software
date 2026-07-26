import { describe, expect, it } from "vitest";

import {
  createFixtureActionStore,
  createPixiMinimalInput,
  mapClientPointToLogical,
  type FixturePointerSurface
} from "./input.ts";

class FakePointerSurface extends EventTarget implements FixturePointerSurface {
  readonly capturedPointers: number[] = [];

  getBoundingClientRect(): Pick<DOMRect, "left" | "top" | "width" | "height"> {
    return { left: 10, top: 20, width: 480, height: 270 };
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointers.push(pointerId);
  }
}

function pointerEvent(
  type: string,
  properties: { readonly pointerId: number; readonly clientX?: number; readonly clientY?: number }
): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: properties.pointerId },
    button: { value: 0 },
    clientX: { value: properties.clientX ?? 0 },
    clientY: { value: properties.clientY ?? 0 }
  });
  return event;
}

describe("SFHS Pixi action input", () => {
  it("combines held sources and releases each source independently", () => {
    const store = createFixtureActionStore();
    store.press("keyboard:KeyA", "move-left");
    store.press("pointer:7", "move-right");

    expect(store.sampleForStep()).toEqual({ moveX: 0, moveY: 0 });
    store.release("pointer:7");
    const snapshot = store.sampleForStep();

    expect(snapshot).toEqual({ moveX: -1, moveY: 0 });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("consumes each activation once and clears held plus queued input", () => {
    const store = createFixtureActionStore();
    store.press("pointer:1", "move-up");
    store.queueActivation({ x: 720, y: 270 });

    expect(store.sampleForStep()).toEqual({ moveX: 0, moveY: -1, activateAt: { x: 720, y: 270 } });
    expect(store.sampleForStep()).toEqual({ moveX: 0, moveY: -1 });
    store.queueActivation({ x: 100, y: 100 });
    store.clear();
    expect(store.sampleForStep()).toEqual({ moveX: 0, moveY: 0 });
  });

  it("maps and clamps client coordinates to the fixed logical surface", () => {
    const surface = new FakePointerSurface();

    expect(mapClientPointToLogical(surface, 250, 155)).toEqual({ x: 480, y: 270 });
    expect(mapClientPointToLogical(surface, -100, 1_000)).toEqual({ x: 0, y: 540 });
  });

  it("clears cancelled pointers and permits concurrent direction plus activation", () => {
    const keyboardTarget = new EventTarget();
    const visibilityTarget = new EventTarget();
    const surface = new FakePointerSurface();
    const moveLeft = new FakePointerSurface();
    const input = createPixiMinimalInput({
      surface,
      directionControls: { "move-left": moveLeft },
      keyboardTarget,
      visibilityTarget,
      isDocumentHidden: () => false
    });

    moveLeft.dispatchEvent(pointerEvent("pointerdown", { pointerId: 1 }));
    surface.dispatchEvent(pointerEvent("pointerdown", { pointerId: 2, clientX: 370, clientY: 155 }));
    surface.dispatchEvent(pointerEvent("pointerup", { pointerId: 2, clientX: 370, clientY: 155 }));
    expect(input.sampleForStep()).toEqual({ moveX: -1, moveY: 0, activateAt: { x: 720, y: 270 } });

    moveLeft.dispatchEvent(pointerEvent("pointercancel", { pointerId: 1 }));
    expect(input.sampleForStep()).toEqual({ moveX: 0, moveY: 0 });
    expect(moveLeft.capturedPointers).toEqual([1]);
    expect(surface.capturedPointers).toEqual([2]);

    input.dispose();
    moveLeft.dispatchEvent(pointerEvent("pointerdown", { pointerId: 3 }));
    expect(input.sampleForStep()).toEqual({ moveX: 0, moveY: 0 });
  });
});
