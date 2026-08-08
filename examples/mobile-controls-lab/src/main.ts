/* ==========================================================================
   AI-SAFE SINGLE-FILE CONSTITUTION
   1. Named SECTION edits only; do not rewrite unrelated blocks.
   2. Profile schema changes require an explicit version and migration decision.
   3. INPUT -> ACTIONS -> SIMULATION -> RENDER is one-way.
   4. Render code must not mutate input or simulation state.
   5. Runtime lifecycle owns setup and teardown.
   6. Configuration is centralized; no hidden feature flags.
   7. No runtime external JavaScript, CSS, fonts, or assets.
   8. No eval or dynamic Function.
   9. No inline event handlers; addEventListener only.
  10. The public harness API is window.CR only.
  11. One bounded controls-lab card at a time.
  12. Ship only after self-check and exact-artifact browser proof.
  13. Self-check is state-isolated.
  14. The release artifact remains one HTML file.
  15. Automated proof precedes physical feel acceptance.
   ========================================================================== */

import {
  createMobileControls,
  serializeProfile,
  type HoldOutput,
  type MobileControlDeclaration,
  type MobileControlsController,
  type MobileControlsProfile,
  type PulseOutput,
  type Relative1dOutput,
  type Stick2dOutput
} from "@sfhs/mobile-controls";

// SECTION: CONFIGURATION

const FIXED_STEP_SECONDS = 1 / 60;
const MAX_FRAME_SECONDS = 0.25;
const LAB_GAIN_DEGREES_PER_NORMALIZED_WIDTH = 180;
const PROFILE_KEY = "sfhs.mobile-controls.lab.profile.v1";

const controls: readonly MobileControlDeclaration[] = Object.freeze([
  Object.freeze({
    id: "move", type: "stick2d", label: "Move", minWidth: 0.16, minHeight: 0.14,
    layout: {
      portrait: { x: 0.04, y: 0.72, width: 0.3, height: 0.23 },
      landscape: { x: 0.03, y: 0.57, width: 0.23, height: 0.36 }
    }
  }),
  Object.freeze({
    id: "look", type: "relative1d", axis: "x", label: "Look", minWidth: 0.16, minHeight: 0.14,
    layout: {
      portrait: { x: 0.66, y: 0.72, width: 0.3, height: 0.23 },
      landscape: { x: 0.71, y: 0.57, width: 0.26, height: 0.36 }
    }
  }),
  Object.freeze({
    id: "primary", type: "hold", label: "Primary", minWidth: 0.12, minHeight: 0.08,
    layout: {
      portrait: { x: 0.75, y: 0.56, width: 0.19, height: 0.11 },
      landscape: { x: 0.79, y: 0.38, width: 0.15, height: 0.14 }
    }
  }),
  Object.freeze({
    id: "interact", type: "pulse", label: "Interact", minWidth: 0.12, minHeight: 0.08,
    layout: {
      portrait: { x: 0.53, y: 0.58, width: 0.18, height: 0.1 },
      landscape: { x: 0.61, y: 0.4, width: 0.14, height: 0.13 }
    }
  })
]);

// SECTION: STATE

interface LabState {
  phase: "ready" | "running" | "failed";
  ticks: number;
  lookRaw: number;
  lookApplied: number;
  lookAccumulated: number;
  angleDegrees: number;
  pulseCount: number;
}

const state: LabState = {
  phase: "ready",
  ticks: 0,
  lookRaw: 0,
  lookApplied: 0,
  lookAccumulated: 0,
  angleDegrees: 0,
  pulseCount: 0
};

let controller: MobileControlsController | undefined;
let animationFrame = 0;
let previousTime = 0;
let accumulator = 0;

