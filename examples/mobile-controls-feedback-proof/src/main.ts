import { attachMobileControlsFeedback } from "@sfhs/control-feedback-mobile-controls-dom";
import { findControlFeedbackPreset } from "@sfhs/control-feedback-presets";
import { createMobileControls, type MobileControlDeclaration } from "@sfhs/mobile-controls";

const controls: readonly MobileControlDeclaration[] = [
  { id: "primary", type: "hold", label: "Hold", layout: { portrait: { x: 0.08, y: 0.72, width: 0.27, height: 0.12 }, landscape: { x: 0.06, y: 0.68, width: 0.2, height: 0.18 } } },
  { id: "pulse", type: "pulse", label: "Pulse", layout: { portrait: { x: 0.63, y: 0.72, width: 0.27, height: 0.12 }, landscape: { x: 0.74, y: 0.68, width: 0.2, height: 0.18 } } },
  { id: "shield", type: "toggle", label: "Shield", layout: { portrait: { x: 0.63, y: 0.55, width: 0.27, height: 0.1 }, landscape: { x: 0.74, y: 0.45, width: 0.2, height: 0.16 } } }
];
const root = document.getElementById("mobile-controls");
const state = document.getElementById("state");
if (!(root instanceof HTMLElement) || !(state instanceof HTMLOutputElement)) throw new Error("Missing proof elements.");
const mobile = createMobileControls({ controls });
mobile.mount(root);
const cues: { controlId: string; role: string }[] = [];
const feedback = attachMobileControlsFeedback({
  root,
  controller: mobile,
  bindings: [
    { controlId: "primary", preset: findControlFeedbackPreset("uv-plastic-inset-press")! },
    { controlId: "pulse", preset: findControlFeedbackPreset("mu-multi-activation-ripple")! },
    { controlId: "shield", preset: findControlFeedbackPreset("uv-basic-toggle")! }
  ],
  onCue(controlId, cue) { cues.push({ controlId, role: cue.role }); }
});
mobile.subscribe((snapshot) => { state.value = JSON.stringify(snapshot.controls); });
state.value = JSON.stringify(mobile.read().controls);
const api = Object.freeze({
  mobile,
  feedback,
  cues,
  failedAttachIsAtomic() {
    const temporaryRoot = document.createElement("div");
    document.body.append(temporaryRoot);
    const temporaryMobile = createMobileControls({ controls });
    temporaryMobile.mount(temporaryRoot);
    const before = {
      hosts: temporaryRoot.querySelectorAll(".sfhs-mobile-feedback-host").length,
      styles: temporaryRoot.querySelectorAll("style[data-sfhs-mobile-controls-feedback]").length,
      attached: temporaryRoot.querySelectorAll('[data-sfhs-feedback-attached="true"]').length
    };
    const valid = findControlFeedbackPreset("uv-plastic-inset-press")!;
    let rejected = false;
    try {
      attachMobileControlsFeedback({
        root: temporaryRoot,
        controller: temporaryMobile,
        bindings: [
          { controlId: "primary", preset: valid },
          { controlId: "pulse", preset: { ...valid, schema: "invalid" } as never }
        ]
      });
    } catch { rejected = true; }
    const after = {
      hosts: temporaryRoot.querySelectorAll(".sfhs-mobile-feedback-host").length,
      styles: temporaryRoot.querySelectorAll("style[data-sfhs-mobile-controls-feedback]").length,
      attached: temporaryRoot.querySelectorAll('[data-sfhs-feedback-attached="true"]').length
    };
    temporaryMobile.destroy(); temporaryRoot.remove();
    return { rejected, unchanged: JSON.stringify(before) === JSON.stringify(after), before, after };
  },
  failedInitialSyncIsAtomic() {
    const temporaryRoot = document.createElement("div");
    document.body.append(temporaryRoot);
    const temporaryMobile = createMobileControls({ controls });
    temporaryMobile.mount(temporaryRoot);
    const before = temporaryRoot.innerHTML;
    let rejected = false;
    try {
      attachMobileControlsFeedback({
        root: temporaryRoot,
        controller: temporaryMobile,
        bindings: [{ controlId: "primary", preset: findControlFeedbackPreset("uv-plastic-inset-press")! }],
        model() { throw new Error("proof model failure"); }
      });
    } catch { rejected = true; }
    const after = temporaryRoot.innerHTML;
    const clean = temporaryRoot.querySelectorAll(".sfhs-mobile-feedback-host,style[data-sfhs-mobile-controls-feedback],[data-sfhs-feedback-attached=true]").length === 0;
    temporaryMobile.destroy(); temporaryRoot.remove();
    return { rejected, unchanged: before === after, clean };
  },
  selfCheck() {
    return {
      pass: feedback.controlIds.length === 3 && root.querySelectorAll(".sfhs-mobile-feedback-host").length === 3,
      mobileOwnsOutputs: true,
      feedbackOwnsPresentation: true
    };
  }
});
Object.assign(window, { CFMB: api });
document.body.dataset.phase = "ready";
declare global { interface Window { CFMB: typeof api; } }
