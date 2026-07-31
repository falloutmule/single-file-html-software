import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "playwright";
import { startExactArtifactServer } from "@sfhs/browser-runner";

const root = resolve(import.meta.dirname, "..");
const artifact = await readFile(resolve(root, "dist", "index.html"));
const server = await startExactArtifactServer(artifact);
const browser = await chromium.launch({
  headless: true,
  args: ["--ignore-gpu-blocklist", "--enable-webgl", "--use-angle=swiftshader"]
});
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
const pageErrors = [];
const unexpectedRequests = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("request", (request) => {
  if (request.url() !== server.url) unexpectedRequests.push(request.url());
});

try {
  await page.goto(server.url, { waitUntil: "load" });
  await page.locator("#start-button").click();
  await page.waitForFunction("window.__SKYLINE_DROP__?.state()?.phase === 'playing'");
  await page.waitForSelector("#pixi-host canvas");
  assert.equal(await page.locator("#pixi-host canvas").count(), 1, "one visible Pixi surface");
  assert.equal(await page.evaluate("(() => { const canvas = document.querySelector('#pixi-host canvas'); return Boolean(canvas?.getContext('webgl2') || canvas?.getContext('webgl')); })()"), true, "WebGL renderer");
  await page.keyboard.press("e");
  await page.keyboard.press("e");
  await page.keyboard.press("Space");
  await page.waitForFunction("(window.__SKYLINE_DROP__?.state()?.turn ?? 0) === 1");
  assert.equal(await page.evaluate("window.__SKYLINE_DROP__?.state()?.currentPieceId"), "main-street", "placement advances the loop");
  await page.keyboard.press("p");
  await page.waitForFunction("window.__SKYLINE_DROP__?.state()?.phase === 'paused'");
  await page.locator("#resume-button").click();
  await page.waitForFunction("window.__SKYLINE_DROP__?.state()?.phase === 'playing'");
  await page.setViewportSize({ width: 932, height: 430 });
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#pixi-host canvas").count(), 1, "resize retains the primary surface");
  assert.deepEqual(pageErrors, [], "no page errors");
  assert.deepEqual(unexpectedRequests, [], "no runtime external requests");
  process.stdout.write("SKYLINE_CANONICAL_BROWSER_SMOKE PASS\n");
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
