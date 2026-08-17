import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import type { SfhsArtifactManifest } from "@sfhs/contracts";
import { verifyArtifactBytes } from "@sfhs/verifier";

export interface DomCanvasFabricScenarioOptions {
  readonly browserChannel?: "chrome" | "chromium";
  readonly evidenceDirectory?: string;
  readonly headless?: boolean;
  readonly timeoutMs?: number;
}

export interface DomCanvasFabricScenarioReport {
  readonly schema: "sfhs.dom-canvas-fabric-browser-scenarios@1";
  readonly valid: boolean;
  readonly browserVersion: string;
  readonly screenshots: readonly { readonly id: string; readonly path: string; readonly width: number; readonly height: number }[];
  readonly findings: readonly string[];
}

const profiles = [
  { id: "desktop", width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { id: "samsung-s21-ultra-portrait-emulation", width: 384, height: 854, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true },
  { id: "samsung-s21-ultra-landscape-emulation", width: 854, height: 384, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true }
] as const;

export async function runDomCanvasFabricArtifactScenarios(
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest,
  options: DomCanvasFabricScenarioOptions = {}
): Promise<DomCanvasFabricScenarioReport> {
  const findings: string[] = [];
  const staticVerification = verifyArtifactBytes(bytes, descriptor);
  if (!staticVerification.valid) {
    return { schema: "sfhs.dom-canvas-fabric-browser-scenarios@1", valid: false, browserVersion: "unavailable", screenshots: [], findings: staticVerification.findings.map((finding) => finding.code) };
  }
  const root = await mkdtemp(join(tmpdir(), "sfhs-dom-canvas-fabric-"));
  const artifactPath = join(root, "index.html");
  const artifactUrl = pathToFileURL(artifactPath).href;
  const screenshots: { id: string; path: string; width: number; height: number }[] = [];
  let browserVersion = "unavailable";
  try {
    await writeFile(artifactPath, bytes);
    const browser = await chromium.launch({ headless: options.headless ?? true, ...(options.browserChannel === "chrome" ? { channel: "chrome" as const } : {}) });
    browserVersion = browser.version();
    for (const profile of profiles) {
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: profile.deviceScaleFactor, isMobile: profile.isMobile, hasTouch: profile.hasTouch, serviceWorkers: "block" });
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (url === artifactUrl || /^(?:about:blank|blob:|data:)/iu.test(url)) return route.continue();
        findings.push(`Unexpected request: ${url}`);
        return route.abort("blockedbyclient");
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => findings.push(`Page error: ${error.message}`));
      page.on("console", (message) => { if (message.type() === "error") findings.push(`Console error: ${message.text()}`); });
      await page.goto(artifactUrl, { waitUntil: "load", timeout: options.timeoutMs ?? 20_000 });
      await page.waitForSelector('#app[data-boot="ready"]', { timeout: options.timeoutMs ?? 20_000 });
      if (await page.locator("#ueye-canvas").count() !== 1) findings.push("Ueye did not expose exactly one composition canvas.");
      if (profile.isMobile) {
        await page.getByRole("button", { name: "Demo" }).click();
        await page.waitForFunction(() => {
          const candidate = window as unknown as { Ueye?: { app?: { editor?: { getObjects?: () => unknown[] } } } };
          return (candidate.Ueye?.app?.editor?.getObjects?.().length ?? 0) === 1;
        });
        await page.getByRole("button", { name: "Text" }).click();
        await page.locator("#text-content").fill("Ueye browser proof");
        await page.getByRole("button", { name: "Apply text settings" }).click();
        await page.getByRole("button", { name: "Done" }).click();
      }
      if (options.evidenceDirectory !== undefined) {
        const path = join(options.evidenceDirectory, `${profile.id}.png`);
        await mkdir(options.evidenceDirectory, { recursive: true });
        await page.screenshot({ path, fullPage: true });
        screenshots.push({ id: profile.id, path, width: profile.width, height: profile.height });
      }
      await context.close();
    }
    await browser.close();
  } catch (error) {
    findings.push(error instanceof Error ? error.message : "Unknown DOM/Canvas browser scenario failure.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  return { schema: "sfhs.dom-canvas-fabric-browser-scenarios@1", valid: findings.length === 0, browserVersion, screenshots, findings };
}