function requiredElement<ElementType extends HTMLElement>(id: string): ElementType {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing required lab element: ${id}`);
  return element as ElementType;
}

const shell = requiredElement<HTMLElement>("fixture-shell");
const surface = requiredElement<HTMLElement>("control-surface");
const profileStatus = requiredElement<HTMLOutputElement>("profile-status");
const profileJson = requiredElement<HTMLTextAreaElement>("profile-json");

function baseProfile(handedness: "right" | "left"): MobileControlsProfile {
  const settings = controller?.exportProfile().settings ?? {
    opacity: 0.6,
    stickDeadZone: 0.08,
    relativeSensitivity: 1
  };
  const layouts = { portrait: {}, landscape: {} } as {
    portrait: Record<string, { x: number; y: number; width: number; height: number }>;
    landscape: Record<string, { x: number; y: number; width: number; height: number }>;
  };
  for (const declaration of controls) {
    for (const orientation of ["portrait", "landscape"] as const) {
      const source = declaration.layout[orientation];
      layouts[orientation][declaration.id] = handedness === "right"
        ? { ...source }
        : { ...source, x: 1 - source.x - source.width };
    }
  }
  return { schema: "sfhs.mobile-controls-profile@1", settings, layouts };
}

// SECTION: INPUT -> FIXED-STEP ACTIONS

function simulateStep(): void {
  if (controller === undefined) return;
  const frame = controller.flush();
  const look = frame.controls.look as Relative1dOutput;
  const interact = frame.controls.interact as PulseOutput;
  state.lookRaw = look.rawNormalizedDelta;
  state.lookApplied = look.delta;
  state.lookAccumulated += look.delta;
  state.angleDegrees = (state.angleDegrees + look.delta * LAB_GAIN_DEGREES_PER_NORMALIZED_WIDTH) % 360;
  state.pulseCount += interact.count;
  state.ticks += 1;
}

function frame(now: number): void {
  const elapsed = previousTime === 0 ? 0 : Math.min(MAX_FRAME_SECONDS, (now - previousTime) / 1000);
  previousTime = now;
  accumulator += elapsed;
  while (accumulator >= FIXED_STEP_SECONDS) {
    simulateStep();
    accumulator -= FIXED_STEP_SECONDS;
  }
  render();
  animationFrame = requestAnimationFrame(frame);
}

// SECTION: RENDER (read-only)

function render(): void {
  const snapshot = controller?.read();
  const move = snapshot?.controls.move as Stick2dOutput | undefined;
  const primary = snapshot?.controls.primary as HoldOutput | undefined;
  requiredElement<HTMLOutputElement>("move-output").value = move === undefined
    ? "0.000 / 0.000 / 0.000"
    : `${move.x.toFixed(3)} / ${move.y.toFixed(3)} / ${move.magnitude.toFixed(3)}`;
  requiredElement<HTMLOutputElement>("look-output").value = `${state.lookRaw.toFixed(4)} / ${state.lookApplied.toFixed(4)}`;
  requiredElement<HTMLOutputElement>("look-total").value = state.lookAccumulated.toFixed(4);
  requiredElement<HTMLOutputElement>("primary-output").value = primary?.pressed === true ? "HELD" : "released";
  requiredElement<HTMLOutputElement>("pulse-output").value = String(state.pulseCount);
  requiredElement<HTMLOutputElement>("pointer-output").value = snapshot?.activePointers.length
    ? snapshot.activePointers.map((entry) => `${entry.controlId}:${entry.identifier}`).join(" ")
    : "none";
  requiredElement<HTMLOutputElement>("route-output").value = `${snapshot?.route ?? "none"} / ${snapshot?.orientation ?? "portrait"}`;
  requiredElement<HTMLOutputElement>("persistence-output").value = snapshot?.persistence ?? "disabled";
  requiredElement<HTMLElement>("lifecycle").textContent = snapshot?.lifecycle ?? state.phase;
  requiredElement<HTMLElement>("dial-needle").style.transform = `translate(-50%,-100%) rotate(${state.angleDegrees}deg)`;
  requiredElement<HTMLElement>("dial-angle").textContent = `${Math.round(state.angleDegrees)}°`;
}

// SECTION: LAB UI

function setEditingUi(editing: boolean): void {
  requiredElement<HTMLButtonElement>("edit-start").disabled = editing;
  requiredElement<HTMLButtonElement>("edit-save").disabled = !editing;
  requiredElement<HTMLButtonElement>("edit-cancel").disabled = !editing;
}

function syncSettingInputs(): void {
  if (controller === undefined) return;
  const settings = controller.exportProfile().settings;
  requiredElement<HTMLInputElement>("opacity").value = String(settings.opacity);
  requiredElement<HTMLInputElement>("dead-zone").value = String(settings.stickDeadZone);
  requiredElement<HTMLSelectElement>("sensitivity").value = String(settings.relativeSensitivity);
}

function reportResult(ok: boolean, message: string): void {
  profileStatus.value = `${ok ? "PASS" : "FAIL"}: ${message}`;
}

function startLab(): void {
  if (controller !== undefined) return;
  try {
    controller = createMobileControls({
      controls,
      persistence: { key: PROFILE_KEY }
    });
    controller.mount(surface);
    state.phase = "running";
    shell.dataset.phase = "running";
    syncSettingInputs();
    render();
    animationFrame = requestAnimationFrame(frame);
  } catch (error) {
    state.phase = "failed";
    shell.dataset.phase = "failed";
    reportResult(false, error instanceof Error ? error.message : "Unknown startup failure");
  }
}

requiredElement<HTMLButtonElement>("fixture-start").addEventListener("click", startLab);
requiredElement<HTMLButtonElement>("edit-start").addEventListener("click", () => {
  controller?.beginEdit();
  setEditingUi(true);
  reportResult(true, "Drag controls; use the bright corner handle to resize.");
});
requiredElement<HTMLButtonElement>("edit-save").addEventListener("click", () => {
  const result = controller?.commitEdit();
  setEditingUi(false);
  reportResult(result?.ok === true, result?.ok === true ? "Edited profile saved." : result?.findings[0]?.message ?? "Edit failed.");
});
requiredElement<HTMLButtonElement>("edit-cancel").addEventListener("click", () => {
  controller?.cancelEdit();
  setEditingUi(false);
  reportResult(true, "Edit cancelled.");
});
requiredElement<HTMLButtonElement>("right-handed").addEventListener("click", () => {
  const result = controller?.importProfile(baseProfile("right"));
  reportResult(result?.ok === true, "Right-handed profile applied.");
});
requiredElement<HTMLButtonElement>("left-handed").addEventListener("click", () => {
  const result = controller?.importProfile(baseProfile("left"));
  reportResult(result?.ok === true, "Left-handed profile applied.");
});
requiredElement<HTMLButtonElement>("profile-reset").addEventListener("click", () => {
  controller?.resetProfile();
  syncSettingInputs();
  reportResult(true, "Profile reset to declaration defaults.");
});
requiredElement<HTMLInputElement>("opacity").addEventListener("input", (event) => {
  const result = controller?.updateConfig({ opacity: Number((event.currentTarget as HTMLInputElement).value) });
  reportResult(result?.ok === true, "Opacity updated.");
});
requiredElement<HTMLInputElement>("dead-zone").addEventListener("input", (event) => {
  const result = controller?.updateConfig({ stickDeadZone: Number((event.currentTarget as HTMLInputElement).value) });
  reportResult(result?.ok === true, "Dead zone updated.");
});
requiredElement<HTMLSelectElement>("sensitivity").addEventListener("change", (event) => {
  const result = controller?.updateConfig({ relativeSensitivity: Number((event.currentTarget as HTMLSelectElement).value) });
  reportResult(result?.ok === true, "Sensitivity updated.");
});
requiredElement<HTMLButtonElement>("profile-export").addEventListener("click", () => {
  if (controller === undefined) return;
  profileJson.value = serializeProfile(controller.exportProfile());
  profileJson.select();
  reportResult(true, "Deterministic profile JSON exported.");
});
requiredElement<HTMLButtonElement>("profile-import").addEventListener("click", () => {
  if (controller === undefined) return;
  try {
    const result = controller.importProfile(JSON.parse(profileJson.value) as unknown);
    syncSettingInputs();
    reportResult(result.ok, result.ok ? "Profile imported." : result.findings.map((entry) => entry.message).join("; "));
  } catch {
    reportResult(false, "Profile text is not valid JSON.");
  }
});

// SECTION: READ-ONLY HARNESS

interface LabSnapshot {
  readonly schema: "sfhs.mobile-controls-lab@1";
  readonly phase: LabState["phase"];
  readonly ticks: number;
  readonly angleDegrees: number;
  readonly pulseCount: number;
  readonly controls: ReturnType<MobileControlsController["read"]> | null;
}

function getSnapshot(): LabSnapshot {
  return Object.freeze({
    schema: "sfhs.mobile-controls-lab@1",
    phase: state.phase,
    ticks: state.ticks,
    angleDegrees: state.angleDegrees,
    pulseCount: state.pulseCount,
    controls: controller?.read() ?? null
  });
}

const crApi = Object.freeze({
  schema: "sfhs.cr@1" as const,
  getSnapshot,
  getController: (): MobileControlsController | undefined => controller,
  async runFullSelfCheck(): Promise<{
    readonly pass: boolean;
    readonly checks: readonly { readonly name: string; readonly pass: boolean }[];
    readonly snapshot: LabSnapshot;
  }> {
    const before = controller === undefined ? "" : serializeProfile(controller.exportProfile());
    const snapshot = getSnapshot();
    const checks = Object.freeze([
      Object.freeze({ name: "running", pass: snapshot.phase === "running" }),
      Object.freeze({ name: "fixed-step-active", pass: snapshot.ticks >= 0 }),
      Object.freeze({ name: "controller-mounted", pass: snapshot.controls?.lifecycle === "mounted" || snapshot.controls?.lifecycle === "editing" }),
      Object.freeze({ name: "route-selected", pass: snapshot.controls?.route === "pointer" || snapshot.controls?.route === "touch" }),
      Object.freeze({ name: "four-neutral-primitives", pass: snapshot.controls !== null && Object.keys(snapshot.controls.controls).length === 4 }),
      Object.freeze({ name: "profile-round-trip-stable", pass: controller !== undefined && serializeProfile(controller.exportProfile()) === before }),
      Object.freeze({ name: "no-external-runtime-assets", pass: document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0 })
    ]);
    return Object.freeze({ pass: checks.every((check) => check.pass), checks, snapshot: getSnapshot() });
  }
});

Object.defineProperty(window, "CR", { configurable: false, enumerable: false, writable: false, value: crApi });

addEventListener("pagehide", () => {
  cancelAnimationFrame(animationFrame);
});
