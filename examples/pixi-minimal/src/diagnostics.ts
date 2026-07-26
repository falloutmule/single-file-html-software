import type { PixiMinimalFixtureState } from "./fixture.ts";
import type { FixtureAudioStatus } from "./audio.ts";
import type { FixtureViewportSnapshot } from "./viewport.ts";

export interface FixtureDiagnosticSnapshot {
  readonly schema: "sfhs.runtime@1";
  readonly phase: PixiMinimalFixtureState["phase"];
  readonly running: boolean;
  readonly ticks: number;
  readonly player: Readonly<{ x: number; y: number }>;
  readonly activationCount: number;
  readonly orientation: FixtureViewportSnapshot["orientation"];
  readonly viewport: Readonly<{ width: number; height: number; devicePixelRatio: number }>;
  readonly audio: FixtureAudioStatus;
}

export interface FixtureSelfCheck {
  readonly name: string;
  readonly pass: boolean;
}

export interface FixtureSelfCheckResult {
  readonly pass: boolean;
  readonly checks: readonly FixtureSelfCheck[];
  readonly snapshot: FixtureDiagnosticSnapshot;
}

export interface FixtureCrApi {
  readonly schema: "sfhs.cr@1";
  getSnapshot(): FixtureDiagnosticSnapshot;
  runFullSelfCheck(): Promise<FixtureSelfCheckResult>;
}

export interface FixtureDiagnosticSources {
  readonly getState: () => PixiMinimalFixtureState;
  readonly isRunning: () => boolean;
  readonly getViewport: () => FixtureViewportSnapshot;
  readonly getAudioStatus: () => FixtureAudioStatus;
}

export interface FixtureDiagnosticInstallation {
  readonly api: FixtureCrApi;
  dispose(): void;
}

function freezeCheck(name: string, pass: boolean): FixtureSelfCheck {
  return Object.freeze({ name, pass });
}

function createSnapshot(sources: FixtureDiagnosticSources): FixtureDiagnosticSnapshot {
  const state = sources.getState();
  const viewport = sources.getViewport();
  return Object.freeze({
    schema: "sfhs.runtime@1",
    phase: state.phase,
    running: sources.isRunning(),
    ticks: state.ticks,
    player: Object.freeze({ x: state.playerX, y: state.playerY }),
    activationCount: state.activationCount,
    orientation: viewport.orientation,
    viewport: Object.freeze({
      width: viewport.viewportWidth,
      height: viewport.viewportHeight,
      devicePixelRatio: viewport.resolution
    }),
    audio: sources.getAudioStatus()
  });
}

export function installFixtureDiagnostics(
  target: object,
  sources: FixtureDiagnosticSources
): FixtureDiagnosticInstallation {
  const api: FixtureCrApi = Object.freeze({
    schema: "sfhs.cr@1",
    getSnapshot: () => createSnapshot(sources),
    async runFullSelfCheck(): Promise<FixtureSelfCheckResult> {
      const stateBefore = JSON.stringify(sources.getState());
      const snapshot = createSnapshot(sources);
      const checks = Object.freeze([
        freezeCheck("state-serializable", JSON.stringify(JSON.parse(stateBefore)) === stateBefore),
        freezeCheck("state-frozen", Object.isFrozen(sources.getState())),
        freezeCheck(
          "player-in-logical-bounds",
          snapshot.player.x >= 0
            && snapshot.player.x <= 960
            && snapshot.player.y >= 0
            && snapshot.player.y <= 540
        ),
        freezeCheck(
          "viewport-finite",
          Number.isFinite(snapshot.viewport.width)
            && Number.isFinite(snapshot.viewport.height)
            && snapshot.viewport.width > 0
            && snapshot.viewport.height > 0
        ),
        freezeCheck("audio-not-failed", snapshot.audio !== "failed"),
        freezeCheck("self-check-state-isolated", JSON.stringify(sources.getState()) === stateBefore)
      ]);
      return Object.freeze({ pass: checks.every((check) => check.pass), checks, snapshot });
    }
  });

  Object.defineProperty(target, "CR", {
    configurable: true,
    enumerable: false,
    writable: false,
    value: api
  });

  return {
    api,
    dispose(): void {
      Reflect.deleteProperty(target, "CR");
    }
  };
}

declare global {
  interface Window {
    readonly CR: FixtureCrApi;
  }
}
