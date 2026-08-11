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
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_CONTROL_LIBRARY_EVIDENCE ?? ".sfhs-evidence/control-feedback-library-v0");
const artifactPath = join(projectRoot, "dist", "index.html");
await mkdir(evidenceRoot, { recursive: true });
const first = await packProject(projectRoot, { sourceRevision: "control-feedback-library-v0" });
const second = await packProject(projectRoot, { sourceRevision: "control-feedback-library-v0" });
assert(Buffer.from(first.bytes).equals(Buffer.from(second.bytes)), "independent packs must be byte-identical");

const server = await startExactArtifactServer(first.bytes);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1180, height: 900 }, serviceWorkers: "block" });
const page = await context.newPage();
const unexpectedRequests = [];
const consoleErrors = [];
const pageErrors = [];
await context.route("**/*", async (route) => {
  const url = route.request().url();
  if (url === server.url || /^(?:about:blank|blob:|data:)/iu.test(url)) return route.continue();
  unexpectedRequests.push(url);
  return route.abort("blockedbyclient");
});
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));
await page.goto(server.url, { waitUntil: "load" });
const selfCheck = await page.evaluate(() => window.CFLIB.selfCheck());
assert.deepEqual(selfCheck, { pass: true, count: 25, checkboxCount: 1, switchCount: 2, radioCount: 1 });

const controls = page.locator(".sfhs-cf-interactive");
assert.equal(await controls.count(), 25);
const conformance = await page.evaluate(() => window.CFLIB.visualConformance);
assert.equal(Object.keys(conformance).length, 11);
assert.equal(Object.values(conformance).filter((finding) => finding.level === "FULL").length, 9);
assert.equal(Object.values(conformance).filter((finding) => finding.level === "PARTIAL").length, 2);
assert.equal(Object.values(conformance).some((finding) => finding.level === "BROKEN"), false);
const targets = Object.keys(conformance);
for (const id of targets) {
  const card = page.locator(`[data-preset-id="${id}"]`);
  assert(await card.locator(".sfhs-cf-layer[data-content-slot]").count() > 0, `${id} must render an active content slot`);
  assert.equal(await card.locator(".sfhs-cf-content").evaluate((element) => element.hidden), true, `${id} must suppress duplicate legacy content`);
}

const darkWell = page.locator('[data-preset-id="uv-dark-capsule-icon"] [data-content-slot="icon-leading"]');
assert.deepEqual(await darkWell.evaluate((element) => ({ text: element.textContent, left: element.style.left, top: element.style.top, width: element.style.width, height: element.style.height })), { text: "→", left: "16%", top: "50%", width: "36px", height: "36px" });
await page.locator('[data-preset-id="uv-dark-capsule-icon"] .sfhs-cf-interactive').hover();
assert((await darkWell.getAttribute("style")).includes("scale(1.08, 1.08)"));
assert.equal(await page.locator('[data-preset-id="uv-like-pop-toggle"] [data-content-slot="icon-leading"]').textContent(), "♥");
assert.equal(await page.locator('[data-preset-id="uv-skeuo-icon-choice"] [data-content-slot="icon-leading"]').textContent(), "◆");
await page.locator('[data-preset-id="uv-like-pop-toggle"] .sfhs-cf-interactive').click();
assert.equal(await page.locator('[data-preset-id="uv-like-pop-toggle"] input').isChecked(), true);
assert((await page.locator('[data-preset-id="uv-like-pop-toggle"] [data-content-slot="icon-leading"]').getAttribute("style")).includes("scale(1.15, 1.15)"));
await page.locator('[data-preset-id="uv-skeuo-icon-choice"] .sfhs-cf-interactive').click();
assert.equal(await page.locator('[data-preset-id="uv-skeuo-icon-choice"] input').isChecked(), true);

const sunMoon = page.locator('[data-preset-id="uv-sun-moon-toggle"]');
assert.equal(await sunMoon.locator('[data-content-slot="icon-leading"]').textContent(), "☀");
await sunMoon.locator(".sfhs-cf-interactive").click();
assert.equal(await sunMoon.locator('[data-content-slot="icon-leading"]').textContent(), "☾");
assert.equal(await sunMoon.locator("input").isChecked(), true);

const statusCard = page.locator('[data-preset-id="an-status-cycle"]');
for (const [status, glyph] of [["loading", "…"], ["success", "✓"], ["error", "!"]]) {
  await page.evaluate(([statusValue]) => window.CFLIB.controllers["an-status-cycle"].setModel({ status: statusValue }), [status]);
  assert.equal(await statusCard.locator('[data-content-slot="status-icon"]').textContent(), glyph);
}
await page.evaluate(() => window.CFLIB.controllers["an-status-cycle"].setModel({ status: "idle" }));

