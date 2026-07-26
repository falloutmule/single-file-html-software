export const packageIdentity = "@sfhs/pixi-runtime" as const;

export type SfhsOrientation = "portrait" | "landscape";
export type SfhsScalePolicy = "contain" | "cover" | "stretch" | "integer-scale";

export interface SfhsViewportConfiguration {
  readonly mode: "fixed" | "adaptive";
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly maximumDevicePixelRatio: number;
  readonly scalePolicy: SfhsScalePolicy;
}

export interface SfhsViewportState {
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  readonly presentedWidth: number;
  readonly presentedHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly resolution: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly orientation: SfhsOrientation;
}

export interface SfhsStageDiagnostics {
  readonly hierarchy: readonly [
    "worldRoot/backgroundLayer",
    "worldRoot/environmentLayer",
    "worldRoot/actorLayer",
    "worldRoot/projectileLayer",
    "worldRoot/worldEffectsLayer",
    "screenEffectsLayer",
    "debugLayer",
    "hudLayer"
  ];
  readonly meaningfulObjectCount: number;
}

export interface SfhsPresentationDiagnostics {
  readonly renderer: "PIXI";
  readonly stage: SfhsStageDiagnostics;
  readonly paused: boolean;
  readonly destroyed: boolean;
  readonly viewport?: SfhsViewportState;
}

export interface SfhsPresentationAdapter<Snapshot> {
  mount(host: HTMLElement): Promise<void>;
  resize(viewport: SfhsViewportState): void;
  present(snapshot: Readonly<Snapshot>, alpha: number): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getPrimarySurface(): HTMLCanvasElement;
  getDiagnostics(): SfhsPresentationDiagnostics;
}

export interface SfhsSemanticActionSource<Action> {
  sampleForStep(): Readonly<Action>;
  clear(): void;
  destroy(): void;
}

export interface SfhsGameScene<State, Action, Snapshot> {
  mount(): State;
  enter(state: State): State;
  update(state: State, action: Readonly<Action>, seconds: number): State;
  snapshot(state: State): Readonly<Snapshot>;
  pause(state: State): void;
  resume(state: State): void;
  exit(state: State): void;
  resize(state: State, viewport: SfhsViewportState): void;
  destroy(): void;
}

export interface SfhsFrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

export interface SfhsViewportSource extends EventTarget {
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly devicePixelRatio: number;
  readonly visualViewport?: (EventTarget & { readonly width: number; readonly height: number }) | null;
}

export interface SfhsPixiGameRuntime<State> {
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getState(): State;
  getViewport(): SfhsViewportState;
  getPrimarySurface(): HTMLCanvasElement;
  getDiagnostics(): SfhsPresentationDiagnostics;
}

export function calculateSfhsViewport(
  configuration: SfhsViewportConfiguration,
  width: number,
  height: number,
  devicePixelRatio: number
): SfhsViewportState {
  const presentedWidth = Math.max(1, width);
  const presentedHeight = Math.max(1, height);
  const resolution = Math.min(Math.max(devicePixelRatio, 1), configuration.maximumDevicePixelRatio);
  const logicalWidth = configuration.mode === "adaptive" ? presentedWidth : configuration.logicalWidth;
  const logicalHeight = configuration.mode === "adaptive" ? presentedHeight : configuration.logicalHeight;
  let scaleX = presentedWidth / logicalWidth;
  let scaleY = presentedHeight / logicalHeight;
  if (configuration.scalePolicy === "contain" || configuration.scalePolicy === "cover" || configuration.scalePolicy === "integer-scale") {
    const candidate = configuration.scalePolicy === "cover" ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
    const scale = configuration.scalePolicy === "integer-scale" ? Math.max(1, Math.floor(candidate)) : candidate;
    scaleX = scale;
    scaleY = scale;
  }
  return Object.freeze({
    logicalWidth, logicalHeight, presentedWidth, presentedHeight,
    backingWidth: Math.round(logicalWidth * resolution), backingHeight: Math.round(logicalHeight * resolution),
    resolution, scaleX, scaleY,
    offsetX: (presentedWidth - logicalWidth * scaleX) / 2,
    offsetY: (presentedHeight - logicalHeight * scaleY) / 2,
    orientation: presentedWidth >= presentedHeight ? "landscape" : "portrait"
  });
}

