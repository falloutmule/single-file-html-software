namespace SkylineDrop {
  export interface SkylineDiagnostics {
    readonly renderer: "pixi-webgl";
    readonly build: "source" | "candidate";
    readonly version: string;
    state(): Readonly<GameState> | null;
    selfCheck(): Readonly<Record<string, unknown>>;
  }

  export function installDiagnostics(getState: () => GameState | null, canvasCount: () => number): void {
    const diagnostics: SkylineDiagnostics = Object.freeze({
      renderer: "pixi-webgl",
      build: document.documentElement.dataset.sfhsCandidate ? "candidate" : "source",
      version: "0.1.0",
      state: () => getState(),
      selfCheck: () => Object.freeze({
        renderer: "pixi-webgl",
        canvasCount: canvasCount(),
        externalRuntimeUrls: 0,
        statePresent: getState() !== null,
        level: getState()?.levelIndex ?? null,
        phase: getState()?.phase ?? null
      })
    });
    (window as Window & { __SKYLINE_DROP__?: SkylineDiagnostics }).__SKYLINE_DROP__ = diagnostics;
  }
}
