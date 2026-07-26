import { bootPixiV8CircleStage, supportsRequiredWebGl } from "@sfhs/adapter-pixi-v8";

import { createCollectorInput } from "./input";
import { createCollectorLifecycle, type CollectorLifecycle } from "./runtime";
import {
  collectorBuildId,
  collectorHeight,
  collectorWidth,
  createInitialCollectorState,
  runCollectorStateSelfCheck
} from "./state";

function requiredElement<ElementType extends Element>(selector: string): ElementType {
  const element = document.querySelector<ElementType>(selector);
  if (element === null) throw new Error(`Missing collector element: ${selector}`);
  return element;
}

const shell = requiredElement<HTMLElement>("#fixture-shell");
const host = requiredElement<HTMLElement>("#pixi-host");
const startButton = requiredElement<HTMLButtonElement>("#fixture-start");
const status = requiredElement<HTMLElement>("#fixture-status");
const score = requiredElement<HTMLOutputElement>("#score");
const leftButton = requiredElement<HTMLButtonElement>("#btn-left");
const rightButton = requiredElement<HTMLButtonElement>("#btn-right");
const input = createCollectorInput(leftButton, rightButton);
let lifecycle: CollectorLifecycle | undefined;
let resumeWhenVisible = false;

function snapshot() {
  return Object.freeze({
    ...(lifecycle?.getState() ?? createInitialCollectorState()),
    phase: shell.dataset.phase ?? "missing",
    buildId: collectorBuildId
  });
}

async function runFullSelfCheck() {
  const stateChecks = runCollectorStateSelfCheck();
  const checks = Object.freeze({
    ...stateChecks,
    canvas: host.querySelector("canvas") instanceof HTMLCanvasElement,
    running: lifecycle?.isRunning() === true,
    scoreHud: score instanceof HTMLOutputElement
  });
  return Object.freeze({ pass: Object.values(checks).every(Boolean), checks, snapshot: snapshot() });
}

(window as unknown as {
  CR: { getSnapshot(): ReturnType<typeof snapshot>; runFullSelfCheck(): ReturnType<typeof runFullSelfCheck> };
}).CR = Object.freeze({ getSnapshot: snapshot, runFullSelfCheck });

function showUnsupported(): void {
  shell.dataset.phase = "unsupported";
  status.textContent = "WebGL is required for this SFHS Pixi import. No fallback renderer is used.";
  startButton.disabled = true;
}

async function start(): Promise<void> {
  if (!supportsRequiredWebGl(document)) {
    showUnsupported();
    return;
  }
  startButton.disabled = true;
  status.textContent = "Initializing PixiJS with WebGL...";
  try {
    if (lifecycle === undefined) {
      const renderer = await bootPixiV8CircleStage(host, {
        width: collectorWidth,
        height: collectorHeight,
        backgroundColor: 0x0d1117,
        maximumDevicePixelRatio: 2
      });
      lifecycle = createCollectorLifecycle(renderer, input, (state) => {
        score.textContent = String(state.score);
      });
    }
    lifecycle.start();
    shell.dataset.phase = "running";
    status.textContent = "Collector running. Use A/D, arrow keys, or the touch controls.";
  } catch {
    shell.dataset.phase = "failed";
    status.textContent = "PixiJS could not initialize the required WebGL renderer.";
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", () => void start());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resumeWhenVisible = lifecycle?.isRunning() ?? false;
    lifecycle?.stop();
  } else if (resumeWhenVisible) {
    resumeWhenVisible = false;
    lifecycle?.start();
  }
});
window.addEventListener("pagehide", () => {
  lifecycle?.dispose();
  input.dispose();
});

if (!supportsRequiredWebGl(document)) showUnsupported();
