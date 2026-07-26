import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

import type { SfhsArtifactManifest } from "@sfhs/contracts";
import { sha256Bytes } from "@sfhs/core";
import { verifyArtifactBytes } from "@sfhs/verifier";

export const packageIdentity = "@sfhs/browser-runner" as const;

export type BrowserFindingCode =
  | "SFHS_BROWSER_CONSOLE_ERROR"
  | "SFHS_BROWSER_CONSOLE_WARNING"
  | "SFHS_BROWSER_DIALOG"
  | "SFHS_BROWSER_EXACT_BYTES_MISMATCH"
  | "SFHS_BROWSER_LAUNCH_FAILED"
  | "SFHS_BROWSER_NAVIGATION_FAILED"
  | "SFHS_BROWSER_PAGE_ERROR"
  | "SFHS_BROWSER_RESPONSE_ERROR"
  | "SFHS_BROWSER_RUNTIME_FAILED"
  | "SFHS_BROWSER_SELF_CHECK_FAILED"
  | "SFHS_BROWSER_STATIC_VERIFICATION_FAILED"
  | "SFHS_BROWSER_UNEXPECTED_REQUEST"
  | "SFHS_BROWSER_WEBGL_UNSUPPORTED";

export interface BrowserFinding {
  readonly code: BrowserFindingCode;
  readonly message: string;
  readonly detail?: string;
}

export interface BrowserRequestRecord {
  readonly method: string;
  readonly resourceType: string;
  readonly url: string;
}

export interface BrowserConsoleRecord {
  readonly type: string;
  readonly text: string;
}

export interface BrowserViewportProfile {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
  readonly isMobile?: boolean;
  readonly hasTouch?: boolean;
}

export interface BrowserSmokeOptions {
  readonly browserChannel?: "chrome" | "chromium";
  readonly browserLaunchArgs?: readonly string[];
  readonly headless?: boolean;
  readonly screenshotPath?: string;
  readonly timeoutMs?: number;
  readonly viewport?: BrowserViewportProfile;
}

export interface BrowserSmokeReport {
  readonly schema: "sfhs.browser-smoke@1";
  readonly valid: boolean;
  readonly artifact: {
    readonly bytes: number;
    readonly sha256: string;
    readonly buildId: string;
  };
  readonly browser: {
    readonly channel: "chrome" | "chromium";
    readonly version: string;
    readonly userAgent: string;
    readonly profile: BrowserViewportProfile;
  };
  readonly runtime: {
    readonly phase: string;
    readonly selfCheckPass: boolean;
    readonly snapshot?: unknown;
  };
  readonly requests: readonly BrowserRequestRecord[];
  readonly console: readonly BrowserConsoleRecord[];
  readonly findings: readonly BrowserFinding[];
}

export interface ExactArtifactServer {
  readonly url: string;
  readonly servedRequestCount: () => number;
  close(): Promise<void>;
}

const desktopProfile: BrowserViewportProfile = Object.freeze({
  id: "desktop-chromium",
  width: 1440,
  height: 900,
  deviceScaleFactor: 1
});

function sortFindings(findings: readonly BrowserFinding[]): readonly BrowserFinding[] {
  return Object.freeze([...findings].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code);
    return byCode === 0 ? (left.detail ?? "").localeCompare(right.detail ?? "") : byCode;
  }));
}

function addFinding(
  findings: BrowserFinding[],
  code: BrowserFindingCode,
  message: string,
  detail?: string
): void {
  const candidate = Object.freeze({
    code,
    message,
    ...(detail === undefined ? {} : { detail })
  });
  if (!findings.some((existing) =>
    existing.code === candidate.code && existing.detail === candidate.detail
  )) {
    findings.push(candidate);
  }
}

function isKnownBrowserEnvironmentWarning(text: string): boolean {
  return /GL Driver Message.*GPU stall due to ReadPixels|^WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost$/iu.test(text);
}

export async function startExactArtifactServer(bytes: Uint8Array): Promise<ExactArtifactServer> {
  const body = Buffer.from(bytes);
  let servedRequests = 0;
  const server = createServer((request, response) => {
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    if (requestUrl.pathname !== "/index.html" || (method !== "GET" && method !== "HEAD")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    servedRequests += 1;
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-length": String(body.byteLength),
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff"
    });
    response.end(method === "HEAD" ? undefined : body);
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Exact artifact server did not receive a TCP address.");
  }
  return Object.freeze({
    url: `http://127.0.0.1:${address.port}/index.html`,
    servedRequestCount: () => servedRequests,
    close: () => new Promise<void>((resolvePromise, reject) => {
      server.close((error) => error === undefined ? resolvePromise() : reject(error));
    })
  });
}