export async function createSfhsPixiGameRuntime<State, Action, Snapshot>(options: {
  readonly host: HTMLElement;
  readonly presentation: SfhsPresentationAdapter<Snapshot>;
  readonly scene: SfhsGameScene<State, Action, Snapshot>;
  readonly actions: SfhsSemanticActionSource<Action>;
  readonly viewport: SfhsViewportConfiguration;
  readonly simulationHz: number;
  readonly maximumFrameDeltaMilliseconds: number;
  readonly scheduler?: SfhsFrameScheduler;
  readonly viewportSource?: SfhsViewportSource;
}): Promise<SfhsPixiGameRuntime<State>> {
  const scheduler = options.scheduler ?? { request: (callback) => requestAnimationFrame(callback), cancel: (handle) => cancelAnimationFrame(handle) };
  const source = options.viewportSource ?? window;
  const visual = source.visualViewport ?? undefined;
  const removers: Array<() => void> = [];
  const step = 1 / options.simulationHz;
  let state!: State;
  let viewport = readViewport();
  let handle: number | undefined;
  let previous: number | undefined;
  let carry = 0;
  let running = false;
  let destroyed = false;

  function readViewport(): SfhsViewportState {
    return calculateSfhsViewport(options.viewport, visual?.width ?? source.innerWidth, visual?.height ?? source.innerHeight, source.devicePixelRatio);
  }
  function resize(): void {
    viewport = readViewport();
    options.presentation.resize(viewport);
    options.scene.resize(state, viewport);
  }
  function listen(target: EventTarget, name: string): void {
    target.addEventListener(name, resize);
    removers.push(() => target.removeEventListener(name, resize));
  }
  function frame(time: number): void {
    handle = undefined;
    if (!running || destroyed) return;
    if (previous !== undefined) {
      carry += Math.min(Math.max((time - previous) / 1000, 0), options.maximumFrameDeltaMilliseconds / 1000);
      while (carry >= step) {
        state = options.scene.update(state, options.actions.sampleForStep(), step);
        carry -= step;
      }
    }
    previous = time;
    options.presentation.present(options.scene.snapshot(state), carry / step);
    handle = scheduler.request(frame);
  }

  let sceneMountAttempted = false;
  try {
    await options.presentation.mount(options.host);
    sceneMountAttempted = true;
    state = options.scene.mount();
    state = options.scene.enter(state);
    resize();
    listen(source, "resize");
    listen(source, "orientationchange");
    if (visual !== undefined) listen(visual, "resize");
  } catch (error) {
    for (const remove of removers.splice(0)) remove();
    if (sceneMountAttempted) options.scene.destroy();
    options.actions.destroy();
    options.presentation.destroy();
    throw error;
  }
  function startRuntime(): void {
    if (destroyed) throw new Error("Destroyed SFHS runtime cannot start.");
    if (!running) { running = true; options.presentation.resume(); handle = scheduler.request(frame); }
  }
  function pauseRuntime(): void {
    if (!running) return;
    running = false; previous = undefined; options.actions.clear();
    if (handle !== undefined) scheduler.cancel(handle);
    handle = undefined; options.scene.pause(state); options.presentation.pause();
  }
  return {
    start: startRuntime,
    pause: pauseRuntime,
    resume() { if (destroyed) throw new Error("Destroyed SFHS runtime cannot start."); if (running) return; options.scene.resume(state); startRuntime(); },
    destroy() { if (destroyed) return; pauseRuntime(); destroyed = true; for (const remove of removers.splice(0)) remove(); options.scene.exit(state); options.actions.destroy(); options.scene.destroy(); options.presentation.destroy(); },
    getState: () => state,
    getViewport: () => viewport,
    getPrimarySurface: () => options.presentation.getPrimarySurface(),
    getDiagnostics: () => options.presentation.getDiagnostics()
  };
}
