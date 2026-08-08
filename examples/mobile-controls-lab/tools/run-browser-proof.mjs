import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { runDomInteractiveArtifactScenarios, startExactArtifactServer } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(projectRoot, "..", "..");
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_MOBILE_CONTROLS_EVIDENCE ?? ".sfhs-evidence/mobile-controls-v1");
const artifactPath = join(projectRoot, "dist", "index.html");

await mkdir(evidenceRoot, { recursive: true });

const firstPack = await packProject(projectRoot, { sourceRevision: "sfhs-mobile-controls-v1" });
const firstBytes = Buffer.from(firstPack.bytes);
const secondPack = await packProject(projectRoot, { sourceRevision: "sfhs-mobile-controls-v1" });
assert(firstBytes.equals(Buffer.from(secondPack.bytes)), "two independent lab packs must be byte-identical");
assert.equal(firstPack.descriptor.artifact.sha256, secondPack.descriptor.artifact.sha256, "deterministic SHA-256");

const standardScenarios = await runDomInteractiveArtifactScenarios(firstPack.bytes, firstPack.descriptor, {
  evidenceDirectory: join(evidenceRoot, "standard")
});
assert(standardScenarios.valid, JSON.stringify(standardScenarios.findings));

const server = await startExactArtifactServer(firstPack.bytes);
const browser = await chromium.launch({ headless: true });
const findings = [];
const requests = [];
const consoleErrors = [];
const pageErrors = [];

async function createPage(pointerEventsAvailable, viewport = { width: 384, height: 854 }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: "block"
  });
  await context.addInitScript(({ available }) => {
    if (!available) Object.defineProperty(window, "PointerEvent", { configurable: true, value: undefined });
    window.__sfhsRegistrations = [];
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      const target = this === document
        ? "document"
        : this === window
          ? "window"
          : this instanceof HTMLElement && this.dataset.sfhsControlId
            ? `control:${this.dataset.sfhsControlId}`
            : this instanceof HTMLElement && this.id
              ? `#${this.id}`
              : String(this?.constructor?.name ?? "other");
      window.__sfhsRegistrations.push({ target, type: String(type), passive: typeof options === "object" && options?.passive === true });
      return original.call(this, type, listener, options);
    };
  }, { available: pointerEventsAvailable });
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === server.url || /^(?:about:blank|blob:|data:)/iu.test(url)) return route.continue();
    findings.push(`unexpected request: ${url}`);
    return route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(server.url, { waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => document.querySelector("#fixture-shell")?.getAttribute("data-phase") === "running");
  await page.waitForFunction(() => window.CR.getSnapshot().ticks >= 5);
  return { context, page };
}

function registrationHas(registrations, target, type) {
  return registrations.some((entry) => entry.target === target && entry.type === type);
}

async function dispatchPointer(page, controlId, type, identifier, x, y, samples) {
  return page.evaluate(({ controlId: id, type: eventType, identifier: pointerId, x: clientX, y: clientY, samples: coalesced }) => {
    const control = document.querySelector(`[data-sfhs-control-id="${id}"]`);
    if (!(control instanceof HTMLElement)) throw new Error(`missing control ${id}`);
    const target = eventType === "pointerdown" || eventType === "lostpointercapture" ? control : document;
    const event = new PointerEvent(eventType, { bubbles: true, cancelable: true, pointerId, pointerType: "touch", clientX, clientY, button: 0 });
    if (coalesced !== undefined) {
      Object.defineProperty(event, "getCoalescedEvents", {
        configurable: true,
        value: () => coalesced.map((sample) => ({ clientX: sample.x, clientY: sample.y, timeStamp: sample.timeStamp }))
      });
    }
    target.dispatchEvent(event);
    return window.CR.getController()?.read();
  }, { controlId, type, identifier, x, y, samples });
}

async function controlBox(page, id) {
  const box = await page.locator(`[data-sfhs-control-id="${id}"]`).boundingBox();
  assert(box !== null, `${id} must have a bounding box`);
  return box;
}

