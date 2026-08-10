import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { startExactArtifactServer } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(projectRoot, "..", "..");
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_MOBILE_FEEDBACK_EVIDENCE ?? ".sfhs-evidence/mobile-controls-feedback-v0");
await mkdir(evidenceRoot, { recursive: true });
const first = await packProject(projectRoot, { sourceRevision: "mobile-controls-feedback-v0" });
const second = await packProject(projectRoot, { sourceRevision: "mobile-controls-feedback-v0" });
assert(Buffer.from(first.bytes).equals(Buffer.from(second.bytes)), "proof packs must be byte-identical");
const server = await startExactArtifactServer(first.bytes);
const browser = await chromium.launch({ headless: true });
const errors = [];
const unexpectedRequests = [];

async function prove(url) {
  const context = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75, hasTouch: true, isMobile: true, serviceWorkers: "block" });
  await context.route("**/*", async (route) => {
    const target = route.request().url();
    if (target === url || /^(?:about:blank|blob:|data:)/u.test(target)) return route.continue();
    unexpectedRequests.push(target); return route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(url, { waitUntil: "load" });
  assert.equal(await page.evaluate(() => document.body.dataset.phase), "ready");
  assert.equal((await page.evaluate(() => window.CFMB.selfCheck())).pass, true);
  assert.equal(await page.locator(".sfhs-mobile-feedback-host").count(), 3);
  assert.equal(await page.locator(".sfhs-mobile-control .sfhs-cf-interactive").count(), 0, "feedback must not nest an interactive element inside Mobile Controls buttons");
  assert.equal(await page.locator(".sfhs-mobile-feedback-host .sfhs-cf-interactive").first().evaluate((element) => getComputedStyle(element).pointerEvents), "none");
  assert.equal(await page.locator(".sfhs-mobile-feedback-host .sfhs-cf-interactive").first().getAttribute("tabindex"), "-1");

  const dispatch = async (id, type, pointerId) => page.evaluate(({ id, type, pointerId }) => {
    const element = document.querySelector(`[data-sfhs-control-id="${id}"]`);
    if (!(element instanceof HTMLElement)) throw new Error(`Missing ${id}.`);
    const rect = element.getBoundingClientRect();
    const target = type === "pointerdown" ? element : document;
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType: "touch", button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
    return { mobile: window.CFMB.mobile.read(), feedback: window.CFMB.feedback.read(id), cues: [...window.CFMB.cues] };
  }, { id, type, pointerId });

  let snapshot = await dispatch("primary", "pointerdown", 1);
  assert.equal(snapshot.mobile.controls.primary.pressed, true);
  assert.equal(snapshot.feedback.interaction, "pressed-inside");
  snapshot = await dispatch("primary", "pointerup", 1);
  assert.equal(snapshot.mobile.controls.primary.pressed, false);
  assert.equal(snapshot.feedback.interaction, "rest");

  snapshot = await dispatch("pulse", "pointerdown", 2);
  assert.equal(snapshot.mobile.controls.pulse.count, 1, "feedback must not duplicate pulse output");
  assert(snapshot.cues.some((cue) => cue.controlId === "pulse" && cue.role === "activate"));
  await dispatch("pulse", "pointerup", 2);
  assert.equal((await page.evaluate(() => window.CFMB.mobile.read().controls.pulse.count)), 1);
  const drained = await page.evaluate(() => window.CFMB.mobile.flush().controls.pulse.count);
  assert.equal(drained, 1);
  snapshot = await dispatch("pulse", "pointerdown", 22);
  assert.equal(snapshot.mobile.controls.pulse.count, 1, "post-flush pulse remains exact-once");
  assert.equal(snapshot.cues.filter((cue) => cue.controlId === "pulse" && cue.role === "activate").length, 2, "post-flush pulse must retain tactile activation");
  await dispatch("pulse", "pointerup", 22);

  snapshot = await dispatch("shield", "pointerdown", 3);
  assert.equal(snapshot.mobile.controls.shield.state, true, "feedback must not duplicate toggle output");
  assert.equal(snapshot.feedback.model.selected, true, "feedback selection follows Mobile Controls authority");
  await dispatch("shield", "pointerup", 3);
  await page.evaluate(() => window.CFMB.mobile.releaseAll("proof"));
  assert.equal(await page.evaluate(() => window.CFMB.feedback.read("shield").model.selected), false);

  await dispatch("primary", "pointerdown", 4);
  snapshot = await dispatch("pulse", "pointerdown", 5);
  assert.equal(snapshot.mobile.activePointers.length, 2);
  await dispatch("primary", "pointercancel", 4);
  await dispatch("pulse", "pointercancel", 5);
  assert.equal(await page.evaluate(() => window.CFMB.mobile.read().activePointers.length), 0);
  assert.deepEqual(await page.evaluate(() => window.CFMB.failedAttachIsAtomic()), {
    rejected: true,
    unchanged: true,
    before: { hosts: 0, styles: 0, attached: 0 },
    after: { hosts: 0, styles: 0, attached: 0 }
  });
  assert.deepEqual(await page.evaluate(() => window.CFMB.failedInitialSyncIsAtomic()), { rejected: true, unchanged: true, clean: true });
  await page.evaluate(() => window.CFMB.feedback.destroy());
  assert.equal(await page.locator(".sfhs-mobile-feedback-host").count(), 0);
  assert.equal(await page.locator('[data-sfhs-feedback-attached="true"]').count(), 0);
  assert.equal(await page.locator("style[data-sfhs-mobile-controls-feedback]").count(), 0);
  assert.equal(await page.locator(".sfhs-mobile-control").count(), 3, "destroying feedback must leave Mobile Controls mounted");
  await context.close();
}

await prove(server.url);
const artifactPath = join(projectRoot, "dist", "index.html");
await prove(pathToFileURL(artifactPath).href);
await browser.close(); await server.close();
assert.deepEqual(errors, []);
assert.deepEqual(unexpectedRequests, []);
const report = {
  schema: "sfhs.mobile-controls-feedback-browser-proof@0",
  pass: true,
  artifact: first.descriptor.artifact,
  determinism: { identical: true },
  ownership: { mobileControlsInputAndLayout: true, controlFeedbackPresentationOnly: true, duplicatePulseOrToggle: false, repeatedPulseAfterFlush: true },
  lifecycle: { failureAtomicAttach: true, destroyLeavesMobileControlsMounted: true },
  browser: { http: true, fileProtocol: true, samsungS21UltraEmulationOnly: true },
  errors,
  unexpectedRequests
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