await page.locator('[data-preset-id="an-vertical-label-swap"] .sfhs-cf-interactive').hover();
const verticalLayers = await page.locator('[data-preset-id="an-vertical-label-swap"] .sfhs-cf-layer-content').evaluateAll((elements) => elements.map((element) => ({ opacity: element.style.opacity, transform: element.style.transform })));
assert.deepEqual(verticalLayers, [{ opacity: "0", transform: "translate(0px, 100%)" }, { opacity: "1", transform: "translate(0px, 0%)" }], "same-role DOM layers must retain occurrence identity");
assert.deepEqual(await page.locator('[data-preset-id="an-vertical-label-swap"] [data-content-slot="label"]').allTextContents(), ["Explore", "Open →"]);
await page.locator('[data-preset-id="an-overlay-arrow-swap"] .sfhs-cf-interactive').hover();
assert.equal(await page.locator('[data-preset-id="an-overlay-arrow-swap"] [data-content-slot="icon-trailing"]').textContent(), "→");
await page.locator('[data-preset-id="an-arrow-conveyor"] .sfhs-cf-interactive').hover();
const conveyorLayers = await page.locator('[data-preset-id="an-arrow-conveyor"] .sfhs-cf-layer-content').evaluateAll((elements) => elements.map((element) => element.style.transform));
assert.equal(new Set(conveyorLayers).size, conveyorLayers.length, "conveyor content occurrences must remain distinct");
assert.deepEqual(await page.locator('[data-preset-id="an-arrow-conveyor"] [data-content-slot="icon-trailing"]').allTextContents(), ["→", "→"]);

for (const [id, baseTransform, hoverTransform] of [
  ["an-expanding-leading-fill", "scale(0.5, 0.5)", "scale(9, 9)"],
  ["mu-dot-flood-reveal", "scale(0.35, 0.35)", "scale(12, 12)"]
]) {
  const card = page.locator(`[data-preset-id="${id}"]`);
  const effect = card.locator(".sfhs-cf-layer-effect");
  await card.locator(".title").hover();
  assert((await effect.getAttribute("style")).includes(baseTransform), `${id} must start from a bounded local origin`);
  await card.locator(".sfhs-cf-interactive").hover();
  assert((await effect.getAttribute("style")).includes(hoverTransform), `${id} must expand from its bounded local origin`);
}
const bubble = page.locator('[data-preset-id="an-rising-bubble-fill"]');
await bubble.locator(".title").hover();
assert.equal(await bubble.locator(".sfhs-cf-layer-effect").evaluate((element) => element.style.top), "100%");
await bubble.locator(".sfhs-cf-interactive").hover();
assert.equal(await bubble.locator(".sfhs-cf-layer-effect").evaluate((element) => element.style.top), "50%");

const activationBefore = await page.evaluate(() => window.CFLIB.activationCount);
for (let index = 0; index < 25; index += 1) await controls.nth(index).click();
assert.equal(await page.evaluate(() => window.CFLIB.activationCount), activationBefore + 25);
const activationTotal = activationBefore + 25;
await page.evaluate(() => window.CFLIB.setReducedMotion(true));
assert.equal(await page.locator('.sfhs-cf-root[data-reduced-motion="true"]').count(), 25);
const background = await page.locator('[data-preset-id="uv-dark-capsule-icon"] .sfhs-cf-layer-surface').first().evaluate((element) => getComputedStyle(element).backgroundImage);
assert(background.includes("linear-gradient"), "DOM adapter must render declared gradients");
const notice = await page.evaluate(() => ({ json: JSON.parse(window.CFLIB.noticeJson), text: window.CFLIB.noticeText, packCount: window.CFLIB.pack.presets.length }));
assert.equal(notice.json.donors.length, 3);
assert.equal(notice.packCount, 25);
assert(notice.text.includes("From Uiverse.io by cssbuttons-io"));
await page.screenshot({ path: join(evidenceRoot, "library-desktop.png"), fullPage: true });
await context.close();

const mobileContext = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75 });
const mobilePage = await mobileContext.newPage();
await mobilePage.goto(server.url, { waitUntil: "load" });
assert.equal(await mobilePage.evaluate(() => window.CFLIB.selfCheck().pass), true);
assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await mobilePage.screenshot({ path: join(evidenceRoot, "library-samsung-emulation.png"), fullPage: true });
await mobileContext.close();

const fileContext = await browser.newContext({ viewport: { width: 384, height: 720 } });
const filePage = await fileContext.newPage();
const fileErrors = [];
filePage.on("pageerror", (error) => fileErrors.push(error.message));
await filePage.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
assert.equal(await filePage.evaluate(() => window.CFLIB.selfCheck().pass), true);
await filePage.locator('[data-preset-id="uv-plastic-inset-press"] .sfhs-cf-interactive').click();
assert.equal(await filePage.evaluate(() => window.CFLIB.activationCount), 1);
await fileContext.close();
await browser.close();
await server.close();

assert.deepEqual(unexpectedRequests, []);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(fileErrors, []);
const report = {
  schema: "sfhs.control-feedback-library-browser-proof@0",
  pass: true,
  artifact: first.descriptor.artifact,
  determinism: { identical: true, sha256: first.descriptor.artifact.sha256 },
  library: { presets: 25, donors: { uiverse: 11, animata: 8, magicui: 6 }, activated: activationTotal, allPresetActivationSweep: 25, reducedMotion: 25, semanticControls: selfCheck },
  notices: { donors: 3, usedPresetClosure: true, uiverseAttribution: true },
  renderers: { domGradients: true, occurrenceAwareLayerMerge: true, boundedLayerGeometry: true, realizedContentSlots: true, legacyContentDeduplication: true, pixiGradientApproximation: "declared-in-adapter-register" },
  visualConformance: { targets: 11, full: 9, partial: 2, broken: 0, classifications: conformance },
  mobile: { profile: "Samsung S21 Ultra emulation only", horizontalOverflow: false },
  fileProtocol: { pass: true },
  observers: { unexpectedRequests, consoleErrors, pageErrors, fileErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)));
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
