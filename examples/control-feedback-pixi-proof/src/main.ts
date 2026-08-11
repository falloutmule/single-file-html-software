import { p0ControlPresets, type ControlPreset } from "@sfhs/control-feedback-contract";
import { mountDomControl } from "@sfhs/control-feedback-dom";
import { createPixiV8Control, pixiV8ControlApproximations, type PixiV8ControlController } from "@sfhs/control-feedback-pixi-v8";
import type { ControlFeedbackActivationProposal, ControlFeedbackEvent, ControlFeedbackSignal } from "@sfhs/control-feedback-runtime";
import { Application, Graphics, Rectangle, Text } from "pixi.js";

function preset(id: string): ControlPreset {
  const match = p0ControlPresets.find((candidate) => candidate.id === id);
  if (match === undefined) throw new Error(`Missing preset ${id}`);
  return match;
}

const host = document.getElementById("pixi-host");
const keyboardTarget = document.getElementById("keyboard-target");
const parityTarget = document.getElementById("dom-parity");
const diagnostic = document.getElementById("diagnostic");
if (!(host instanceof HTMLElement) || !(keyboardTarget instanceof HTMLButtonElement) || !(parityTarget instanceof HTMLElement)) throw new Error("Missing proof hosts.");
const keyboardElement = keyboardTarget;
const hostElement = host;
const parityElement = parityTarget;

