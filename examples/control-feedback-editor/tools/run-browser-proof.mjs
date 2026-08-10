import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { startExactArtifactServer } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(projectRoot, "..", "..");
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_CONTROL_EDITOR_EVIDENCE ?? ".sfhs-evidence/control-feedback-editor-v0");
const artifactPath = join(projectRoot, "dist", "index.html");
const exportedDemoPath = join(evidenceRoot, "exported-toggle-demo.html");
const momentaryDemoPath = join(evidenceRoot, "exported-momentary-demo.html");
const choiceDemoPath = join(evidenceRoot, "exported-choice-demo.html");
const donorDemoPath = join(evidenceRoot, "exported-donor-demo.html");
await mkdir(evidenceRoot, { recursive: true });

const first = await packProject(projectRoot, { sourceRevision: "control-feedback-editor-v0" });
const second = await packProject(projectRoot, { sourceRevision: "control-feedback-editor-v0" });
assert(Buffer.from(first.bytes).equals(Buffer.from(second.bytes)), "independent editor packs must be byte-identical");
const server = await startExactArtifactServer(first.bytes);
const browser = await chromium.launch({ headless: true });
const unexpectedRequests = [];
const consoleErrors = [];
const pageErrors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, serviceWorkers: "block" });
await context.route("**/*", async (route) => {
  const url = route.request().url();
  if (url === server.url || /^(?:about:blank|blob:|data:)/iu.test(url)) return route.continue();
  unexpectedRequests.push(url); return route.abort("blockedbyclient");
});
const page = await context.newPage();
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.goto(server.url, { waitUntil: "load" });
assert.equal(await page.evaluate(() => document.body.dataset.phase), "ready");
const selfCheck = await page.evaluate(() => window.CFEDITOR.selfCheck());
assert.equal(selfCheck.pass, true);
assert.equal(selfCheck.offlineDemo, true);

await page.locator("#template").selectOption("uv-plastic-inset-press");
await page.locator("#presetId").fill("editor-derived-plastic");
await page.locator("#presetId").dispatchEvent("input");
const derivedAttribution = await page.evaluate(() => ({ provenance: window.CFEDITOR.getPreset().provenance, notices: window.CFEDITOR.getBundle().noticesText, demoHtml: window.CFEDITOR.getBundle().demoHtml }));
assert.equal("donor" in derivedAttribution.provenance, true);
assert(derivedAttribution.notices.includes("Uiverse"), "renamed donor-derived controls must retain attribution");
assert(derivedAttribution.demoHtml.includes("From Uiverse.io"), "donor demo must embed required attribution");
await page.locator("#template").selectOption("editor-tactile-control");

const designed = await page.evaluate(() => window.CFEDITOR.update({ id: "editor-proof-control", label: "Proof control", semantic: "toggle", width: 212, height: 68, shape: "capsule", pressTravel: 7, ripple: "activation-ripple", rippleCap: 4, shine: true }));
const designedValidation = await page.evaluate(() => window.CFEDITOR.getValidation());
assert.equal(designedValidation.valid, true, JSON.stringify(designedValidation.findings));
assert.equal(designed.geometry.widthPx, 212);
assert.equal(designed.content.label, "Proof control");
assert.equal(designed.semantic.kind, "toggle");
assert.equal(await page.locator("#previewMount .sfhs-cf-root").evaluate((element) => getComputedStyle(element).width), "212px");

for (const state of ["idle", "hover", "pressed", "focused", "selected", "disabled", "loading", "success", "error"]) await page.evaluate((value) => window.CFEDITOR.setState(value), state);
const torture = await page.evaluate(() => window.CFEDITOR.tortureAll());
assert.equal(torture.length, 12);
assert(torture.every((result) => result.pass), JSON.stringify(torture));
await page.locator('[data-tab="motion"]').click();
await page.locator("#reducedMotion").check();
assert.equal(await page.locator("#previewMount .sfhs-cf-root").getAttribute("data-reduced-motion"), "true");
await page.locator('[data-tab="cues"]').click();
await page.locator("#mute").check();

