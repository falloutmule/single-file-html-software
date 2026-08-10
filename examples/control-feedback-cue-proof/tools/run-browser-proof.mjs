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
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_CONTROL_CUE_EVIDENCE ?? ".sfhs-evidence/control-feedback-cue-v0");
const artifactPath = join(projectRoot, "dist", "index.html");
await mkdir(evidenceRoot, { recursive: true });

const first = await packProject(projectRoot, { sourceRevision: "control-feedback-cue-v0" });
const second = await packProject(projectRoot, { sourceRevision: "control-feedback-cue-v0" });
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
assert.equal(await page.evaluate(() => window.CFCUE.selfCheck().pass), true);
assert.equal(await page.evaluate(() => window.CFCUE.selfCheck().audioSupported), true, "Chromium must expose Web Audio");
await page.locator("#unlock").click();
const unlocked = await page.evaluate(() => window.CFCUE.diagnostics());
assert.equal(unlocked.primary.contextState, "running");
assert.equal(unlocked.primary.engineId, unlocked.shared.engineId, "transports must share one context per window");

await page.locator("#control .sfhs-cf-interactive").click();
assert.equal(await page.evaluate(() => window.CFCUE.activationCount), 1);
assert((await page.evaluate(() => window.CFCUE.diagnostics().primary.totalScheduled)) >= 2, "press and activation cues must schedule");
const burst = await page.evaluate(() => window.CFCUE.playBurst(12));
assert(burst.some((result) => result.reason === "voice-limit"), "voice cap must drop excess cues deterministically");
assert((await page.evaluate(() => window.CFCUE.diagnostics().primary.activeVoices)) <= 3);

await page.locator("#mute").click();
const muted = await page.evaluate(() => window.CFCUE.playBurst(1)[0]);
assert.equal(muted.reason, "muted");
await page.screenshot({ path: join(evidenceRoot, "cue-transports.png"), fullPage: true });
await context.close();

const fileContext = await browser.newContext({ viewport: { width: 384, height: 720 } });
const filePage = await fileContext.newPage();
const fileErrors = [];
filePage.on("pageerror", (error) => fileErrors.push(error.message));
await filePage.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
assert.equal(await filePage.evaluate(() => window.CFCUE.selfCheck().pass), true);
await filePage.locator("#unlock").click();
await filePage.locator("#control .sfhs-cf-interactive").click();
assert.equal(await filePage.evaluate(() => window.CFCUE.activationCount), 1, "file protocol activation");
assert((await filePage.evaluate(() => window.CFCUE.diagnostics().primary.totalScheduled)) >= 2, "file protocol audio scheduling");
await fileContext.close();
await browser.close();
await server.close();

assert.deepEqual(unexpectedRequests, []);
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(fileErrors, []);
const report = {
  schema: "sfhs.control-feedback-cue-browser-proof@0",
  pass: true,
  artifact: first.descriptor.artifact,
  determinism: { identical: true, sha256: first.descriptor.artifact.sha256 },
  http: { audioUnlocked: true, sharedContext: true, voiceLimit: 3, mute: true, haptics: "best-effort" },
  fileProtocol: { pass: true, audioScheduling: true },
  physicalLatency: "not-claimed",
  observers: { unexpectedRequests, consoleErrors, pageErrors, fileErrors }
};
await writeFile(join(evidenceRoot, "browser-proof.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
assert((await readFile(artifactPath)).equals(Buffer.from(first.bytes)), "proved artifact must equal on-disk artifact");
process.stdout.write(`${JSON.stringify({ pass: true, artifact: report.artifact, evidence: join(evidenceRoot, "browser-proof.json") }, null, 2)}\n`);