async function boot(): Promise<void> {
const application = new Application();
await application.init({ width: 640, height: 300, backgroundColor: 0x0b1020, autoDensity: true, autoStart: false, sharedTicker: false, resolution: Math.min(devicePixelRatio || 1, 2), preference: "webgl", preferWebGLVersion: 2 });
hostElement.replaceChildren(application.canvas);
const backdrop = new Graphics().roundRect(24, 24, 592, 252, 18).fill({ color: 0x151e31 }).roundRect(42, 48, 556, 204, 14).stroke({ color: 0x415986, width: 2 });
application.stage.addChild(backdrop);

const activations: Array<{ id: string; proposal: ControlFeedbackActivationProposal }> = [];
const cues: Array<{ id: string; role: string }> = [];
const controllers: Record<string, PixiV8ControlController> = {};
function updateDiagnostic(): void { if (diagnostic !== null) diagnostic.textContent = `${activations.length} activations / ${cues.length} cues`; }

function add(id: string, presetId: string, label: string, x: number, onActivation?: (proposal: ControlFeedbackActivationProposal) => void, keyboard = false, y = 96): PixiV8ControlController {
  const controller = createPixiV8Control({
    parent: application.stage,
    controlId: id,
    preset: preset(presetId),
    label,
    geometry: { x, y, width: 150, height: 64 },
    lifecycleWindow: window,
    ...(keyboard ? { keyboardTarget: keyboardElement } : {}),
    onActivate(proposal) { activations.push({ id, proposal }); onActivation?.(proposal); updateDiagnostic(); },
    onCue(cue) { cues.push({ id, role: cue.role }); updateDiagnostic(); }
  });
  controllers[id] = controller;
  return controller;
}

add("press", "uv-plastic-inset-press", "Press", 62, undefined, true);
const toggle = add("toggle", "uv-basic-toggle", "Power", 245, (proposal) => { if (proposal.kind === "toggle") toggle.setModel({ selected: proposal.proposedSelected }); });
add("ripple", "mu-multi-activation-ripple", "Ripple", 428);
add("choice", "uv-skeuo-icon-choice", "Tool", 245, undefined, false, 188);

const parityPreset = preset("uv-plastic-inset-press");
const parityPixi = createPixiV8Control({ parent: application.stage, controlId: "parity-pixi", preset: parityPreset, label: "Parity", geometry: { x: -1000, y: -1000, width: 120, height: 52 } });
const parityDom = mountDomControl({ container: parityElement, controlId: "parity-dom", preset: parityPreset, label: "Parity" });

function comparable(events: readonly ControlFeedbackEvent[]): unknown {
  return events.map((event) => ({ kind: event.kind, source: event.source, sourceId: event.sourceId, origin: event.origin, interaction: event.interaction, reason: event.reason, proposal: event.proposal, effectId: event.effectId, cueRole: event.cueRole, cueId: event.cueId }));
}

function runParityTrace(trace: readonly ControlFeedbackSignal[]): { equal: boolean; dom: unknown[]; pixi: unknown[] } {
  const dom = trace.map((signal) => comparable(parityDom.dispatchNormalized(signal).events));
  const pixi = trace.map((signal) => comparable(parityPixi.dispatchNormalized(signal).events));
  return { equal: JSON.stringify(dom) === JSON.stringify(pixi), dom, pixi };
}

let frame = 0;
function render(atMs: number): void {
  for (const controller of Object.values(controllers)) controller.update(atMs);
  application.render();
  frame = requestAnimationFrame(render);
}
frame = requestAnimationFrame(render);
updateDiagnostic();
document.body.dataset.phase = "ready";

const api = Object.freeze({
  application,
  controllers,
  activations,
  cues,
  approximations: pixiV8ControlApproximations,
  runParityTrace,
  boundedSlotProbe() {
    const layerRoot = controllers.choice?.root.children[0];
    const slot = layerRoot?.children.find((child) => child.label === "content:0");
    const slotText = slot?.children[0];
    const legacy = controllers.choice?.root.children[2];
    return {
      position: { x: slot?.position.x, y: slot?.position.y },
      pivot: { x: slot?.pivot.x, y: slot?.pivot.y },
      text: slotText instanceof Text ? slotText.text : undefined,
      legacyVisible: legacy?.visible
    };
  },
  visualProbe() {
    const extracted = application.renderer.extract.pixels({ target: application.stage, frame: new Rectangle(0, 0, 640, 300) });
    const colors = new Set<string>();
    let nonTransparent = 0;
    for (let index = 0; index < extracted.pixels.length; index += 4) {
      const alpha = extracted.pixels[index + 3] ?? 0;
      if (alpha > 0) nonTransparent += 1;
      if (colors.size < 64) colors.add(`${extracted.pixels[index]},${extracted.pixels[index + 1]},${extracted.pixels[index + 2]},${alpha}`);
    }
    const backdropPixels = application.renderer.extract.pixels({ target: backdrop, frame: new Rectangle(0, 0, 640, 300) });
    const backdropAlpha = Array.from(backdropPixels.pixels).filter((_, index) => index % 4 === 3 && (backdropPixels.pixels[index] ?? 0) > 0).length;
    const gl = application.canvas.getContext("webgl2") ?? application.canvas.getContext("webgl");
    return { width: extracted.width, height: extracted.height, nonTransparent, distinctColors: colors.size, backdropAlpha, stageChildren: application.stage.children.length, stageVisible: application.stage.visible, stageRenderable: application.stage.renderable, backdropVisible: backdrop.visible, backdropRenderable: backdrop.renderable, backdropInstructions: backdrop.context.instructions.length, glAvailable: gl !== null, glLost: gl?.isContextLost() ?? true };
  },
  captureProofCanvas() {
    const extracted = application.renderer.extract.canvas({ target: application.stage, frame: new Rectangle(0, 0, 640, 300) });
    if (!(extracted instanceof HTMLCanvasElement)) throw new Error("Pixi extraction did not return an HTML canvas.");
    extracted.id = "pixi-extracted-proof";
    hostElement.replaceChildren(extracted);
  },
  selfCheck() {
    return {
      pass: application.canvas instanceof HTMLCanvasElement
        && controllers.press?.root.hitArea !== null
        && pixiV8ControlApproximations.length === 4
        && document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0,
      frame
    };
  }
});
Object.assign(window, { CFPIXI: api });
}

void boot().catch((error: unknown) => {
  document.body.dataset.phase = "failed";
  if (diagnostic !== null) diagnostic.textContent = error instanceof Error ? error.message : String(error);
  console.error(error);
});
