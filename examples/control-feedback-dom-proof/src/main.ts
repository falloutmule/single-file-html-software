import { p0ControlPresets, type ControlPreset } from "@sfhs/control-feedback-contract";
import { mountDomControl, type DomControlController } from "@sfhs/control-feedback-dom";
import type { ControlFeedbackActivationProposal, ControlFeedbackEvent } from "@sfhs/control-feedback-runtime";

function preset(id: string): ControlPreset {
  const match = p0ControlPresets.find((candidate) => candidate.id === id);
  if (match === undefined) throw new Error(`Missing preset ${id}`);
  return match;
}

function mount(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing mount ${id}`);
  return element;
}

const activations: Array<{ id: string; proposal: ControlFeedbackActivationProposal }> = [];
const cues: Array<{ id: string; role: string; cueId?: string }> = [];
const events: Array<{ id: string; event: ControlFeedbackEvent }> = [];
const controllers: Record<string, DomControlController> = {};
const diagnostic = document.getElementById("diagnostic");

function updateDiagnostic(): void {
  if (diagnostic !== null) diagnostic.textContent = `${activations.length} activations / ${cues.length} cues`;
}

function add(id: string, presetId: string, label: string, onActivation?: (proposal: ControlFeedbackActivationProposal) => void): DomControlController {
  const controller = mountDomControl({
    container: mount(id),
    controlId: id,
    preset: preset(presetId),
    label,
    onActivate(proposal) {
      activations.push({ id, proposal });
      onActivation?.(proposal);
      updateDiagnostic();
    },
    onCue(cue) {
      cues.push({ id, role: cue.role, ...(cue.cueId === undefined ? {} : { cueId: cue.cueId }) });
      updateDiagnostic();
    },
    onDispatch(result) {
      for (const event of result.events) events.push({ id, event });
    }
  });
  controllers[id] = controller;
  return controller;
}

add("momentary", "uv-plastic-inset-press", "Press");
const toggle = add("toggle", "uv-basic-toggle", "Power", (proposal) => {
  if (proposal.kind === "toggle") toggle.setModel({ selected: proposal.proposedSelected });
});
const choice = add("choice", "uv-skeuo-icon-choice", "Primary", (proposal) => {
  if (proposal.kind === "choice") choice.setModel({ selected: true });
});
add("status", "an-status-cycle", "Submit");
add("ripple", "mu-multi-activation-ripple", "Ripple");

const proofApi = Object.freeze({
  activations,
  cues,
  events,
  controllers,
  setStatus(status: "idle" | "loading" | "success" | "error") { controllers.status?.setModel({ status }); },
  setDisabled(id: string, disabled: boolean) { controllers[id]?.setModel({ enabled: !disabled }); },
  setReducedMotion(id: string, reducedMotion: boolean) { controllers[id]?.setReducedMotion(reducedMotion); },
  selfCheck() {
    const momentary = controllers.momentary?.interactive;
    const toggleInput = controllers.toggle?.interactive;
    const choiceInput = controllers.choice?.interactive;
    return Object.freeze({
      pass: momentary instanceof HTMLButtonElement
        && toggleInput instanceof HTMLInputElement && toggleInput.type === "checkbox" && toggleInput.getAttribute("role") === "switch"
        && choiceInput instanceof HTMLInputElement && choiceInput.type === "radio"
        && document.querySelectorAll("style[data-sfhs-control-feedback-dom]").length === 1
        && document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0
    });
  }
});

Object.assign(window, { CF: proofApi });
document.body.dataset.phase = "ready";

declare global {
  interface Window { CF: typeof proofApi; }
}