const pointerRun = await createPage(true);
let pointerEvidence;
try {
  const { page } = pointerRun;
  const registrations = await page.evaluate(() => window.__sfhsRegistrations);
  assert(registrationHas(registrations, "control:move", "pointerdown"));
  assert(registrationHas(registrations, "control:look", "pointerdown"));
  for (const type of ["pointermove", "pointerup", "pointercancel"]) assert(registrationHas(registrations, "document", type), `document missing ${type}`);
  assert(!registrations.some((entry) => (entry.target === "document" || entry.target.startsWith("control:")) && entry.type.startsWith("touch")), "Pointer mode installed Touch gameplay listeners");

  const styles = await page.evaluate(() => {
    const surface = document.getElementById("control-surface");
    const move = document.querySelector('[data-sfhs-control-id="move"]');
    const before = scrollY;
    scrollTo(0, 100);
    return {
      surface: surface instanceof HTMLElement ? getComputedStyle(surface).touchAction : "missing",
      move: move instanceof HTMLElement ? getComputedStyle(move).touchAction : "missing",
      overflow: getComputedStyle(document.body).overflow,
      before,
      after: scrollY
    };
  });
  assert.equal(styles.surface, "none");
  assert.equal(styles.move, "none");
  assert.equal(styles.overflow, "hidden");
  assert.equal(styles.after, styles.before);

  await page.evaluate(() => window.CR.getController()?.updateConfig({ stickDeadZone: 0.08, relativeSensitivity: 1 }));
  const move = await controlBox(page, "move");
  const moveX = move.x + move.width / 2;
  const moveY = move.y + move.height / 2;
  await dispatchPointer(page, "move", "pointerdown", 11, moveX, moveY);
  let state = await dispatchPointer(page, "move", "pointermove", 11, moveX + 0.2, moveY - 0.2);
  assert.equal(state.controls.move.magnitude, 0, "normalized dead zone must settle tiny movement to zero");
  state = await dispatchPointer(page, "move", "pointermove", 11, moveX, moveY - Math.min(move.width, move.height) * 0.35);
  assert(state.controls.move.y > 0.98 && state.controls.move.magnitude > 0.98, "MOVE must normalize to full forward magnitude");
  await dispatchPointer(page, "move", "pointerup", 11, moveX, moveY);
  state = await page.evaluate(() => window.CR.getController()?.read());
  assert.deepEqual({ x: state.controls.move.x, y: state.controls.move.y, magnitude: state.controls.move.magnitude, active: state.controls.move.active }, { x: 0, y: 0, magnitude: 0, active: false });

  await page.evaluate(() => window.CR.getController()?.updateConfig({ stickDeadZone: 0 }));
  await dispatchPointer(page, "move", "pointerdown", 12, moveX, moveY);
  await dispatchPointer(page, "move", "pointermove", 12, moveX, moveY - Math.min(move.width, move.height) * 0.35);
  state = await dispatchPointer(page, "move", "pointermove", 12, moveX, moveY);
  assert.deepEqual({ x: state.controls.move.x, y: state.controls.move.y, magnitude: state.controls.move.magnitude, active: state.controls.move.active }, { x: 0, y: 0, magnitude: 0, active: true }, "zero dead zone must still settle an active stick at its centre");
  await dispatchPointer(page, "move", "pointerup", 12, moveX, moveY);

  const look = await controlBox(page, "look");
  const lookY = look.y + look.height / 2;
  await dispatchPointer(page, "look", "pointerdown", 21, look.x, lookY);
  state = await dispatchPointer(page, "look", "pointermove", 21, look.x + look.width, lookY, [
    { x: look.x + look.width * 0.25, y: lookY, timeStamp: 1 },
    { x: look.x + look.width * 0.5, y: lookY, timeStamp: 2 }
  ]);
  assert(Math.abs(state.controls.look.rawNormalizedDelta - 0.5) < 0.001, "coalesced samples must replace the parent exactly once");
  await dispatchPointer(page, "look", "pointerup", 21, look.x, lookY);
  await page.evaluate(() => window.CR.getController()?.flush());

  await dispatchPointer(page, "look", "pointerdown", 22, look.x, lookY);
  state = await dispatchPointer(page, "look", "pointermove", 22, look.x + 0.125, lookY);
  assert(state.controls.look.rawNormalizedDelta > 0 && state.controls.look.rawNormalizedDelta < 0.01, "fractional LOOK movement must be retained");
  await dispatchPointer(page, "look", "pointerup", 22, look.x, lookY);
  await page.evaluate(() => window.CR.getController()?.flush());

  await dispatchPointer(page, "look", "pointerdown", 23, look.x, lookY);
  state = await dispatchPointer(page, "look", "pointermove", 23, look.x + look.width, lookY);
  assert(Math.abs(state.controls.look.rawNormalizedDelta - 1) < 0.001, "one LOOK width must normalize to one");
  assert(Math.abs(state.controls.look.delta - 1) < 0.001, "1x sensitivity must preserve normalized LOOK");
  await dispatchPointer(page, "look", "pointerup", 23, look.x, lookY);
  await page.evaluate(() => window.CR.getController()?.flush());

  const primary = await controlBox(page, "primary");
  await dispatchPointer(page, "move", "pointerdown", 31, moveX, moveY);
  await dispatchPointer(page, "look", "pointerdown", 32, look.x + look.width / 2, lookY);
  await dispatchPointer(page, "primary", "pointerdown", 33, primary.x + primary.width / 2, primary.y + primary.height / 2);
  await dispatchPointer(page, "move", "pointermove", 31, moveX, moveY - 30);
  state = await dispatchPointer(page, "look", "pointermove", 32, look.x + look.width * 0.7, lookY);
  assert.equal(state.activePointers.length, 3, "MOVE + LOOK + PRIMARY require independent ownership");
  assert.equal(state.controls.move.active, true);
  assert.equal(state.controls.look.active, true);
  assert.equal(state.controls.primary.pressed, true);
  await dispatchPointer(page, "move", "pointercancel", 31, moveX, moveY);
  await dispatchPointer(page, "look", "pointercancel", 32, look.x, lookY);
  await dispatchPointer(page, "primary", "pointercancel", 33, primary.x, primary.y);
  assert.equal((await page.evaluate(() => window.CR.getController()?.read().activePointers.length)), 0, "pointercancel must clear all ownership");

  const interact = await controlBox(page, "interact");
  state = await page.evaluate(({ x, y }) => {
    const control = document.querySelector('[data-sfhs-control-id="interact"]');
    if (!(control instanceof HTMLElement)) throw new Error("missing interact control");
    for (const pointerId of [41, 42]) {
      control.dispatchEvent(new PointerEvent("pointerdown", {
        bubbles: true, cancelable: true, pointerId, pointerType: "touch", clientX: x, clientY: y, button: 0
      }));
      document.dispatchEvent(new PointerEvent("pointerup", {
        bubbles: true, cancelable: true, pointerId, pointerType: "touch", clientX: x, clientY: y, button: 0
      }));
    }
    return window.CR.getController()?.read();
  }, { x: interact.x + interact.width / 2, y: interact.y + interact.height / 2 });
  assert.equal(state.controls.interact.count, 2, "two pulses before flush must not collapse");
  await page.evaluate(() => window.CR.getController()?.flush());

  await dispatchPointer(page, "move", "pointerdown", 51, moveX, moveY);
  await dispatchPointer(page, "move", "lostpointercapture", 51, moveX, moveY);
  assert.equal((await page.evaluate(() => window.CR.getController()?.read().activePointers.length)), 0, "lostpointercapture must clean ownership");
  await dispatchPointer(page, "primary", "pointerdown", 52, primary.x, primary.y);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  assert.equal((await page.evaluate(() => window.CR.getController()?.read().controls.primary.pressed)), false, "blur must release hold");
  await dispatchPointer(page, "move", "pointerdown", 53, moveX, moveY);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  assert.equal((await page.evaluate(() => window.CR.getController()?.read().activePointers.length)), 0, "hidden visibility must release inputs");
  await dispatchPointer(page, "move", "pointerdown", 54, moveX, moveY);
  await page.evaluate(() => dispatchEvent(new PageTransitionEvent("pagehide")));
  assert.equal((await page.evaluate(() => window.CR.getController()?.read().activePointers.length)), 0, "pagehide must release inputs");

  const beforeEdit = await page.evaluate(() => window.CR.getController()?.exportProfile().layouts.portrait.move);
  await page.locator("#edit-start").click();
  const editableMove = await controlBox(page, "move");
  await dispatchPointer(page, "move", "pointerdown", 61, editableMove.x + editableMove.width / 2, editableMove.y + editableMove.height / 2);
  await dispatchPointer(page, "move", "pointermove", 61, editableMove.x + editableMove.width / 2 + 18, editableMove.y + editableMove.height / 2 + 10);
  await dispatchPointer(page, "move", "pointerup", 61, editableMove.x, editableMove.y);
  await page.locator("#edit-save").click();
  const afterEdit = await page.evaluate(() => window.CR.getController()?.exportProfile().layouts.portrait.move);
  assert(afterEdit.x > beforeEdit.x && afterEdit.y > beforeEdit.y, "edit drag must update normalized geometry");

  await page.locator("#edit-start").click();
  const beforeResize = await page.evaluate(() => window.CR.getController()?.exportProfile().layouts.portrait.move);
  const resizeBox = await page.locator('[data-sfhs-control-id="move"] [data-sfhs-resize-handle]').boundingBox();
  assert(resizeBox !== null, "MOVE resize handle must be reachable during edit");
  await page.evaluate(({ x, y }) => {
    const handle = document.querySelector('[data-sfhs-control-id="move"] [data-sfhs-resize-handle]');
    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerId: 62, pointerType: "touch", clientX: x, clientY: y, button: 0 });
    handle.dispatchEvent(event);
  }, { x: resizeBox.x + resizeBox.width / 2, y: resizeBox.y + resizeBox.height / 2 });
  await dispatchPointer(page, "move", "pointermove", 62, resizeBox.x + resizeBox.width / 2 + 16, resizeBox.y + resizeBox.height / 2 + 12);
  await dispatchPointer(page, "move", "pointerup", 62, resizeBox.x, resizeBox.y);
  await page.locator("#edit-save").click();
  const afterResize = await page.evaluate(() => window.CR.getController()?.exportProfile().layouts.portrait.move);
  assert(afterResize.width > beforeResize.width && afterResize.height > beforeResize.height, "edit resize must update normalized dimensions");

  await page.locator("#edit-start").click();
  const beforeCancel = await page.evaluate(() => window.CR.getController()?.exportProfile());
  const cancelMove = await controlBox(page, "move");
  await dispatchPointer(page, "move", "pointerdown", 63, cancelMove.x + cancelMove.width / 2, cancelMove.y + cancelMove.height / 2);
  await dispatchPointer(page, "move", "pointermove", 63, cancelMove.x + cancelMove.width / 2 - 15, cancelMove.y + cancelMove.height / 2);
  await dispatchPointer(page, "move", "pointerup", 63, cancelMove.x, cancelMove.y);
  await page.locator("#edit-cancel").click();
  assert.deepEqual(await page.evaluate(() => window.CR.getController()?.exportProfile()), beforeCancel, "cancel must restore the exact pre-edit profile");

  await page.locator("#left-handed").click();
  const leftProfile = await page.evaluate(() => window.CR.getController()?.exportProfile());
  assert(leftProfile.layouts.portrait.move.x > leftProfile.layouts.portrait.look.x, "left profile must mirror MOVE and LOOK");
  await page.reload({ waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => window.CR.getSnapshot().ticks >= 5);
  const reloadedProfile = await page.evaluate(() => window.CR.getController()?.exportProfile());
  assert.deepEqual(reloadedProfile, leftProfile, "profile must persist across reload");

  await page.locator("#profile-export").click();
  const exportedText = await page.locator("#profile-json").inputValue();
  assert.equal(`${JSON.stringify(JSON.parse(exportedText), null, 2)}\n`, exportedText, "profile export must be deterministic JSON");
  await page.locator("#profile-json").fill(JSON.stringify({ ...leftProfile, layouts: { ...leftProfile.layouts, portrait: { ...leftProfile.layouts.portrait, unknown: leftProfile.layouts.portrait.move } } }));
  await page.locator("#profile-import").click();
  assert((await page.locator("#profile-status").evaluate((element) => element.value)).startsWith("FAIL"), "unknown control import must fail visibly");
  assert.deepEqual(await page.evaluate(() => window.CR.getController()?.exportProfile()), leftProfile, "failed import must be atomic");

  await page.locator("#profile-reset").click();
  const resetProfile = await page.evaluate(() => window.CR.getController()?.exportProfile());
  assert(resetProfile.layouts.portrait.move.x < resetProfile.layouts.portrait.look.x, "reset must restore declaration defaults");
  await page.screenshot({ path: join(evidenceRoot, "pointer-running.png"), fullPage: true });
  const selfCheck = await page.evaluate(() => window.CR.runFullSelfCheck());
  assert(selfCheck.pass, JSON.stringify(selfCheck.checks));

  await page.evaluate(() => localStorage.setItem("sfhs.mobile-controls.lab.profile.v1", "{corrupt"));
  await page.reload({ waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => window.CR.getSnapshot().ticks >= 5);
  assert.equal(await page.evaluate(() => window.CR.getController()?.read().persistence), "invalid", "corrupt storage must fail soft");

  pointerEvidence = { registrations, styles, selfCheck, coalescedDelta: 0.5, fullWidthDelta: 1, leftProfilePersisted: true };
} finally {
  await pointerRun.context.close();
}

const fallbackRun = await createPage(false);
let fallbackEvidence;
try {
  const { page } = fallbackRun;
  const registrations = await page.evaluate(() => window.__sfhsRegistrations);
  assert(registrationHas(registrations, "control:move", "touchstart"));
  for (const type of ["touchmove", "touchend", "touchcancel"]) assert(registrationHas(registrations, "document", type), `Touch fallback missing ${type}`);
  assert(!registrations.some((entry) => (entry.target === "document" || entry.target.startsWith("control:")) && entry.type.startsWith("pointer")), "Touch fallback installed Pointer gameplay listeners");
  const route = await page.evaluate(() => window.CR.getController()?.read().route);
  assert.equal(route, "touch");
  const move = await controlBox(page, "move");
  const result = await page.evaluate(({ x, y }) => {
    const control = document.querySelector('[data-sfhs-control-id="move"]');
    const touch = { identifier: 91, clientX: x, clientY: y };
    const start = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(start, "changedTouches", { value: [touch] });
    control.dispatchEvent(start);
    const movedTouch = { ...touch, clientY: y - 35 };
    const moveEvent = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperties(moveEvent, { touches: { value: [movedTouch] }, changedTouches: { value: [movedTouch] } });
    document.dispatchEvent(moveEvent);
    const during = window.CR.getController().read();
    const end = new Event("touchend", { bubbles: true, cancelable: true });
    Object.defineProperty(end, "changedTouches", { value: [movedTouch] });
    document.dispatchEvent(end);
    return { during, after: window.CR.getController().read() };
  }, { x: move.x + move.width / 2, y: move.y + move.height / 2 });
  assert(result.during.controls.move.y > 0, "Touch fallback MOVE must produce normalized movement");
  assert.equal(result.after.controls.move.active, false, "Touch fallback release must settle to neutral");
  fallbackEvidence = { registrations, route, movement: result.during.controls.move };
} finally {
  await fallbackRun.context.close();
}

const landscapeRun = await createPage(true, { width: 854, height: 384 });
let landscapeEvidence;
try {
  const { page } = landscapeRun;
  const rectangles = await page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll("[data-sfhs-control-id]")].map((element) => {
      const rect = element.getBoundingClientRect();
      return [element.dataset.sfhsControlId, { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }];
    })
  ));
  for (const [id, rect] of Object.entries(rectangles)) {
    assert(rect.left >= 0 && rect.top >= 0 && rect.right <= 854 && rect.bottom <= 384, `${id} must remain inside landscape viewport`);
  }
  assert.equal(await page.evaluate(() => window.CR.getController()?.read().orientation), "landscape");
  await page.screenshot({ path: join(evidenceRoot, "landscape-running.png"), fullPage: true });
  landscapeEvidence = { rectangles };
} finally {
  await landscapeRun.context.close();
}

