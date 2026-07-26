import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { SfhsArtifactManifest } from "@sfhs/contracts";
import { sha256Bytes } from "@sfhs/core";

import type {
  BrowserSmokeReport,
  BrowserViewportProfile
} from "./index.ts";

export type PixiScenarioId =
  | "boot-assets-audio"
  | "context-loss-classified"
  | "file-protocol"
  | "fixed-step-visibility"
  | "keyboard-input"
  | "pointer-input"
  | "resize-landscape"
  | "resize-portrait"
  | "target-activation";

export interface PixiScenarioResult {
  readonly id: PixiScenarioId;
  readonly pass: boolean;
  readonly detail: string;
}

export interface PixiScreenshotRecord {
  readonly id: "desktop" | "samsung-s21-ultra-landscape-emulation" | "samsung-s21-ultra-portrait-emulation";
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
  readonly runtimeResolution: number;
}

export interface PixiScenarioOptions {
  readonly browserChannel?: "chrome" | "chromium";
  readonly evidenceDirectory?: string;
  readonly headless?: boolean;
  readonly timeoutMs?: number;
}

export interface PixiScenarioReport {
  readonly schema: "sfhs.pixi-browser-scenarios@1";
  readonly valid: boolean;
  readonly artifact: {
    readonly bytes: number;
    readonly sha256: string;
    readonly buildId: string;
  };
  readonly smoke: BrowserSmokeReport;
  readonly scenarios: readonly PixiScenarioResult[];
  readonly screenshots: readonly PixiScreenshotRecord[];
  readonly unexpectedRequests: readonly string[];
  readonly pageErrors: readonly string[];
}

interface RuntimeSnapshot {
  readonly schema: "sfhs.runtime@1";
  readonly phase: "ready" | "running";
  readonly running: boolean;
  readonly ticks: number;
  readonly player: { readonly x: number; readonly y: number };
  readonly activationCount: number;
  readonly orientation: "portrait" | "landscape";
  readonly viewport: {
    readonly width: number;
    readonly height: number;
    readonly devicePixelRatio: number;
  };
  readonly audio: string;
}

const samsungPortrait: BrowserViewportProfile = Object.freeze({
  id: "samsung-galaxy-s21-ultra-portrait-emulation",
  width: 384,
  height: 854,
  deviceScaleFactor: 3.75,
  isMobile: true,
  hasTouch: true
});

const samsungLandscape: BrowserViewportProfile = Object.freeze({
  id: "samsung-galaxy-s21-ultra-landscape-emulation",
  width: 854,
  height: 384,
  deviceScaleFactor: 3.75,
  isMobile: true,
  hasTouch: true
});

async function snapshot(page: Page): Promise<RuntimeSnapshot> {
  return page.evaluate(() => {
    const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
    return candidate.CR.getSnapshot();
  });
}

async function waitForRunning(page: Page, timeoutMs: number): Promise<RuntimeSnapshot> {
  await page.locator("#fixture-start").click();
  await page.waitForFunction(() => {
    const candidate = window as unknown as { CR?: { getSnapshot(): RuntimeSnapshot } };
    return candidate.CR?.getSnapshot().phase === "running" && candidate.CR.getSnapshot().ticks >= 1;
  }, undefined, { timeout: timeoutMs });
  return snapshot(page);
}

async function configureAuditedContext(
  browser: Browser,
  profile: BrowserViewportProfile,
  allowedUrl: string,
  unexpectedRequests: string[],
  pageErrors: string[]
): Promise<{ context: BrowserContext; page: Page; stopAudit(): void }> {
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile ?? false,
    hasTouch: profile.hasTouch ?? false,
    serviceWorkers: "block"
  });
  let auditActive = true;
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === allowedUrl || /^(?:about:blank|blob:|data:)/iu.test(url)) {
      await route.continue();
      return;
    }
    if (auditActive) {
      unexpectedRequests.push(url);
    }
    await route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    if (auditActive) {
      pageErrors.push(error.message);
    }
  });
  page.on("console", (message) => {
    if (auditActive && message.type() === "error") {
      pageErrors.push(message.text());
    }
  });
  return { context, page, stopAudit: () => { auditActive = false; } };
}

