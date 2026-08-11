import { mountDomControl, type DomControlController } from "@sfhs/control-feedback-dom";
import { canonicalControlThirdPartyNoticesJson, controlThirdPartyNoticesText } from "@sfhs/control-feedback-notices";
import { controlFeedbackPresetEntries, controlFeedbackPresets, controlFeedbackVisualConformance, vettedControlFeedbackPack } from "@sfhs/control-feedback-presets";

const library = document.getElementById("library");
const summary = document.getElementById("summary");
if (!(library instanceof HTMLElement)) throw new Error("Missing library mount.");

const controllers: Record<string, DomControlController> = {};
let activationCount = 0;
function previewLabel(id: string, semantic: "momentary" | "toggle" | "choice"): string {
  if (id === "uv-like-pop-toggle") return "♥";
  if (semantic === "toggle") return "";
  if (semantic === "choice") return "◆";
  if (id === "an-status-cycle") return "Submit";
  return "Preview";
}

for (const entry of controlFeedbackPresetEntries) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.presetId = entry.preset.id;
  const meta = document.createElement("div");
  meta.className = "meta";
  const category = document.createElement("span");
  category.textContent = entry.category;
  const priority = document.createElement("span");
  priority.textContent = entry.priority;
  meta.append(category, priority);
  const title = document.createElement("h2");
  title.className = "title";
  title.textContent = entry.preset.title;
  const mount = document.createElement("div");
  mount.className = "mount";
  card.append(meta, title, mount);
  library.append(card);
  const controller: DomControlController = mountDomControl({
    container: mount,
    controlId: entry.preset.id,
    preset: entry.preset,
    label: entry.preset.title,
    visualLabel: previewLabel(entry.preset.id, entry.preset.semantic.kind),
    onActivate(proposal) {
      activationCount += 1;
      if (proposal.kind === "toggle") controller.setModel({ selected: proposal.proposedSelected });
      if (proposal.kind === "choice") controller.setModel({ selected: true });
    }
  });
  controllers[entry.preset.id] = controller;
}

const noticeJson = canonicalControlThirdPartyNoticesJson(controlFeedbackPresets);
const noticeText = controlThirdPartyNoticesText(controlFeedbackPresets);
if (summary !== null) summary.textContent = `${controlFeedbackPresets.length} presets / ${Object.keys(controllers).length} live controls / deterministic notices`;

const api = Object.freeze({
  controllers,
  noticeJson,
  noticeText,
  pack: vettedControlFeedbackPack,
  visualConformance: controlFeedbackVisualConformance,
  get activationCount() { return activationCount; },
  setReducedMotion(value: boolean) { for (const controller of Object.values(controllers)) controller.setReducedMotion(value); },
  selfCheck() {
    const roots = [...document.querySelectorAll<HTMLElement>(".sfhs-cf-root")];
    const inputs = roots.map((root) => root.querySelector(".sfhs-cf-interactive"));
    return Object.freeze({
      pass: roots.length === 25
        && Object.keys(controllers).length === 25
        && inputs.every((input) => input instanceof HTMLButtonElement || input instanceof HTMLInputElement)
        && document.querySelectorAll("script[src^='http'],link[href^='http'],img[src^='http']").length === 0,
      count: roots.length,
      checkboxCount: inputs.filter((input) => input instanceof HTMLInputElement && input.type === "checkbox" && input.getAttribute("role") !== "switch").length,
      switchCount: inputs.filter((input) => input instanceof HTMLInputElement && input.getAttribute("role") === "switch").length,
      radioCount: inputs.filter((input) => input instanceof HTMLInputElement && input.type === "radio").length
    });
  }
});

Object.assign(window, { CFLIB: api });
document.body.dataset.phase = "ready";
declare global { interface Window { CFLIB: typeof api; } }
