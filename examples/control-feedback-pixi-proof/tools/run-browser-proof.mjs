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
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_CONTROL_PIXI_EVIDENCE ?? ".sfhs-evidence/control-feedback-pixi-v8-v0");
const artifactPath = join(projectRoot, "dist", "index.html");
await mkdir(evidenceRoot, { recursive: true });
const first = await packProject(projectRoot, { sourceRevision: "control-feedback-pixi-v8-v0" });
const second = await packProject(projectRoot, { sourceRevision: "control-feedback-pixi-v8-v0" });
assert(Buffer.from(first.bytes).equals(Buffer.from(second.bytes)), "Pixi proof packs must be byte-identical");

const server = await startExactArtifactServer(first.bytes);
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 900, height: 720 }, serviceWorkers: "block" });
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
await page.waitForFunction(() => window.CFPIXI?.selfCheck().pass === true);
const initialVisualProbe = await page.evaluate(() => window.CFPIXI.visualProbe());
assert(initialVisualProbe.nonTransparent > 10000 && initialVisualProbe.distinctColors > 4, JSON.stringify(initialVisualProbe));
assert.deepEqual(await page.evaluate(() => window.CFPIXI.boundedSlotProbe()), { position: { x: 75, y: 32 }, pivot: { x: 16, y: 16 }, text: "◆", legacyVisible: false });

const trace = [
  { kind: "contact-begin", source: "pointer", sourceId: "trace:1", origin: { x: 0.2, y: 0.8 }, atMs: 1 },
  { kind: "contact-update", sourceId: "trace:1", inside: false, origin: { x: 1, y: 0.8 }, atMs: 2 },
  { kind: "contact-update", sourceId: "trace:1", inside: true, origin: { x: 0.7, y: 0.4 }, atMs: 3 },
  { kind: "contact-end", sourceId: "trace:1", inside: true, origin: { x: 0.7, y: 0.4 }, atMs: 4 }
];
const parity = await page.evaluate((input) => window.CFPIXI.runParityTrace(input), trace);
assert.equal(parity.equal, true, JSON.stringify(parity));

const canvas = await page.locator("#pixi-host canvas").boundingBox();
assert(canvas !== null);
const point = (logicalX, logicalY) => ({ x: canvas.x + logicalX * canvas.width / 640, y: canvas.y + logicalY * canvas.height / 300 });
const pressPoint = point(137, 128);
await page.mouse.click(pressPoint.x, pressPoint.y);
assert.equal(await page.evaluate(() => window.CFPIXI.activations.filter((entry) => entry.id === "press").length), 1);

const beforeOutside = await page.evaluate(() => window.CFPIXI.activations.length);
await page.mouse.move(pressPoint.x, pressPoint.y);
await page.mouse.down();
await page.mouse.move(canvas.x + 2, canvas.y + 2);
await page.mouse.up();
assert.equal(await page.evaluate(() => window.CFPIXI.activations.length), beforeOutside, "Pixi release outside must cancel");

const togglePoint = point(320, 128);
await page.mouse.click(togglePoint.x, togglePoint.y);
assert.equal(await page.evaluate(() => window.CFPIXI.controllers.toggle.read().model.selected), true);
await page.locator("#keyboard-target").focus();
await page.keyboard.press("Space");
assert((await page.evaluate(() => window.CFPIXI.activations.filter((entry) => entry.id === "press").length)) >= 2, "host keyboard target activates Pixi control");

const ripplePoint = point(503, 128);
for (let index = 0; index < 7; index += 1) await page.mouse.click(ripplePoint.x, ripplePoint.y);
assert((await page.evaluate(() => window.CFPIXI.controllers.ripple.read().activationRipples.length)) <= 4);
await page.evaluate(() => window.CFPIXI.controllers.ripple.setReducedMotion(true));
assert.equal(await page.evaluate(() => window.CFPIXI.controllers.ripple.read().activationRipples.length), 0);
const visualProbe = await page.evaluate(() => window.CFPIXI.visualProbe());
assert(visualProbe.nonTransparent > 10000 && visualProbe.distinctColors > 4, JSON.stringify(visualProbe));
await page.evaluate(() => window.CFPIXI.captureProofCanvas());
await page.screenshot({ path: join(evidenceRoot, "pixi-controls.png"), fullPage: true });
await context.close();

const fileContext = await browser.newContext({ viewport: { width: 720, height: 520 } });
const filePage = await fileContext.newPage();
await filePage.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
await filePage.waitForFunction(() => window.CFPIXI?.selfCheck().pass === true);
assert.equal(await filePage.evaluate(() => window.CFPIXI.approximations.length), 4);
await fileContext.close();
await browser.close();
await server.close();

assert.deepEqual(unexpectedRequests, []);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
const report = {
  schema: "sfhs.control-feedback-pixi-v8-browser-proof@0",
  pass: true,
  artifact: first.descriptor.artifact,
  determinism: { identical: true, sha256: first.descriptor.artifact.sha256 },
  parity: { pass: parity.equal, traceLength: trace.length },
  pointer: { releaseInside: "pass", releaseOutside: "pass", rippleCap: 4 },
  keyboard: { pass: true },
  reducedMotion: { pass: true },
  approximations: { count: 4, explicit: true },
  boundedLayerGeometry: { pixiPositionPivot: true, contentSlot: true, legacyContentDeduplicated: true },
  visualProbe,
  fileProtocol: { pass: true },
  browserLaunch: { angle: "swiftshader", unsafeSwiftshaderEnabledForAutomation: true },
  observers: { unexpectedRequests, consoleErrors, pageErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)), "proved Pixi artifact must equal on-disk artifact");
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
