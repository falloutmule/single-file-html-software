import type { PixiViewportPresentation } from "@sfhs/adapter-pixi-v8";

export type FixtureOrientation = "portrait" | "landscape";

export interface FixtureViewportInput {
  readonly width: number;
  readonly height: number;
  readonly offsetLeft?: number;
  readonly offsetTop?: number;
  readonly devicePixelRatio: number;
  readonly maximumDevicePixelRatio?: number;
}

export interface FixtureViewportSnapshot extends PixiViewportPresentation {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
  readonly orientation: FixtureOrientation;
  readonly containedWidth: number;
  readonly containedHeight: number;
}

export interface FixtureViewportSource extends EventTarget {
  readonly width: number;
  readonly height: number;
  readonly offsetLeft: number;
  readonly offsetTop: number;
}

export interface FixtureWindowViewportSource extends EventTarget {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly devicePixelRatio: number;
  readonly visualViewport?: FixtureViewportSource | null;
}

export interface FixtureViewportElement {
  readonly style: Pick<CSSStyleDeclaration, "setProperty">;
  readonly dataset: DOMStringMap;
}

export interface FixtureViewportController {
  getSnapshot(): FixtureViewportSnapshot;
  refresh(): FixtureViewportSnapshot;
  dispose(): void;
}

export interface FixtureViewportControllerOptions {
  readonly element: FixtureViewportElement;
  readonly windowSource?: FixtureWindowViewportSource;
  readonly onChange?: (snapshot: FixtureViewportSnapshot) => void;
}

const logicalWidth = 960;
const logicalHeight = 540;

function finitePositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function finiteOffset(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

export function calculateFixtureViewport(input: FixtureViewportInput): FixtureViewportSnapshot {
  const viewportWidth = finitePositive(input.width);
  const viewportHeight = finitePositive(input.height);
  const maximumDevicePixelRatio = finitePositive(input.maximumDevicePixelRatio ?? 2);
  const devicePixelRatio = Math.min(
    Math.max(finitePositive(input.devicePixelRatio), 1),
    maximumDevicePixelRatio
  );
  const containedScale = Math.min(viewportWidth / logicalWidth, viewportHeight / logicalHeight);

  return Object.freeze({
    logicalWidth,
    logicalHeight,
    resolution: devicePixelRatio,
    viewportWidth,
    viewportHeight,
    offsetLeft: finiteOffset(input.offsetLeft),
    offsetTop: finiteOffset(input.offsetTop),
    orientation: viewportWidth >= viewportHeight ? "landscape" : "portrait",
    containedWidth: logicalWidth * containedScale,
    containedHeight: logicalHeight * containedScale
  });
}

function snapshotsEqual(left: FixtureViewportSnapshot, right: FixtureViewportSnapshot): boolean {
  return Object.keys(left).every((key) => {
    const snapshotKey = key as keyof FixtureViewportSnapshot;
    return left[snapshotKey] === right[snapshotKey];
  });
}

export function createFixtureViewportController(
  options: FixtureViewportControllerOptions
): FixtureViewportController {
  const windowSource = options.windowSource ?? window;
  const visualViewport = windowSource.visualViewport ?? undefined;
  const removers: Array<() => void> = [];

  function readSnapshot(): FixtureViewportSnapshot {
    return calculateFixtureViewport({
      width: visualViewport?.width ?? windowSource.innerWidth,
      height: visualViewport?.height ?? windowSource.innerHeight,
      offsetLeft: visualViewport?.offsetLeft ?? 0,
      offsetTop: visualViewport?.offsetTop ?? 0,
      devicePixelRatio: windowSource.devicePixelRatio,
      maximumDevicePixelRatio: 2
    });
  }

  let snapshot = readSnapshot();

  function apply(nextSnapshot: FixtureViewportSnapshot): void {
    snapshot = nextSnapshot;
    options.element.dataset.orientation = nextSnapshot.orientation;
    options.element.style.setProperty("--sfhs-visual-viewport-width", `${nextSnapshot.viewportWidth}px`);
    options.element.style.setProperty("--sfhs-visual-viewport-height", `${nextSnapshot.viewportHeight}px`);
    options.element.style.setProperty("--sfhs-visual-viewport-offset-left", `${nextSnapshot.offsetLeft}px`);
    options.element.style.setProperty("--sfhs-visual-viewport-offset-top", `${nextSnapshot.offsetTop}px`);
    options.onChange?.(nextSnapshot);
  }

  function refresh(): FixtureViewportSnapshot {
    const nextSnapshot = readSnapshot();
    if (!snapshotsEqual(snapshot, nextSnapshot)) {
      apply(nextSnapshot);
    }
    return snapshot;
  }

  function listen(target: EventTarget, type: string): void {
    target.addEventListener(type, refresh);
    removers.push(() => target.removeEventListener(type, refresh));
  }

  listen(windowSource, "resize");
  listen(windowSource, "orientationchange");
  if (visualViewport !== undefined) {
    listen(visualViewport, "resize");
    listen(visualViewport, "scroll");
  }
  apply(snapshot);

  return {
    getSnapshot: () => snapshot,
    refresh,
    dispose(): void {
      for (const remove of removers.splice(0)) {
        remove();
      }
    }
  };
}
