import {
  canonicalControlPackJson,
  canonicalControlPresetJson,
  controlPackSchema,
  validateControlPack,
  validateControlPreset,
  type ControlPack,
  type ControlPreset
} from "@sfhs/control-feedback-contract";
import {
  canonicalControlThirdPartyNoticesJson,
  controlThirdPartyNoticesText
} from "@sfhs/control-feedback-notices";
import { controlFeedbackDemoShellHtml } from "./demo-shell.generated.ts";

export const packageIdentity = "@sfhs/control-feedback-exporter" as const;

export interface ControlExportBundle {
  readonly presetJson: string;
  readonly packJson: string;
  readonly noticesJson: string;
  readonly noticesText: string;
  readonly domConfigJson: string;
  readonly pixiV8ConfigJson: string;
  readonly demoHtml: string;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function scriptJson(value: string): string {
  return value.replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

function canonicalAdapterConfig(renderer: "dom" | "pixi-v8", preset: ControlPreset): string {
  const geometry = preset.geometry ?? { widthPx: 180, heightPx: 56, minimumHitTargetPx: 44 };
  const config = renderer === "dom"
    ? { renderer, controlId: `${preset.id}-control`, presetId: preset.id, label: preset.content?.label ?? preset.title, externalStateAuthority: true }
    : { renderer, controlId: `${preset.id}-control`, presetId: preset.id, label: preset.content?.label ?? preset.title, geometry: { x: 0, y: 0, width: geometry.widthPx, height: geometry.heightPx }, externalStateAuthority: true, gradientApproximation: "adapter-register" };
  return JSON.stringify(config, null, 2) + "\n";
}

export function createStandaloneControlDemo(preset: ControlPreset): string {
  const validation = validateControlPreset(preset);
  if (!validation.valid) throw new TypeError(`Cannot export invalid preset: ${validation.findings.map((item) => `${item.path} ${item.code}`).join(", ")}`);
  const presetJson = canonicalControlPresetJson(preset);
  const hostArtifactHtml = controlFeedbackDemoShellHtml;
  if (!hostArtifactHtml.includes("</body>") || !hostArtifactHtml.includes("CFDEMO")) throw new TypeError("Standalone demo requires the generated SFHS demo shell.");
  const originalEntryScript = hostArtifactHtml.indexOf('<script data-sfhs-inline="entry"');
  if (originalEntryScript < 0) throw new TypeError("Standalone demo host is missing the packed SFHS entry marker.");
  const sanitizedPrefix = hostArtifactHtml.slice(0, originalEntryScript)
    .replace(/<script id="sfhs-exported-control"[\s\S]*?<\/script>/gu, "")
    .replace(/<style id="sfhs-exported-demo-style"[\s\S]*?<\/style>/gu, "")
    .replace(/<section id="sfhs-exported-notices"[\s\S]*?<\/section>/gu, "");
  const withoutPriorExport = `${sanitizedPrefix}${hostArtifactHtml.slice(originalEntryScript)}`;
  if (/(?:src|href)=["']https?:/iu.test(withoutPriorExport)) throw new TypeError("Standalone demo host contains a runtime external reference.");
  const notices = controlThirdPartyNoticesText([preset]);
  const noticeMarkup = "donor" in preset.provenance
    ? `<section id="sfhs-exported-notices" class="sfhs-exported-notices" aria-label="Third-party notices"><h2>Third-Party Notices</h2><pre>${escapeHtml(notices)}</pre></section>`
    : "";
  const injection = `<style id="sfhs-exported-demo-style">.sfhs-exported-notices{max-width:760px;margin:0 auto 40px;padding:18px;color:#91a0c5}.sfhs-exported-notices pre{white-space:pre-wrap;font:11px/1.5 ui-monospace,monospace}</style><script id="sfhs-exported-control" type="application/json">${scriptJson(presetJson)}</script>${noticeMarkup}`;
  const entryScript = withoutPriorExport.indexOf('<script data-sfhs-inline="entry"');
  if (entryScript < 0) throw new TypeError("Standalone demo host is missing the packed SFHS entry marker.");
  return `${withoutPriorExport.slice(0, entryScript)}${injection}${withoutPriorExport.slice(entryScript)}`.replaceAll("\r\n", "\n");
}

export function createControlExportBundle(preset: ControlPreset, pack?: ControlPack): ControlExportBundle {
  const selectedPack = pack ?? { schema: controlPackSchema, id: `${preset.id}-pack`, title: `${preset.title} Pack`, presets: [preset] };
  const packValidation = validateControlPack(selectedPack);
  if (!packValidation.valid || !selectedPack.presets.some((item) => item.id === preset.id)) throw new TypeError("Export pack must be valid and include the selected preset.");
  return Object.freeze({
    presetJson: canonicalControlPresetJson(preset),
    packJson: canonicalControlPackJson(selectedPack),
    noticesJson: canonicalControlThirdPartyNoticesJson(selectedPack.presets),
    noticesText: controlThirdPartyNoticesText(selectedPack.presets),
    domConfigJson: canonicalAdapterConfig("dom", preset),
    pixiV8ConfigJson: canonicalAdapterConfig("pixi-v8", preset),
    demoHtml: createStandaloneControlDemo(preset)
  });
}
