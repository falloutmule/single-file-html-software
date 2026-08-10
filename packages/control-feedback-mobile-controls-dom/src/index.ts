import { validateControlPreset } from "@sfhs/control-feedback-contract";
import { mountDomControl, type DomControlController } from "@sfhs/control-feedback-dom";
import type { HoldOutput, MobileControlsSnapshot, PulseOutput, ToggleOutput } from "@sfhs/mobile-controls";

import type {
  AttachMobileControlsFeedbackOptions,
  MobileControlFeedbackBinding,
  MobileControlsFeedbackBridge
} from "./types.ts";

export const packageIdentity = "@sfhs/control-feedback-mobile-controls-dom" as const;

const bridgeStyle = `
.sfhs-mobile-controls-root [data-sfhs-feedback-attached="true"]>.sfhs-mobile-control-label{opacity:0}
.sfhs-mobile-feedback-host{position:absolute;z-index:2;display:grid;place-items:center;pointer-events:none}
.sfhs-mobile-feedback-host .sfhs-cf-root{width:100%!important;height:100%!important;min-width:0;min-height:0;pointer-events:none}
.sfhs-mobile-feedback-host .sfhs-cf-visual,.sfhs-mobile-feedback-host .sfhs-cf-content{width:100%!important;height:100%!important}
.sfhs-mobile-feedback-host .sfhs-cf-interactive{pointer-events:none!important}
.sfhs-mobile-controls-root [data-sfhs-resize-handle]{z-index:30}
`;

interface BindingState {
  readonly binding: MobileControlFeedbackBinding;
  readonly element: HTMLElement;
  readonly host: HTMLElement;
  readonly feedback: DomControlController;
  active: boolean;
  toggleState: boolean;
  traceSequence: number;
}

function findControl(root: HTMLElement, controlId: string): HTMLElement | undefined {
  return [...root.querySelectorAll<HTMLElement>("[data-sfhs-control-id]")].find((element) => element.dataset.sfhsControlId === controlId);
}

function outputFor(snapshot: MobileControlsSnapshot, controlId: string): HoldOutput | PulseOutput | ToggleOutput {
  const output = snapshot.controls[controlId];
  if (output === undefined) throw new Error(`Mobile Controls snapshot is missing ${controlId}.`);
  if (output.type !== "hold" && output.type !== "pulse" && output.type !== "toggle") {
    throw new Error(`Control Feedback bridge supports discrete controls only; ${controlId} is ${output.type}.`);
  }
  return output;
}

function syncHostGeometry(state: BindingState): void {
  for (const property of ["left", "top", "width", "height"] as const) state.host.style[property] = state.element.style[property];
}

