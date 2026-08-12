import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";
import { runExactArtifactBrowserSmoke, runHtmlArtifactBrowserSmoke } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const artifact = await packProject(projectRoot, { sourceRevision: "physics-2d-proof" });
const strict = await runExactArtifactBrowserSmoke(artifact.bytes, artifact.descriptor);
if (!strict.valid) throw new Error(`Strict smoke failed: ${JSON.stringify(strict.findings)}`);
const generic = await runHtmlArtifactBrowserSmoke(artifact.bytes, { readySelector: "#physics-ready" });
if (!generic.valid) throw new Error(`Generic smoke failed: ${JSON.stringify(generic.findings)}`);

const artifactPath = resolve(projectRoot, artifact.descriptor.artifact.path);
const screenshotPath = resolve(projectRoot, "test-results", "phone-proof.png");
await mkdir(dirname(screenshotPath), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const page = await context.newPage();
const requests = [];
const errors = [];
page.on("request", (request) => requests.push(request.url()));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => globalThis.CR.getSnapshot().ticks >= 10);
  await page.locator("#impulse").click();
  await page.locator("#restart").click();
  await page.waitForFunction(() => globalThis.CR.getSnapshot().generation >= 2 && globalThis.CR.getSnapshot().ticks >= 5);
  const selfCheck = await page.evaluate(() => globalThis.CR.runFullSelfCheck());
  if (!selfCheck.pass) throw new Error(`File protocol self-check failed: ${JSON.stringify(selfCheck)}`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
if (errors.length > 0) throw new Error(`File protocol errors: ${errors.join("; ")}`);
if (requests.some((url) => !url.startsWith("file:"))) throw new Error(`Unexpected file protocol request: ${JSON.stringify(requests)}`);

console.log(JSON.stringify({
  valid: true,
  artifact: artifact.descriptor.artifact,
  strictBrowser: strict.browser,
  genericBrowser: generic.browser,
  fileProtocol: { requests, screenshotPath }
}, null, 2));
