import { bootPixiV8MinimalFixture, supportsRequiredWebGl } from "@sfhs/adapter-pixi-v8";

import audioUnlockUrl from "./assets/audio-unlock.wav";
import fixtureAtlas from "./assets/fixture-atlas.json";
import fixtureAtlasImageUrl from "./assets/fixture-atlas.png";
import targetSvgUrl from "./assets/target.svg";

import { createFixtureAudioController } from "./audio.ts";
import { installFixtureDiagnostics, type FixtureDiagnosticInstallation } from "./diagnostics.ts";
import { createInitialPixiMinimalFixtureState, type PixiMinimalFixtureState } from "./fixture.ts";
import {
  createFixtureVisibilityController,
  createPixiMinimalFixtureLifecycle,
  type FixtureVisibilityController,
  type PixiMinimalFixtureLifecycle
} from "./runtime.ts";
import { createPixiMinimalInput, type FixtureDirectionAction } from "./input.ts";
import {
  calculateFixtureViewport,
  createFixtureViewportController,
  type FixtureViewportController
} from "./viewport.ts";

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) {
    throw new Error(`Missing required Pixi minimal fixture element: ${selector}`);
  }

  return element;
}

const fixtureShell = requiredElement<HTMLElement>("#fixture-shell");
const pixiHost = requiredElement<HTMLElement>("#pixi-host");
const startButton = requiredElement<HTMLButtonElement>("#fixture-start");
const status = requiredElement<HTMLElement>("#fixture-status");
const hudPhase = requiredElement<HTMLOutputElement>("#fixture-hud-phase");
const hudTicks = requiredElement<HTMLOutputElement>("#fixture-hud-ticks");
const hudPlayer = requiredElement<HTMLOutputElement>("#fixture-hud-player");
const hudActivations = requiredElement<HTMLOutputElement>("#fixture-hud-activations");
const hudAudio = requiredElement<HTMLOutputElement>("#fixture-hud-audio");
const hudOrientation = requiredElement<HTMLOutputElement>("#fixture-hud-orientation");
const directionControls = Object.fromEntries(
  (["move-up", "move-down", "move-left", "move-right"] as const).map((action) => [
    action,
    requiredElement<HTMLButtonElement>(`[data-fixture-action="${action}"]`)
  ])
) as Record<FixtureDirectionAction, HTMLButtonElement>;
const input = createPixiMinimalInput({ surface: pixiHost, directionControls });
const audio = createFixtureAudioController({
  sourceUrl: audioUnlockUrl
});
let lifecycle: PixiMinimalFixtureLifecycle | undefined;
let visibilityController: FixtureVisibilityController | undefined;
let viewportController: FixtureViewportController | undefined;
let lastHudTick = -15;
let lastHudActivationCount = -1;

function currentViewport() {
  return viewportController?.getSnapshot() ?? calculateFixtureViewport({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
    offsetLeft: window.visualViewport?.offsetLeft ?? 0,
    offsetTop: window.visualViewport?.offsetTop ?? 0,
    devicePixelRatio: window.devicePixelRatio
  });
}

function updateHud(state: PixiMinimalFixtureState, force = false): void {
  const phaseChanged = hudPhase.textContent !== state.phase;
  if (!force && !phaseChanged && state.ticks - lastHudTick < 15 && state.activationCount === lastHudActivationCount) {
    return;
  }
  const viewport = currentViewport();
  hudPhase.textContent = state.phase;
  hudTicks.textContent = String(state.ticks);
  hudPlayer.textContent = `${Math.round(state.playerX)}, ${Math.round(state.playerY)}`;
  hudActivations.textContent = String(state.activationCount);
  hudAudio.textContent = audio.getStatus();
  hudOrientation.textContent = viewport.orientation;
  lastHudTick = state.ticks;
  lastHudActivationCount = state.activationCount;
}

const diagnosticInstallation: FixtureDiagnosticInstallation = installFixtureDiagnostics(window, {
  getState: () => lifecycle?.getState() ?? createInitialPixiMinimalFixtureState(),
  isRunning: () => lifecycle?.isRunning() ?? false,
  getViewport: currentViewport,
  getAudioStatus: () => audio.getStatus()
});
updateHud(createInitialPixiMinimalFixtureState(), true);

function showCapabilityPage(message: string): void {
  fixtureShell.dataset.phase = "unsupported";
  status.textContent = message;
  startButton.disabled = true;
}

async function startFixture(): Promise<void> {
  if (!supportsRequiredWebGl(document)) {
    showCapabilityPage("WebGL is required for this SFHS Pixi fixture. No fallback renderer is used.");
    return;
  }

  startButton.disabled = true;
  status.textContent = "Initializing PixiJS with WebGL...";
  const audioUnlock = audio.unlock();

  try {
    if (lifecycle === undefined) {
      const renderer = await bootPixiV8MinimalFixture(pixiHost, {
        atlasImageUrl: fixtureAtlasImageUrl,
        atlasData: fixtureAtlas,
        targetSvgUrl
      });
      lifecycle = createPixiMinimalFixtureLifecycle({
        renderer,
        actionSource: input,
        onStateChange: (state) => updateHud(state)
      });
      visibilityController = createFixtureVisibilityController(lifecycle);
      viewportController = createFixtureViewportController({
        element: fixtureShell,
        onChange: (viewport) => {
          renderer.applyViewport(viewport);
          if (lifecycle !== undefined) {
            updateHud(lifecycle.getState(), true);
          }
        }
      });
    }

    await audioUnlock;
    lifecycle.start();
    updateHud(lifecycle.getState(), true);
    fixtureShell.dataset.phase = "running";
    status.textContent = "PixiJS v8 is running with an SFHS-owned fixed-step loop.";
  } catch {
    fixtureShell.dataset.phase = "failed";
    status.textContent = "PixiJS could not initialize a required WebGL renderer.";
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", () => {
  void startFixture();
});

window.addEventListener("pagehide", () => {
  diagnosticInstallation?.dispose();
  viewportController?.dispose();
  visibilityController?.dispose();
  lifecycle?.dispose();
  input.dispose();
  void audio.dispose();
});

if (!supportsRequiredWebGl(document)) {
  showCapabilityPage("WebGL is required for this SFHS Pixi fixture. No fallback renderer is used.");
}