async function runScenario(
  results: PixiScenarioResult[],
  id: PixiScenarioId,
  action: () => Promise<string>
): Promise<void> {
  try {
    results.push(Object.freeze({ id, pass: true, detail: await action() }));
  } catch (error) {
    results.push(Object.freeze({
      id,
      pass: false,
      detail: error instanceof Error ? error.message : "Unknown scenario failure."
    }));
  }
}

async function captureProfile(
  browser: Browser,
  serverUrl: string,
  profile: BrowserViewportProfile,
  screenshotId: PixiScreenshotRecord["id"],
  screenshotPath: string,
  timeoutMs: number,
  unexpectedRequests: string[],
  pageErrors: string[]
): Promise<PixiScreenshotRecord> {
  const audited = await configureAuditedContext(
    browser,
    profile,
    serverUrl,
    unexpectedRequests,
    pageErrors
  );
  try {
    await audited.page.goto(serverUrl, { waitUntil: "load", timeout: timeoutMs });
    const running = await waitForRunning(audited.page, timeoutMs);
    if (running.orientation !== (profile.width >= profile.height ? "landscape" : "portrait")) {
      throw new Error(`Runtime orientation mismatch for ${profile.id}.`);
    }
    if (running.viewport.devicePixelRatio !== 2) {
      throw new Error(`Runtime DPR cap was ${running.viewport.devicePixelRatio}; expected 2.`);
    }
    await mkdir(resolve(screenshotPath, ".."), { recursive: true });
    await audited.page.screenshot({ path: screenshotPath, fullPage: true });
    return Object.freeze({
      id: screenshotId,
      path: screenshotPath,
      width: profile.width,
      height: profile.height,
      deviceScaleFactor: profile.deviceScaleFactor,
      runtimeResolution: running.viewport.devicePixelRatio
    });
  } finally {
    audited.stopAudit();
    await audited.context.close();
  }
}