const fileContext = await browser.newContext({ viewport: { width: 384, height: 854 }, isMobile: true, hasTouch: true });
let fileProtocol;
try {
  const page = await fileContext.newPage();
  await page.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => window.CR.getSnapshot().ticks >= 5);
  const check = await page.evaluate(() => window.CR.runFullSelfCheck());
  assert(check.pass, "file-protocol self-check must pass");
  fileProtocol = { pass: true, phase: check.snapshot.phase };
} finally {
  await fileContext.close();
}

await browser.close();
await server.close();

assert.equal(findings.length, 0, findings.join("\n"));
assert.equal(consoleErrors.length, 0, consoleErrors.join("\n"));
assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
assert(requests.every((url) => url === server.url), `unexpected requests observed: ${requests.join(", ")}`);

const report = Object.freeze({
  schema: "sfhs.mobile-controls-browser-proof@1",
  pass: true,
  artifact: firstPack.descriptor.artifact,
  determinism: { pass: true, firstSha256: firstPack.descriptor.artifact.sha256, secondSha256: secondPack.descriptor.artifact.sha256 },
  standardScenarios,
  pointer: pointerEvidence,
  fallback: fallbackEvidence,
  landscape: landscapeEvidence,
  fileProtocol,
  observers: { findings, consoleErrors, pageErrors, requestCount: requests.length }
});
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(join(evidenceRoot, "artifact.sha256"), `${firstPack.descriptor.artifact.sha256}  ${artifactPath.replaceAll("\\", "/")}\n`, "utf8");
assert((await readFile(artifactPath)).equals(firstBytes), "on-disk artifact must equal proved bytes");
process.stdout.write(`${JSON.stringify({ pass: report.pass, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