const exports = await page.evaluate(() => {
  const one = window.CFEDITOR.getBundle(); const two = window.CFEDITOR.getBundle();
  return { deterministic: JSON.stringify(one) === JSON.stringify(two), preset: JSON.parse(one.presetJson), pack: JSON.parse(one.packJson), dom: JSON.parse(one.domConfigJson), pixi: JSON.parse(one.pixiV8ConfigJson), demoHtml: one.demoHtml, noticesText: one.noticesText };
});
assert.equal(exports.deterministic, true);
assert.equal(exports.pack.presets.length, 1);
assert.equal(exports.dom.externalStateAuthority, true);
assert.equal(exports.pixi.renderer, "pixi-v8");
assert(!/(?:src|href)=["']https?:/iu.test(exports.demoHtml));

const demoVariants = await page.evaluate(() => {
  const result = {};
  for (const semantic of ["momentary", "toggle", "choice"]) {
    window.CFEDITOR.update({ id: `editor-${semantic}-demo`, label: `${semantic} demo`, semantic });
    result[semantic] = window.CFEDITOR.getBundle().demoHtml;
  }
  return result;
});
const roundTrip = await page.evaluate(() => {
  const first = structuredClone(window.CFEDITOR.getPreset());
  first.visuals.base.layers.push({ role: "content", shape: "rect", opacity: 0.37, contentSlot: "icon-trailing" });
  first.visuals.status.success.layers.push({ role: "content", shape: "circle", opacity: 0.23, contentSlot: "status-icon" });
  const second = structuredClone(first);
  second.id = "editor-second-preset"; second.title = "Second preset"; second.semantic = { kind: "momentary" }; second.provenance = { origin: "sfhs-original" }; delete second.toggleVisual;
  const pack = { schema: "sfhs.control-pack@0", id: "editor-two-control-pack", title: "Two exact controls", presets: [first, second] };
  window.CFEDITOR.loadJson(JSON.stringify(pack));
  const canonicalFirst = window.CFEDITOR.getBundle().packJson;
  window.CFEDITOR.loadJson(canonicalFirst);
  const canonicalSecond = window.CFEDITOR.getBundle().packJson;
  window.CFEDITOR.update({ label: "Edited first control" });
  const loaded = window.CFEDITOR.getPack();
  return {
    exact: canonicalFirst === canonicalSecond,
    count: loaded.presets.length,
    firstId: loaded.presets[0].id,
    editedLabel: loaded.presets[0].content.label,
    extraLayerOpacity: loaded.presets[0].visuals.base.layers.at(-1).opacity,
    extraStatusOpacity: loaded.presets[0].visuals.status.success.layers.at(-1).opacity,
    secondId: loaded.presets[1].id
  };
});
assert.deepEqual(roundTrip, { exact: true, count: 2, firstId: "editor-choice-demo", editedLabel: "Edited first control", extraLayerOpacity: 0.37, extraStatusOpacity: 0.23, secondId: "editor-second-preset" });
assert.equal(await page.locator("#packPreset option").count(), 2);
await page.locator('[data-tab="appearance"]').click();
await page.locator("#packPreset").selectOption("editor-second-preset");
assert.equal(await page.evaluate(() => window.CFEDITOR.getPreset().id), "editor-second-preset");
await page.locator("#packPreset").selectOption(roundTrip.firstId);
assert.equal(await page.evaluate(() => window.CFEDITOR.getPreset().content.label), "Edited first control");
await page.screenshot({ path: join(evidenceRoot, "editor-desktop.png"), fullPage: true });
await writeFile(exportedDemoPath, exports.demoHtml, "utf8");
await writeFile(momentaryDemoPath, demoVariants.momentary, "utf8");
await writeFile(choiceDemoPath, demoVariants.choice, "utf8");
await writeFile(donorDemoPath, derivedAttribution.demoHtml, "utf8");
await context.close();

const demoErrors = [];
for (const [semantic, path] of [["momentary", momentaryDemoPath], ["toggle", exportedDemoPath], ["choice", choiceDemoPath]]) {
  const demoContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const demoPage = await demoContext.newPage();
  demoPage.on("pageerror", (error) => demoErrors.push(`${semantic}: ${error.message}`));
  await demoPage.goto(pathToFileURL(path).href, { waitUntil: "load" });
  const exportedState = await demoPage.evaluate(() => { const embedded = document.getElementById("sfhs-exported-control"); return { phase: document.body.dataset.phase, embedded: embedded?.tagName, scriptInstance: embedded instanceof HTMLScriptElement, selfCheck: window.CFDEMO.selfCheck() }; });
  assert.deepEqual(exportedState, { phase: "ready", embedded: "SCRIPT", scriptInstance: true, selfCheck: { pass: true, semantic } }, JSON.stringify({ exportedState, demoErrors }));
  assert.equal(await demoPage.evaluate(() => window.CFDEMO.preset.semantic.kind), semantic);
  const interactive = demoPage.locator("#preview .sfhs-cf-interactive");
  if (semantic === "momentary") assert.equal(await interactive.evaluate((element) => element.tagName), "BUTTON");
  if (semantic === "toggle") assert.equal(await interactive.getAttribute("role"), "switch");
  if (semantic === "choice") assert.equal(await interactive.getAttribute("type"), "radio");
  for (const tortureCase of ["outside", "cancel", "focus", "reduced"]) assert.equal(await demoPage.evaluate((name) => window.CFDEMO.torture(name), tortureCase), true);
  await demoPage.evaluate(() => window.CFDEMO.setState("disabled"));
  const disabledBefore = await demoPage.evaluate(() => window.CFDEMO.activationCount);
  await interactive.evaluate((element) => element.click());
  assert.equal(await demoPage.evaluate(() => window.CFDEMO.activationCount), disabledBefore);
  await demoPage.evaluate(() => window.CFDEMO.setState("idle"));
  await interactive.click();
  assert.equal(await demoPage.evaluate((before) => window.CFDEMO.activationCount === before + 1, disabledBefore), true);
  if (semantic !== "momentary") assert.equal(await demoPage.locator("#preview .sfhs-cf-root").getAttribute("data-selected"), "true");
  if (semantic === "toggle") await demoPage.screenshot({ path: join(evidenceRoot, "exported-demo-file.png"), fullPage: true });
  await demoContext.close();
}
const donorContext = await browser.newContext({ viewport: { width: 700, height: 900 } });
const donorPage = await donorContext.newPage();
await donorPage.goto(pathToFileURL(donorDemoPath).href, { waitUntil: "load" });
assert((await donorPage.locator("#sfhs-exported-notices").textContent()).includes("From Uiverse.io"));
await donorContext.close();

for (const html of Object.values(demoVariants)) {
  assert(!html.includes("uv-plastic-inset-press"));
  assert(!html.includes("an-status-cycle"));
  assert(!html.includes("mu-glare-sweep"));
  assert(!html.includes("Animata MIT License"));
  assert(!html.includes("Magic UI MIT License"));
}
assert(derivedAttribution.demoHtml.includes("editor-derived-plastic"));
assert(!derivedAttribution.demoHtml.includes("an-status-cycle"));
assert(!derivedAttribution.demoHtml.includes("mu-glare-sweep"));
assert(!derivedAttribution.demoHtml.includes("Animata MIT License"));
assert(!derivedAttribution.demoHtml.includes("Magic UI MIT License"));

const mobileContext = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75 });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(server.url, { waitUntil: "load" });
assert.equal(await mobilePage.evaluate(() => window.CFEDITOR.selfCheck().pass), true);
assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await mobilePage.screenshot({ path: join(evidenceRoot, "editor-samsung-emulation.png"), fullPage: true });
await mobileContext.close();