export function attachMobileControlsFeedback(options: AttachMobileControlsFeedbackOptions): MobileControlsFeedbackBridge {
  if (options.bindings.length === 0) throw new Error("At least one Mobile Controls feedback binding is required.");
  const ids = options.bindings.map((binding) => binding.controlId);
  if (new Set(ids).size !== ids.length) throw new Error("Mobile Controls feedback bindings must have unique control IDs.");

  const initial = options.controller.read();
  if (initial.lifecycle !== "mounted" && initial.lifecycle !== "editing") throw new Error("Mount Mobile Controls before attaching feedback.");
  const prepared = options.bindings.map((binding) => {
    const validation = validateControlPreset(binding.preset);
    if (!validation.valid) throw new Error(`Invalid feedback preset for ${binding.controlId}: ${validation.findings.map((finding) => `${finding.path} ${finding.code}`).join(", ")}`);
    const element = findControl(options.root, binding.controlId);
    if (element === undefined) throw new Error(`Mounted Mobile Controls element ${binding.controlId} was not found.`);
    if (element.dataset.sfhsFeedbackAttached === "true") throw new Error(`Mobile Controls element ${binding.controlId} already has feedback attached.`);
    return { binding, element, output: outputFor(initial, binding.controlId) };
  });
  const document = options.root.ownerDocument;
  const view = document.defaultView;
  if (view === null) throw new Error("Mobile Controls feedback requires a live Window.");
  const style = document.createElement("style");
  style.dataset.sfhsMobileControlsFeedback = "v0";
  style.textContent = bridgeStyle;
  options.root.append(style);
  const states = new Map<string, BindingState>();
  let lastAtMs = 0;
  let destroyed = false;
  const now = (): number => {
    let value: number;
    try { value = (options.clock ?? (() => view.performance.now()))(); } catch { return lastAtMs; }
    if (!Number.isFinite(value) || value < 0) return lastAtMs;
    lastAtMs = Math.max(lastAtMs, value);
    return lastAtMs;
  };

  const cleanupStates = (): void => {
    for (const state of states.values()) {
      try { state.feedback.destroy(); } catch { /* DOM ownership must still be released after a consumer callback/clock failure. */ }
      delete state.element.dataset.sfhsFeedbackAttached;
      state.host.remove();
    }
    states.clear();
    style.remove();
  };

  try {
    for (const { binding, element, output } of prepared) {
      const host = document.createElement("span");
      host.className = "sfhs-mobile-feedback-host";
      host.setAttribute("aria-hidden", "true");
      options.root.append(host);
      let feedback: DomControlController;
      try {
        feedback = mountDomControl({
          container: host,
          controlId: `mobile-feedback.${binding.controlId}`,
          preset: binding.preset,
          enabled: initial.lifecycle === "mounted",
          selected: output.type === "toggle" ? output.state : false,
          ...(options.reducedMotion === undefined ? {} : { reducedMotion: options.reducedMotion }),
          clock: now,
          onCue(cue) { options.onCue?.(binding.controlId, cue); }
        });
      } catch (error) {
        host.remove();
        throw error;
      }
      feedback.interactive.tabIndex = -1;
      feedback.interactive.setAttribute("aria-hidden", "true");
      feedback.interactive.setAttribute("inert", "");
      element.dataset.sfhsFeedbackAttached = "true";
      const state: BindingState = {
        binding,
        element,
        host,
        feedback,
        active: initial.activePointers.some((owner) => owner.controlId === binding.controlId),
        toggleState: output.type === "toggle" ? output.state : false,
        traceSequence: 0
      };
      syncHostGeometry(state);
      states.set(binding.controlId, state);
    }
  } catch (error) {
    cleanupStates();
    throw error;
  }

  const traceActivation = (state: BindingState): void => {
    state.traceSequence += 1;
    const sourceId = `mobile-controls:${state.binding.controlId}:${state.traceSequence}`;
    state.feedback.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId, origin: { x: 0.5, y: 0.5 }, atMs: now() });
    state.feedback.dispatchNormalized({ kind: "contact-end", sourceId, inside: true, origin: { x: 0.5, y: 0.5 }, atMs: now() });
  };

  const applySnapshot = (snapshot: MobileControlsSnapshot): void => {
    if (destroyed) return;
    for (const [controlId, state] of states) {
      syncHostGeometry(state);
      const output = outputFor(snapshot, controlId);
      const active = snapshot.activePointers.some((owner) => owner.controlId === controlId);
      const external = options.model?.(controlId, snapshot) ?? {};
      const enabled = external.enabled ?? snapshot.lifecycle === "mounted";
      if (output.type === "hold") {
        if (active && !state.active && enabled) {
          state.traceSequence += 1;
          state.feedback.dispatchNormalized({ kind: "contact-begin", source: "pointer", sourceId: `mobile-controls:${controlId}:${state.traceSequence}`, origin: { x: 0.5, y: 0.5 }, atMs: now() });
        } else if (!active && state.active && state.feedback.read().owner !== undefined) {
          state.feedback.dispatchNormalized({ kind: "contact-cancel", reason: "adapter-reset", atMs: now() });
        }
      } else if (output.type === "pulse") {
        if (active && !state.active && enabled) traceActivation(state);
      } else {
        if (output.state !== state.toggleState && active && !state.active && enabled) traceActivation(state);
        state.toggleState = output.state;
      }
      state.active = active;
      state.feedback.setModel({ enabled, selected: output.type === "toggle" ? output.state : false, status: external.status ?? "idle" });
    }
  };

  let unsubscribe = (): void => {};
  try {
    unsubscribe = options.controller.subscribe(applySnapshot);
    applySnapshot(initial);
  } catch (error) {
    unsubscribe();
    cleanupStates();
    throw error;
  }
  return Object.freeze({
    controlIds: Object.freeze([...ids]),
    read(controlId: string) {
      const state = states.get(controlId);
      if (state === undefined) throw new Error(`Unknown Mobile Controls feedback binding ${controlId}.`);
      return state.feedback.read();
    },
    sync() { applySnapshot(options.controller.read()); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      cleanupStates();
    }
  });
}

export type {
  AttachMobileControlsFeedbackOptions,
  MobileControlFeedbackBinding,
  MobileControlFeedbackModel,
  MobileControlsFeedbackBridge
} from "./types.ts";