async function fileProtocolScenario(
  browser: Browser,
  bytes: Uint8Array,
  timeoutMs: number,
  pageErrors: string[]
): Promise<string> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "sfhs-file-protocol-"));
  const artifactPath = join(temporaryRoot, "index.html");
  await writeFile(artifactPath, bytes);
  const fileUrl = pathToFileURL(artifactPath).href;
  const context = await browser.newContext({ serviceWorkers: "block" });
  let auditActive = true;
  const unexpected: string[] = [];
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url === fileUrl || /^(?:about:blank|blob:|data:)/iu.test(url)) {
      await route.continue();
      return;
    }
    if (auditActive) {
      unexpected.push(url);
    }
    await route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => {
    if (auditActive) {
      pageErrors.push(error.message);
    }
  });
  try {
    await page.goto(fileUrl, { waitUntil: "load", timeout: timeoutMs });
    const running = await waitForRunning(page, timeoutMs);
    if (unexpected.length > 0) {
      throw new Error(`file:// made unexpected requests: ${unexpected.join(", ")}`);
    }
    if (running.audio !== "ready") {
      throw new Error(`file:// audio status was ${running.audio}.`);
    }
    return `PASS: running at ${fileUrl.split("/").at(-1)} with embedded audio ready and no external request.`;
  } finally {
    auditActive = false;
    await context.close();
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function runPixiArtifactScenarios(
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest,
  options: PixiScenarioOptions = {}
): Promise<PixiScenarioReport> {
  const { runExactArtifactBrowserSmoke, startExactArtifactServer } = await import("./index.ts");
  const timeoutMs = options.timeoutMs ?? 20_000;
  const channel = options.browserChannel ?? "chromium";
  const evidenceDirectory = resolve(options.evidenceDirectory ?? ".sfhs-browser/scenarios");
  const desktopScreenshot = join(evidenceDirectory, "desktop-running.png");
  const smoke = await runExactArtifactBrowserSmoke(bytes, descriptor, {
    browserChannel: channel,
    headless: options.headless ?? true,
    screenshotPath: desktopScreenshot,
    timeoutMs
  });
  const results: PixiScenarioResult[] = [];
  const screenshots: PixiScreenshotRecord[] = [];
  const unexpectedRequests: string[] = [];
  const pageErrors: string[] = [];
  if (!smoke.valid) {
    return Object.freeze({
      schema: "sfhs.pixi-browser-scenarios@1",
      valid: false,
      artifact: Object.freeze({
        bytes: bytes.byteLength,
        sha256: sha256Bytes(bytes),
        buildId: descriptor.artifact.buildId
      }),
      smoke,
      scenarios: Object.freeze(results),
      screenshots: Object.freeze(screenshots),
      unexpectedRequests: Object.freeze(unexpectedRequests),
      pageErrors: Object.freeze(pageErrors)
    });
  }

  const server = await startExactArtifactServer(bytes);
  const browser = await chromium.launch({
    headless: options.headless ?? true,
    ...(channel === "chrome" ? { channel: "chrome" as const } : {})
  });
  const desktop: BrowserViewportProfile = Object.freeze({
    id: "desktop-scenarios",
    width: 1440,
    height: 900,
    deviceScaleFactor: 1
  });
  const audited = await configureAuditedContext(
    browser,
    desktop,
    server.url,
    unexpectedRequests,
    pageErrors
  );
  try {
    await audited.page.goto(server.url, { waitUntil: "load", timeout: timeoutMs });
    await waitForRunning(audited.page, timeoutMs);

    await runScenario(results, "boot-assets-audio", async () => {
      const state = await snapshot(audited.page);
      const canvas = audited.page.locator("#pixi-host canvas");
      if (await canvas.count() !== 1 || state.audio !== "ready" || !state.running) {
        throw new Error(`canvas/audio/running mismatch: canvas=${await canvas.count()} audio=${state.audio} running=${state.running}`);
      }
      const dimensions = await canvas.evaluate((element) => {
        const candidate = element as HTMLCanvasElement;
        return { width: candidate.width, height: candidate.height };
      });
      if (dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error("Pixi canvas backing dimensions are empty.");
      }
      return `PASS: canvas ${dimensions.width}x${dimensions.height}, embedded audio ${state.audio}, ticks ${state.ticks}.`;
    });

    await runScenario(results, "fixed-step-visibility", async () => {
      const before = await snapshot(audited.page);
      await audited.page.waitForFunction((ticks) => {
        const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
        return candidate.CR.getSnapshot().ticks >= Number(ticks) + 5;
      }, before.ticks);
      await audited.page.evaluate(() => {
        const holder = { hidden: true };
        Object.defineProperty(document, "hidden", { configurable: true, get: () => holder.hidden });
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => holder.hidden ? "hidden" : "visible"
        });
        (window as unknown as { __sfhsVisibilityHolder: { hidden: boolean } }).__sfhsVisibilityHolder = holder;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      const hidden = await snapshot(audited.page);
      await audited.page.waitForTimeout(120);
      const stillHidden = await snapshot(audited.page);
      if (hidden.running || stillHidden.ticks !== hidden.ticks) {
        throw new Error(`Hidden lifecycle advanced from ${hidden.ticks} to ${stillHidden.ticks}.`);
      }
      await audited.page.evaluate(() => {
        const holder = (window as unknown as { __sfhsVisibilityHolder: { hidden: boolean } }).__sfhsVisibilityHolder;
        holder.hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await audited.page.waitForFunction((ticks) => {
        const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
        return candidate.CR.getSnapshot().running && candidate.CR.getSnapshot().ticks > Number(ticks);
      }, stillHidden.ticks);
      return `PASS: paused at tick ${hidden.ticks} and resumed without hidden catch-up.`;
    });

    await runScenario(results, "keyboard-input", async () => {
      const before = await snapshot(audited.page);
      await audited.page.keyboard.down("ArrowRight");
      try {
        await audited.page.waitForFunction((x) => {
          const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
          return candidate.CR.getSnapshot().player.x >= Number(x) + 8;
        }, before.player.x);
      } finally {
        await audited.page.keyboard.up("ArrowRight");
      }
      const after = await snapshot(audited.page);
      return `PASS: keyboard moved player x ${before.player.x} -> ${after.player.x}.`;
    });

    await runScenario(results, "pointer-input", async () => {
      const before = await snapshot(audited.page);
      const control = audited.page.locator('[data-fixture-action="move-left"]');
      const bounds = await control.boundingBox();
      if (bounds === null) {
        throw new Error("Move-left control has no pointer bounds.");
      }
      await audited.page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await audited.page.mouse.down();
      try {
        await audited.page.waitForFunction((x) => {
          const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
          return candidate.CR.getSnapshot().player.x <= Number(x) - 8;
        }, before.player.x);
      } finally {
        await audited.page.mouse.up();
      }
      const after = await snapshot(audited.page);
      return `PASS: pointer control moved player x ${before.player.x} -> ${after.player.x}.`;
    });

    await runScenario(results, "target-activation", async () => {
      const before = await snapshot(audited.page);
      const canvas = audited.page.locator("#pixi-host canvas");
      const bounds = await canvas.boundingBox();
      if (bounds === null) {
        throw new Error("Pixi canvas has no pointer bounds.");
      }
      await audited.page.mouse.click(
        bounds.x + bounds.width * (720 / 960),
        bounds.y + bounds.height * (270 / 540)
      );
      await audited.page.waitForFunction((count) => {
        const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
        return candidate.CR.getSnapshot().activationCount > Number(count);
      }, before.activationCount);
      const after = await snapshot(audited.page);
      return `PASS: target activations ${before.activationCount} -> ${after.activationCount}.`;
    });

    await runScenario(results, "resize-portrait", async () => {
      await audited.page.setViewportSize({ width: samsungPortrait.width, height: samsungPortrait.height });
      await audited.page.waitForFunction(() => {
        const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
        return candidate.CR.getSnapshot().orientation === "portrait";
      });
      const layout = await audited.page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>("#fixture-shell");
        const host = document.querySelector<HTMLElement>("#pixi-host");
        const canvas = document.querySelector<HTMLCanvasElement>("#pixi-host canvas");
        const style = shell === null ? undefined : getComputedStyle(shell);
        const hostRect = host?.getBoundingClientRect();
        const canvasRect = canvas?.getBoundingClientRect();
        return {
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          inlinePadding: style === undefined ? 0 : Number.parseFloat(style.paddingLeft),
          orientation: shell?.dataset.orientation,
          canvasContained: hostRect !== undefined && canvasRect !== undefined &&
            canvasRect.left >= hostRect.left - 1 &&
            canvasRect.top >= hostRect.top - 1 &&
            canvasRect.right <= hostRect.right + 1 &&
            canvasRect.bottom <= hostRect.bottom + 1,
          canvasObjectFit: canvas === null ? "missing" : getComputedStyle(canvas).objectFit
        };
      });
      if (
        layout.horizontalOverflow ||
        layout.inlinePadding < 12 ||
        layout.orientation !== "portrait" ||
        !layout.canvasContained ||
        layout.canvasObjectFit !== "contain"
      ) {
        throw new Error(`Portrait layout invalid: ${JSON.stringify(layout)}`);
      }
      return `PASS: 384x854 portrait, no horizontal overflow, ${layout.inlinePadding}px minimum safe padding.`;
    });

    await runScenario(results, "resize-landscape", async () => {
      await audited.page.setViewportSize({ width: samsungLandscape.width, height: samsungLandscape.height });
      await audited.page.waitForFunction(() => {
        const candidate = window as unknown as { CR: { getSnapshot(): RuntimeSnapshot } };
        return candidate.CR.getSnapshot().orientation === "landscape";
      });
      const layout = await audited.page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>("#fixture-shell");
        const canvas = document.querySelector<HTMLElement>("#pixi-host");
        const renderedCanvas = document.querySelector<HTMLCanvasElement>("#pixi-host canvas");
        const hud = document.querySelector<HTMLElement>(".fixture-hud");
        const controls = document.querySelector<HTMLElement>(".fixture-controls");
        if (shell === null || canvas === null || renderedCanvas === null || hud === null || controls === null) {
          return { missingElement: true };
        }
        const shellRect = shell.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const renderedCanvasRect = renderedCanvas.getBoundingClientRect();
        const hudRect = hud.getBoundingClientRect();
        const controlsRect = controls.getBoundingClientRect();
        const contained = [canvasRect, hudRect, controlsRect].every((rect) =>
          rect.left >= shellRect.left - 1 &&
          rect.top >= shellRect.top - 1 &&
          rect.right <= shellRect.right + 1 &&
          rect.bottom <= shellRect.bottom + 1
        );
        const hudControlsOverlap = !(
          hudRect.right <= controlsRect.left ||
          controlsRect.right <= hudRect.left ||
          hudRect.bottom <= controlsRect.top ||
          controlsRect.bottom <= hudRect.top
        );
        const renderedCanvasContained =
          renderedCanvasRect.left >= canvasRect.left - 1 &&
          renderedCanvasRect.top >= canvasRect.top - 1 &&
          renderedCanvasRect.right <= canvasRect.right + 1 &&
          renderedCanvasRect.bottom <= canvasRect.bottom + 1;
        return {
          missingElement: false,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          internalOverflow: shell.scrollHeight > shell.clientHeight + 1,
          contained,
          renderedCanvasContained,
          canvasObjectFit: getComputedStyle(renderedCanvas).objectFit,
          hudControlsOverlap,
          orientation: shell.dataset.orientation
        };
      });
      if (
        layout.missingElement ||
        layout.horizontalOverflow ||
        layout.internalOverflow ||
        !layout.contained ||
        !layout.renderedCanvasContained ||
        layout.canvasObjectFit !== "contain" ||
        layout.hudControlsOverlap ||
        layout.orientation !== "landscape"
      ) {
        throw new Error(`Landscape layout invalid: ${JSON.stringify(layout)}`);
      }
      return "PASS: 854x384 landscape with canvas, HUD, and controls contained and non-overlapping.";
    });

    screenshots.push(Object.freeze({
      id: "desktop",
      path: desktopScreenshot,
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      runtimeResolution: 1
    }));
    screenshots.push(await captureProfile(
      browser,
      server.url,
      samsungPortrait,
      "samsung-s21-ultra-portrait-emulation",
      join(evidenceDirectory, "samsung-s21-ultra-portrait.png"),
      timeoutMs,
      unexpectedRequests,
      pageErrors
    ));
    screenshots.push(await captureProfile(
      browser,
      server.url,
      samsungLandscape,
      "samsung-s21-ultra-landscape-emulation",
      join(evidenceDirectory, "samsung-s21-ultra-landscape.png"),
      timeoutMs,
      unexpectedRequests,
      pageErrors
    ));

    await runScenario(results, "file-protocol", () => fileProtocolScenario(
      browser,
      bytes,
      timeoutMs,
      pageErrors
    ));

    await runScenario(results, "context-loss-classified", async () => {
      const result = await audited.page.evaluate(async () => {
        const canvas = document.querySelector<HTMLCanvasElement>("#pixi-host canvas");
        if (canvas === null) {
          return { extension: false, eventObserved: false };
        }
        const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
        const extension = context?.getExtension("WEBGL_lose_context");
        if (extension === null || extension === undefined) {
          return { extension: false, eventObserved: false };
        }
        const observed = new Promise<boolean>((resolvePromise) => {
          const timeout = window.setTimeout(() => resolvePromise(false), 1_000);
          canvas.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            window.clearTimeout(timeout);
            resolvePromise(true);
          }, { once: true });
        });
        extension.loseContext();
        return { extension: true, eventObserved: await observed };
      });
      if (!result.extension || !result.eventObserved) {
        throw new Error(`Context loss was not classifiable: ${JSON.stringify(result)}`);
      }
      return "PASS: WEBGL_lose_context supported and webglcontextlost observed as an expected classified event.";
    });
  } finally {
    audited.stopAudit();
    await audited.context.close();
    await browser.close();
    await server.close();
  }

  const sortedScenarios = Object.freeze([...results].sort((left, right) => left.id.localeCompare(right.id)));
  const uniqueUnexpected = Object.freeze([...new Set(unexpectedRequests)].sort());
  const uniquePageErrors = Object.freeze([...new Set(pageErrors)].sort());
  return Object.freeze({
    schema: "sfhs.pixi-browser-scenarios@1",
    valid: smoke.valid &&
      sortedScenarios.length === 9 &&
      sortedScenarios.every((scenario) => scenario.pass) &&
      uniqueUnexpected.length === 0 &&
      uniquePageErrors.length === 0 &&
      screenshots.length === 3,
    artifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      buildId: descriptor.artifact.buildId
    }),
    smoke,
    scenarios: sortedScenarios,
    screenshots: Object.freeze(screenshots),
    unexpectedRequests: uniqueUnexpected,
    pageErrors: uniquePageErrors
  });
}

export const samsungGalaxyS21UltraProfiles = Object.freeze({
  portrait: samsungPortrait,
  landscape: samsungLandscape
});
