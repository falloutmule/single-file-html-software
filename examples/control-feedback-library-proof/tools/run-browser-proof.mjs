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
await page.locator('[data-preset-id="an-vertical-label-swap"] .sfhs-cf-interactive').hover();
const verticalLayers = await page.locator('[data-preset-id="an-vertical-label-swap"] .sfhs-cf-layer-content').evaluateAll((elements) => elements.map((element) => ({ opacity: element.style.opacity, transform: element.style.transform })));
assert.deepEqual(verticalLayers, [{ opacity: "0", transform: "translate(0px, 100%)" }, { opacity: "1", transform: "translate(0px, 0%)" }], "same-role DOM layers must retain occurrence identity");
await page.locator('[data-preset-id="an-arrow-conveyor"] .sfhs-cf-interactive').hover();
const conveyorLayers = await page.locator('[data-preset-id="an-arrow-conveyor"] .sfhs-cf-layer-content').evaluateAll((elements) => elements.map((element) => element.style.transform));
assert.equal(new Set(conveyorLayers).size, conveyorLayers.length, "conveyor content occurrences must remain distinct");
for (let index = 0; index < 25; index += 1) await controls.nth(index).click();
assert.equal(await page.evaluate(() => window.CFLIB.activationCount), 25);
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
  library: { presets: 25, donors: { uiverse: 11, animata: 8, magicui: 6 }, activated: 25, reducedMotion: 25, semanticControls: selfCheck },
  notices: { donors: 3, usedPresetClosure: true, uiverseAttribution: true },
  renderers: { domGradients: true, occurrenceAwareLayerMerge: true, pixiGradientApproximation: "declared-in-adapter-register" },
  mobile: { profile: "Samsung S21 Ultra emulation only", horizontalOverflow: false },
  fileProtocol: { pass: true },
  observers: { unexpectedRequests, consoleErrors, pageErrors, fileErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)));
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
