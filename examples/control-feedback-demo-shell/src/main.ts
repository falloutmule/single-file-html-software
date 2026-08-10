import type { ControlPreset, ControlStatus } from "@sfhs/control-feedback-contract";
import { mountDomControl } from "@sfhs/control-feedback-dom/trusted";

const embedded = document.getElementById("sfhs-exported-control");
if (!(embedded instanceof HTMLScriptElement) || embedded.textContent === null) throw new Error("Missing embedded SFHS control preset.");
// The exporter validates immediately before embedding; the shell carries no donor registry.
const preset = JSON.parse(embedded.textContent) as ControlPreset;
const preview = document.getElementById("preview");
const title = document.getElementById("title");
const count = document.getElementById("count");
if (!(preview instanceof HTMLElement) || title === null || count === null) throw new Error("Missing demo mount.");
title.textContent = preset.title;
let activations = 0;
let time = 0;
const now = (): number => { time = Math.max(time, performance.now()); return time; };
const controller = mountDomControl({
  container: preview, controlId: "portable-demo", preset,
  onActivate(proposal) {
    activations += 1;
    if (proposal.kind === "toggle") controller.setModel({ selected: proposal.proposedSelected });
    if (proposal.kind === "choice") controller.setModel({ selected: true });
    count.textContent = `${activations} activation${activations === 1 ? "" : "s"}`;
  }
});

function reset(): void {
  if (controller.read().owner !== undefined) controller.dispatchNormalized({ kind: "contact-cancel", reason: "adapter-reset", atMs: now() });
  controller.dispatchNormalized({ kind: "hover-set", hovered: false, atMs: now() });
  controller.dispatchNormalized({ kind: "focus-set", focused: false, focusVisible: false, atMs: now() });
  controller.setModel({ enabled: true, selected: false, status: "idle" });
}
function setState(state: string): void {
  reset();
  if (state === "selected") controller.setModel({ selected: true });
  else if (state === "disabled") controller.setModel({ enabled: false });
  else if (state !== "idle") controller.setModel({ status: state as ControlStatus });
}
function torture(name: "outside" | "cancel" | "focus" | "reduced"): boolean {
  reset(); const before = activations;
  controller.dispatchNormalized({ kind: "contact-begin", source: name === "focus" ? "keyboard" : "pointer", sourceId: `${name}:1`, atMs: now() });
  if (name === "outside") controller.dispatchNormalized({ kind: "contact-end", sourceId: `${name}:1`, inside: false, atMs: now() });
  else if (name === "cancel") controller.dispatchNormalized({ kind: "contact-cancel", sourceId: `${name}:1`, reason: "pointer-cancel", atMs: now() });
  else if (name === "focus") controller.dispatchNormalized({ kind: "contact-cancel", sourceId: `${name}:1`, reason: "focus-lost", atMs: now() });
  else { controller.dispatchNormalized({ kind: "contact-cancel", sourceId: `${name}:1`, reason: "adapter-reset", atMs: now() }); const reduced = controller.setReducedMotion(true); const pass = reduced.reducedMotion && reduced.presentation.effects.length === 0; controller.setReducedMotion(false); return pass; }
  return activations === before && controller.read().owner === undefined && controller.read().interaction === "rest";
}
for (const button of document.querySelectorAll<HTMLButtonElement>("[data-state]")) button.addEventListener("click", () => setState(button.dataset.state ?? "idle"));
const api = Object.freeze({ preset, controller, setState, torture, get activationCount() { return activations; }, selfCheck() { return { pass: controller.root.isConnected && document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0, semantic: preset.semantic.kind }; } });
Object.assign(window, { CFDEMO: api });
document.body.dataset.phase = "ready";
declare global { interface Window { CFDEMO: typeof api; } }
