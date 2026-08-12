import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { runHtmlArtifactBrowserSmoke } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const artifact = await packProject(projectRoot, { sourceRevision: "godot-animation-proof" });
const generic = await runHtmlArtifactBrowserSmoke(artifact.bytes, { readySelector: "[data-ready='true']" });
if (!generic.valid) throw new Error(`Generic smoke failed: ${JSON.stringify(generic.findings)}`);

const artifactPath = resolve(projectRoot, artifact.descriptor.artifact.path);
const screenshotPath = resolve(projectRoot, "test-results", "playback.png");
await mkdir(dirname(screenshotPath), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 720, height: 480 }, serviceWorkers: "block" });
const page = await context.newPage();
const requests = [];
const errors = [];
page.on("request", (request) => requests.push(request.url()));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
  await page.waitForSelector("[data-ready='true']");
  if (await page.locator("canvas").count() !== 1) throw new Error("Playback must use exactly one visible canvas.");
  await page.locator("#toggle").click();
  const frame = await page.evaluate(() => globalThis.__SFHS_GODOT_ANIMATION_PROOF__?.getFrame());
  if (frame !== 1) throw new Error(`Expected wave frame 1; received ${String(frame)}.`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
if (errors.length > 0) throw new Error(`Playback errors: ${errors.join("; ")}`);
if (requests.some((url) => !url.startsWith("file:"))) throw new Error(`Unexpected runtime request: ${JSON.stringify(requests)}`);

console.log(JSON.stringify({
  valid: true,
  artifact: artifact.descriptor.artifact,
  genericBrowser: generic.browser,
  fileProtocol: { requests, screenshotPath }
}, null, 2));
