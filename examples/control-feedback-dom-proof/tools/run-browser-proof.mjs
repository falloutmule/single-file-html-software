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
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_CONTROL_DOM_EVIDENCE ?? ".sfhs-evidence/control-feedback-dom-v0");
const artifactPath = join(projectRoot, "dist", "index.html");
await mkdir(evidenceRoot, { recursive: true });

const first = await packProject(projectRoot, { sourceRevision: "control-feedback-dom-v0" });
const second = await packProject(projectRoot, { sourceRevision: "control-feedback-dom-v0" });
assert(Buffer.from(first.bytes).equals(Buffer.from(second.bytes)), "independent packs must be byte-identical");
assert.equal(first.descriptor.artifact.sha256, second.descriptor.artifact.sha256);

const server = await startExactArtifactServer(first.bytes);
const browser = await chromium.launch({ headless: true });
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
assert.equal(await page.evaluate(() => window.CF.selfCheck().pass), true);

const semantics = await page.evaluate(() => ({
  momentary: window.CF.controllers.momentary.interactive.tagName,
  toggle: { tag: window.CF.controllers.toggle.interactive.tagName, type: window.CF.controllers.toggle.interactive.type, role: window.CF.controllers.toggle.interactive.getAttribute("role") },
  choice: { tag: window.CF.controllers.choice.interactive.tagName, type: window.CF.controllers.choice.interactive.type, name: window.CF.controllers.choice.interactive.name }
}));
assert.deepEqual(semantics.momentary, "BUTTON");
assert.deepEqual(semantics.toggle, { tag: "INPUT", type: "checkbox", role: "switch" });
assert.deepEqual(semantics.choice, { tag: "INPUT", type: "radio", name: "tool-mode" });

const longPressProtection = await page.evaluate(() => {
  const controller = window.CF.controllers.momentary;
  const event = new globalThis.MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  const dispatchAllowed = controller.interactive.dispatchEvent(event);
  const ordinaryInput = document.createElement("input");
  ordinaryInput.value = "Selectable text";
  document.body.append(ordinaryInput);
  const ordinaryEvent = new globalThis.MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  const ordinaryDispatchAllowed = ordinaryInput.dispatchEvent(ordinaryEvent);
  const ordinaryUserSelect = getComputedStyle(ordinaryInput).userSelect;
  ordinaryInput.remove();
  const styleText = document.querySelector("style[data-sfhs-control-feedback-dom]")?.textContent ?? "";
  return {
    dispatchAllowed,
    defaultPrevented: event.defaultPrevented,
    userSelect: getComputedStyle(controller.root).userSelect,
    ordinaryDispatchAllowed,
    ordinaryDefaultPrevented: ordinaryEvent.defaultPrevented,
    ordinaryUserSelect,
    webkitUserSelect: styleText.includes("-webkit-user-select:none"),
    touchCallout: styleText.includes("-webkit-touch-callout:none")
  };
});
assert.deepEqual(longPressProtection, { dispatchAllowed: false, defaultPrevented: true, userSelect: "none", ordinaryDispatchAllowed: true, ordinaryDefaultPrevented: false, ordinaryUserSelect: "auto", webkitUserSelect: true, touchCallout: true });

await page.locator("#momentary .sfhs-cf-interactive").click();
assert.equal(await page.evaluate(() => window.CF.activations.filter((entry) => entry.id === "momentary").length), 1);
await page.locator("#toggle .sfhs-cf-interactive").click();
assert.equal(await page.evaluate(() => window.CF.controllers.toggle.read().model.selected), true, "host must apply toggle proposal");
await page.locator("#choice .sfhs-cf-interactive").focus();
await page.keyboard.press("Space");
assert.equal(await page.evaluate(() => window.CF.controllers.choice.read().model.selected), true, "host must apply choice proposal");

const momentaryBox = await page.locator("#momentary .sfhs-cf-interactive").boundingBox();
assert(momentaryBox !== null);
const beforeOutside = await page.evaluate(() => window.CF.activations.length);
await page.mouse.move(momentaryBox.x + momentaryBox.width / 2, momentaryBox.y + momentaryBox.height / 2);
await page.mouse.down();
await page.mouse.move(2, 2);
await page.mouse.up();
assert.equal(await page.evaluate(() => window.CF.activations.length), beforeOutside, "release outside must cancel");

await page.evaluate(() => {
  const target = window.CF.controllers.momentary.interactive;
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 31, pointerType: "touch", button: 0, clientX: 20, clientY: 20 }));
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 32, pointerType: "touch", button: 0, clientX: 20, clientY: 20 }));
  target.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: 31, pointerType: "touch" }));
});
assert.equal(await page.evaluate(() => window.CF.controllers.momentary.read().owner), undefined);

await page.evaluate(() => {
  const target = window.CF.controllers.momentary.interactive;
  const rect = target.getBoundingClientRect();
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 40, pointerType: "touch", button: 0, clientX: rect.left + 4, clientY: rect.top + 4 }));
  window.CF.setDisabled("momentary", true);
});
assert.equal(await page.evaluate(() => window.CF.controllers.momentary.read().owner), undefined);
assert.equal(await page.evaluate(() => window.CF.controllers.momentary.interactive.disabled), true);
await page.evaluate(() => window.CF.setDisabled("momentary", false));

await page.evaluate(() => window.CF.setStatus("loading"));
assert.equal(await page.locator("#status .sfhs-cf-interactive").getAttribute("aria-busy"), "true");
await page.evaluate(() => window.CF.setStatus("success"));
assert.equal(await page.locator("#status .sfhs-cf-status").textContent(), "Success");

for (let index = 0; index < 8; index += 1) await page.locator("#ripple .sfhs-cf-interactive").click();
assert((await page.locator("#ripple .sfhs-cf-activation").count()) <= 4, "ripple instances must be bounded");
await page.evaluate(() => window.CF.setReducedMotion("ripple", true));
assert.equal(await page.locator("#ripple .sfhs-cf-activation").count(), 0);
await page.screenshot({ path: join(evidenceRoot, "dom-controls.png"), fullPage: true });

await context.close();
const fileContext = await browser.newContext({ viewport: { width: 384, height: 720 } });
const filePage = await fileContext.newPage();
await filePage.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
assert.equal(await filePage.evaluate(() => window.CF.selfCheck().pass), true, "file protocol self-check");
await filePage.locator("#momentary .sfhs-cf-interactive").click();
assert.equal(await filePage.evaluate(() => window.CF.activations.length), 1, "file protocol activation");
await fileContext.close();
await browser.close();
await server.close();

assert.deepEqual(unexpectedRequests, []);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
const report = {
  schema: "sfhs.control-feedback-dom-browser-proof@0",
  pass: true,
  artifact: first.descriptor.artifact,
  determinism: { identical: true, sha256: first.descriptor.artifact.sha256 },
  semantics,
  http: { releaseOutside: "pass", concurrentOwnership: "pass", keyboard: "pass", reducedMotion: "pass", longPressSelection: "suppressed", rippleCap: 4 },
  fileProtocol: { pass: true },
  observers: { unexpectedRequests, consoleErrors, pageErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)), "proved artifact must equal on-disk artifact");
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