const fileContext = await browser.newContext({ viewport: { width: 1180, height: 900 } });
const filePage = await fileContext.newPage();
const fileErrors = [];
filePage.on("pageerror", (error) => fileErrors.push(error.message));
await filePage.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
assert.equal(await filePage.evaluate(() => window.CFEDITOR.selfCheck().pass), true);
const fileTorture = await filePage.evaluate(() => window.CFEDITOR.torture("drag"));
assert.equal(fileTorture.pass, true);
await fileContext.close();
await browser.close(); await server.close();

assert.deepEqual(unexpectedRequests, []);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(demoErrors, []);
assert.deepEqual(fileErrors, []);
const report = {
  schema: "sfhs.control-feedback-editor-browser-proof@0", pass: true,
  artifact: first.descriptor.artifact, determinism: { identical: true, sha256: first.descriptor.artifact.sha256 },
  editor: { design: true, liveDomRuntime: true, statePreviewCount: 9, tortureCases: torture.length, torturePass: torture.every((result) => result.pass), exactTwoPresetPackRoundTrip: roundTrip.exact, topologyPreservedAfterEdit: true, multiPresetMemberSelection: true, donorAttributionPreservedOnRename: true },
  export: { presetJson: true, packJson: true, domConfig: true, pixiV8Config: true, usedPresetNotices: true, donorDemoNotices: true, standaloneDemo: true, standaloneDemoUsesMinimalProductionRuntime: true, unusedPresetInventoryEmbedded: false, semanticVariants: ["momentary", "toggle", "choice"], standaloneDemoFileProtocol: true },
  cues: { audioAutomation: "API/configuration only; no physical latency claim", mute: true, haptics: "best-effort support surfaced" },
  mobile: { profile: "Samsung S21 Ultra emulation only", horizontalOverflow: false },
  fileProtocol: { editor: true, exportedDemo: true }, observers: { unexpectedRequests, consoleErrors, pageErrors, demoErrors, fileErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)));
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