async function closeQuietly(page: Page | undefined, context: BrowserContext | undefined, browser: Browser | undefined): Promise<void> {
  await page?.close().catch(() => undefined);
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
}

function emptyReport(
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest,
  channel: "chrome" | "chromium",
  profile: BrowserViewportProfile,
  findings: readonly BrowserFinding[]
): BrowserSmokeReport {
  const sorted = sortFindings(findings);
  return Object.freeze({
    schema: "sfhs.browser-smoke@1",
    valid: false,
    artifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      buildId: descriptor.artifact.buildId
    }),
    browser: Object.freeze({ channel, version: "unavailable", userAgent: "unavailable", profile }),
    runtime: Object.freeze({ phase: "not-run", selfCheckPass: false }),
    requests: Object.freeze([]),
    console: Object.freeze([]),
    findings: sorted
  });
}

export async function runExactArtifactBrowserSmoke(
  bytes: Uint8Array,
  descriptor: SfhsArtifactManifest,
  options: BrowserSmokeOptions = {}
): Promise<BrowserSmokeReport> {
  const channel = options.browserChannel ?? "chromium";
  const profile = Object.freeze({ ...(options.viewport ?? desktopProfile) });
  const timeoutMs = options.timeoutMs ?? 20_000;
  const findings: BrowserFinding[] = [];
  const staticVerification = verifyArtifactBytes(bytes, descriptor);
  if (!staticVerification.valid) {
    addFinding(
      findings,
      "SFHS_BROWSER_STATIC_VERIFICATION_FAILED",
      "Exact artifact failed static verification before browser launch.",
      staticVerification.findings.map((entry) => entry.code).join(",")
    );
    return emptyReport(bytes, descriptor, channel, profile, findings);
  }

  const server = await startExactArtifactServer(bytes);
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  const requests: BrowserRequestRecord[] = [];
  const consoleRecords: BrowserConsoleRecord[] = [];
  let browserVersion = "unavailable";
  let userAgent = "unavailable";
  let phase = "not-run";
  let selfCheckPass = false;
  let snapshot: unknown;
  let auditActive = true;

  try {
    try {
      browser = await chromium.launch({
        headless: options.headless ?? true,
        ...(options.browserLaunchArgs === undefined ? {} : { args: [...options.browserLaunchArgs] }),
        ...(channel === "chrome" ? { channel: "chrome" as const } : {})
      });
      browserVersion = browser.version();
    } catch (error) {
      addFinding(
        findings,
        "SFHS_BROWSER_LAUNCH_FAILED",
        "Chromium could not be launched.",
        error instanceof Error ? error.message : "Unknown launch failure."
      );
      return emptyReport(bytes, descriptor, channel, profile, findings);
    }

    context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: profile.isMobile ?? false,
      hasTouch: profile.hasTouch ?? false,
      serviceWorkers: "block"
    });
    page = await context.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.on("request", (request) => {
      requests.push(Object.freeze({
        method: request.method(),
        resourceType: request.resourceType(),
        url: request.url()
      }));
    });
    page.on("console", (message) => {
      if (!auditActive) {
        return;
      }
      const record = Object.freeze({ type: message.type(), text: message.text() });
      consoleRecords.push(record);
      if (message.type() === "error") {
        addFinding(findings, "SFHS_BROWSER_CONSOLE_ERROR", "Browser console error.", message.text());
      } else if (message.type() === "warning" && !isKnownBrowserEnvironmentWarning(message.text())) {
        addFinding(findings, "SFHS_BROWSER_CONSOLE_WARNING", "Browser console warning.", message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (auditActive) {
        addFinding(findings, "SFHS_BROWSER_PAGE_ERROR", "Uncaught page error.", error.message);
      }
    });
    page.on("dialog", (dialog) => {
      if (auditActive) {
        addFinding(findings, "SFHS_BROWSER_DIALOG", "Unexpected browser dialog.", dialog.message());
      }
      void dialog.dismiss();
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        addFinding(
          findings,
          "SFHS_BROWSER_RESPONSE_ERROR",
          `Browser response returned HTTP ${response.status()}.`,
          response.url()
        );
      }
    });
    page.on("websocket", (socket) => {
      addFinding(findings, "SFHS_BROWSER_UNEXPECTED_REQUEST", "Unexpected WebSocket connection.", socket.url());
    });
    context.on("serviceworker", (worker) => {
      addFinding(findings, "SFHS_BROWSER_UNEXPECTED_REQUEST", "Unexpected service worker.", worker.url());
    });
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (url === server.url) {
        await route.continue();
        return;
      }
      if (/^(?:about:blank|blob:|data:)/iu.test(url)) {
        await route.continue();
        return;
      }
      addFinding(findings, "SFHS_BROWSER_UNEXPECTED_REQUEST", "Unexpected runtime request was blocked.", url);
      await route.abort("blockedbyclient");
    });

    let navigationResponse;
    try {
      navigationResponse = await page.goto(server.url, { waitUntil: "load", timeout: timeoutMs });
    } catch (error) {
      addFinding(
        findings,
        "SFHS_BROWSER_NAVIGATION_FAILED",
        "Exact artifact navigation failed.",
        error instanceof Error ? error.message : "Unknown navigation failure."
      );
    }
    if (navigationResponse !== null && navigationResponse !== undefined) {
      const responseBytes = new Uint8Array(await navigationResponse.body());
      if (sha256Bytes(responseBytes) !== descriptor.artifact.sha256) {
        addFinding(
          findings,
          "SFHS_BROWSER_EXACT_BYTES_MISMATCH",
          "Browser response bytes do not match the verified artifact SHA-256."
        );
      }
    }

    userAgent = await page.evaluate(() => navigator.userAgent);
    phase = await page.locator("#fixture-shell").getAttribute("data-phase") ?? "missing";
    if (phase === "unsupported") {
      addFinding(findings, "SFHS_BROWSER_WEBGL_UNSUPPORTED", "Browser did not provide the required WebGL capability.");
    } else {
      await page.locator("#fixture-start").click();
      await page.waitForFunction(() => {
        const value = document.querySelector<HTMLElement>("#fixture-shell")?.dataset.phase;
        return value === "running" || value === "unsupported" || value === "failed";
      }, undefined, { timeout: timeoutMs });
      phase = await page.locator("#fixture-shell").getAttribute("data-phase") ?? "missing";
      if (phase === "unsupported") {
        addFinding(findings, "SFHS_BROWSER_WEBGL_UNSUPPORTED", "Browser did not provide the required WebGL capability.");
      } else if (phase !== "running") {
        addFinding(findings, "SFHS_BROWSER_RUNTIME_FAILED", "Fixture did not enter the running phase.", phase);
      } else {
        await page.waitForFunction(() => {
          const candidate = window as unknown as { CR?: { getSnapshot(): { ticks: number } } };
          return (candidate.CR?.getSnapshot().ticks ?? 0) >= 5;
        });
        const selfCheck = await page.evaluate(async () => {
          const candidate = window as unknown as {
            CR: {
              getSnapshot(): unknown;
              runFullSelfCheck(): Promise<{ pass: boolean; snapshot: unknown }>;
            };
          };
          const result = await candidate.CR.runFullSelfCheck();
          return { pass: result.pass, snapshot: result.snapshot ?? candidate.CR.getSnapshot() };
        });
        selfCheckPass = selfCheck.pass;
        snapshot = selfCheck.snapshot;
        if (!selfCheckPass) {
          addFinding(findings, "SFHS_BROWSER_SELF_CHECK_FAILED", "Runtime self-check returned false.");
        }
      }
    }

    if (options.screenshotPath !== undefined) {
      await mkdir(dirname(options.screenshotPath), { recursive: true });
      await page.screenshot({ path: options.screenshotPath, fullPage: true });
    }
  } catch (error) {
    addFinding(
      findings,
      "SFHS_BROWSER_RUNTIME_FAILED",
      "Browser scenario did not complete.",
      error instanceof Error ? error.message : "Unknown scenario failure."
    );
  } finally {
    auditActive = false;
    await closeQuietly(page, context, browser);
    await server.close();
  }

  if (server.servedRequestCount() !== 1) {
    addFinding(
      findings,
      "SFHS_BROWSER_UNEXPECTED_REQUEST",
      "Exact artifact server did not serve exactly one document request.",
      String(server.servedRequestCount())
    );
  }
  const sorted = sortFindings(findings);
  return Object.freeze({
    schema: "sfhs.browser-smoke@1",
    valid: sorted.length === 0 && phase === "running" && selfCheckPass,
    artifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      buildId: descriptor.artifact.buildId
    }),
    browser: Object.freeze({ channel, version: browserVersion, userAgent, profile }),
    runtime: Object.freeze({
      phase,
      selfCheckPass,
      ...(snapshot === undefined ? {} : { snapshot })
    }),
    requests: Object.freeze(requests),
    console: Object.freeze(consoleRecords),
    findings: sorted
  });
}

export {
  runPixiArtifactScenarios,
  samsungGalaxyS21UltraProfiles,
  type PixiScenarioId,
  type PixiScenarioOptions,
  type PixiScenarioReport,
  type PixiScenarioResult,
  type PixiScreenshotRecord
} from "./pixi-scenarios.ts";
