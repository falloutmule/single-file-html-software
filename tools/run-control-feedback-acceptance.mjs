import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

import { validateControlPresets } from "../packages/control-feedback-contract/src/index.ts";
import { controlFeedbackPresetEntries } from "../packages/control-feedback-presets/src/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const evidenceRoot = resolve(repositoryRoot, ".sfhs-evidence", "control-feedback-v0");
const proofs = [
  { id: "dom", tool: "examples/control-feedback-dom-proof/tools/run-browser-proof.mjs", report: ".sfhs-evidence/control-feedback-dom-v0/browser-proof.json" },
  { id: "pixi-v8", tool: "examples/control-feedback-pixi-proof/tools/run-browser-proof.mjs", report: ".sfhs-evidence/control-feedback-pixi-v8-v0/browser-proof.json" },
  { id: "cues", tool: "examples/control-feedback-cue-proof/tools/run-browser-proof.mjs", report: ".sfhs-evidence/control-feedback-cue-v0/browser-proof.json" },
  { id: "preset-library", tool: "examples/control-feedback-library-proof/tools/run-browser-proof.mjs", report: ".sfhs-evidence/control-feedback-library-v0/browser-proof.json" },
  { id: "editor-exporter", tool: "examples/control-feedback-editor/tools/run-browser-proof.mjs", report: ".sfhs-evidence/control-feedback-editor-v0/browser-proof.json" },
  { id: "mobile-controls-interop", tool: "examples/mobile-controls-feedback-proof/tools/run-browser-proof.mjs", report: ".sfhs-evidence/mobile-controls-feedback-v0/browser-proof.json" }
];

for (const proof of proofs) {
  const result = spawnSync(process.execPath, [resolve(repositoryRoot, proof.tool)], { cwd: repositoryRoot, env: process.env, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Control Feedback acceptance proof failed: ${proof.id}.`);
}

const reports = [];
for (const proof of proofs) {
  const report = JSON.parse(await readFile(resolve(repositoryRoot, proof.report), "utf8"));
  if (report.pass !== true || typeof report.artifact?.sha256 !== "string") throw new Error(`Control Feedback evidence is invalid: ${proof.id}.`);
  reports.push({ id: proof.id, schema: report.schema, artifact: report.artifact, pass: true });
}

const presets = controlFeedbackPresetEntries.map((entry) => entry.preset);
const validation = validateControlPresets(presets);
if (!validation.valid || presets.length !== 25) throw new Error("Control Feedback preset library validation failed.");
const donors = { uiverse: 0, animata: 0, magicui: 0 };
for (const preset of presets) if ("donor" in preset.provenance) donors[preset.provenance.donor] += 1;
if (donors.uiverse !== 11 || donors.animata !== 8 || donors.magicui !== 6) throw new Error("Control Feedback donor inventory drifted.");

const sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
const aggregate = {
  schema: "sfhs.control-feedback-acceptance@0",
  pass: true,
  sourceRevision,
  environment: { platform: process.platform, architecture: process.arch, node: process.version },
  presetLibrary: { count: presets.length, donors, validation: "pass", frozenProvenance: true },
  proofs: reports,
  offline: { deterministicIndependentPacks: true, http: true, fileProtocol: true, unexpectedRuntimeRequests: 0 },
  physicalDevice: { executed: false, result: "not-claimed", note: "Samsung S21 Ultra profiles in these proofs are Chromium emulation only." }
};
await mkdir(evidenceRoot, { recursive: true });
await writeFile(resolve(evidenceRoot, "acceptance.json"), `${JSON.stringify(aggregate, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(aggregate, null, 2)}\n`);
