import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";

import { chromium } from "playwright";

import { runExactArtifactBrowserSmoke, startExactArtifactServer } from "@sfhs/browser-runner";
import { packProject } from "@sfhs/packer";

const projectRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(projectRoot, "..", "..");
const evidenceRoot = resolve(repositoryRoot, process.env.SFHS_IMPORT_EVIDENCE ?? ".sfhs-evidence/008a-import-browser");
const profiles = Object.freeze([
  Object.freeze({ id: "desktop", width: 1440, height: 900, deviceScaleFactor: 1 }),
  Object.freeze({ id: "samsung-s21-ultra-portrait-emulation", width: 384, height: 854, deviceScaleFactor: 3, isMobile: true, hasTouch: true }),
  Object.freeze({ id: "samsung-s21-ultra-landscape-emulation", width: 854, height: 384, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
]);

await mkdir(evidenceRoot, { recursive: true });
const packed = await packProject(projectRoot, { sourceRevision: process.env.SFHS_SOURCE_REVISION ?? "008a-import-proof" });
const reports = [];
for (const profile of profiles) {
  reports.push(await runExactArtifactBrowserSmoke(packed.bytes, packed.descriptor, {
    viewport: profile,
    screenshotPath: join(evidenceRoot, `${profile.id}.png`)
  }));
}

const server = await startExactArtifactServer(packed.bytes);
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
const page = await context.newPage();
const interactionFindings = [];
const runtimeRequests = [];
page.on("request", (request) => runtimeRequests.push(request.url()));
await context.route("**/*", async (route) => {
  const url = route.request().url();
  if (url === server.url || /^(?:about:blank|blob:|data:)/iu.test(url)) {
    await route.continue();
  } else {
    interactionFindings.push(`unexpected request: ${url}`);
    await route.abort("blockedbyclient");
  }
});

let keyboardMovement = false;
let pointerMovement = false;
let collection = false;
try {
  await page.goto(server.url, { waitUntil: "load" });
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => globalThis.document.querySelector("#fixture-shell")?.getAttribute("data-phase") === "running");
  const initialX = await page.evaluate(() => globalThis.CR.getSnapshot().playerX);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(180);
  await page.keyboard.up("ArrowRight");
  const keyboardX = await page.evaluate(() => globalThis.CR.getSnapshot().playerX);
  keyboardMovement = keyboardX > initialX;

  const leftButton = page.locator("#btn-left");
  const box = await leftButton.boundingBox();
  if (box !== null) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(180);
    await page.mouse.up();
  }
  const pointerX = await page.evaluate(() => globalThis.CR.getSnapshot().playerX);
  pointerMovement = pointerX < keyboardX;

  await page.keyboard.down("ArrowRight");
  await page.waitForFunction(() => globalThis.CR.getSnapshot().score === 1, undefined, { timeout: 5_000 });
  await page.keyboard.up("ArrowRight");
  collection = await page.locator("#score").textContent() === "1";
  await page.screenshot({ path: join(evidenceRoot, "interaction-complete.png"), fullPage: true });
} catch (error) {
  interactionFindings.push(error instanceof Error ? error.message : "unknown interaction failure");
} finally {
  await page.close();
  await context.close();
  await browser.close();
  await server.close();
}

const interaction = Object.freeze({
  keyboardMovement,
  pointerMovement,
  collection,
  requestCount: runtimeRequests.length,
  findings: Object.freeze(interactionFindings),
  valid: keyboardMovement && pointerMovement && collection && runtimeRequests.length === 1 && interactionFindings.length === 0
});

const report = Object.freeze({
  schema: "sfhs.import-browser-proof@1",
  artifact: packed.descriptor.artifact,
  profiles: reports.map((entry) => Object.freeze({
    id: entry.browser.profile.id,
    valid: entry.valid,
    phase: entry.runtime.phase,
    selfCheckPass: entry.runtime.selfCheckPass,
    requestCount: entry.requests.length,
    findings: entry.findings
  })),
  interaction
});
await writeFile(join(evidenceRoot, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (reports.some((entry) => !entry.valid) || !interaction.valid) process.exitCode = 1;
