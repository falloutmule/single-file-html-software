import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page
} from "playwright";

import { sha256Bytes } from "@sfhs/core";
import { verifyHtmlArtifactBytes } from "@sfhs/verifier";

import {
  startExactArtifactServer,
  type ExactArtifactServer
} from "./exact-artifact-server.ts";

export type HtmlArtifactBrowserSmokeFindingCode =
  | "SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_ERROR"
  | "SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_WARNING"
  | "SFHS_HTML_ARTIFACT_BROWSER_DIALOG"
  | "SFHS_HTML_ARTIFACT_BROWSER_EXACT_BYTES_MISMATCH"
  | "SFHS_HTML_ARTIFACT_BROWSER_LAUNCH_FAILED"
  | "SFHS_HTML_ARTIFACT_BROWSER_NAVIGATION_FAILED"
  | "SFHS_HTML_ARTIFACT_BROWSER_PAGE_ERROR"
  | "SFHS_HTML_ARTIFACT_BROWSER_READY_SELECTOR_MISSING"
  | "SFHS_HTML_ARTIFACT_BROWSER_READY_STATE_INCOMPLETE"
  | "SFHS_HTML_ARTIFACT_BROWSER_RESPONSE_FAILED"
  | "SFHS_HTML_ARTIFACT_BROWSER_SERVER_FAILED"
  | "SFHS_HTML_ARTIFACT_BROWSER_STATIC_VERIFICATION_FAILED"
  | "SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST";

export interface HtmlArtifactBrowserSmokeFinding {
  readonly code: HtmlArtifactBrowserSmokeFindingCode;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly detail?: string;
}

export interface HtmlArtifactBrowserRequestRecord {
  readonly method: string;
  readonly resourceType: string;
  readonly url: string;
  readonly allowed: boolean;
}

export interface HtmlArtifactBrowserConsoleRecord {
  readonly type: string;
  readonly text: string;
  readonly severity: "error" | "warning" | "info";
}

export interface HtmlArtifactBrowserDialogRecord {
  readonly type: string;
  readonly message: string;
}

export interface HtmlArtifactBrowserResponseFailureRecord {
  readonly url: string;
  readonly required: boolean;
  readonly errorText?: string;
  readonly status?: number;
}

export interface HtmlArtifactBrowserSmokeOptions {
  readonly allowedRuntimeUrls?: readonly string[];
  readonly readySelector?: string;
  readonly browserChannel?: "chrome" | "chromium";
  readonly browserLaunchArgs?: readonly string[];
  readonly headless?: boolean;
  readonly timeoutMs?: number;
  readonly screenshotPath?: string;
}

export interface HtmlArtifactBrowserSmokeReport {
  readonly schema: "sfhs.html-artifact-browser-smoke@1";
  readonly valid: boolean;
  readonly htmlArtifact: {
    readonly bytes: number;
    readonly sha256: string;
    readonly allowedRuntimeUrls: readonly string[];
    readonly responseSha256: string | null;
    readonly responseBytesMatch: boolean;
  };
  readonly browser: {
    readonly channel: "chrome" | "chromium";
    readonly version: string;
    readonly userAgent: string;
    readonly title: string;
    readonly readyState: string;
    readonly readySelectorRequested: string | null;
    readonly readySelectorMatched: boolean;
  };
  readonly requests: readonly HtmlArtifactBrowserRequestRecord[];
  readonly console: readonly HtmlArtifactBrowserConsoleRecord[];
  readonly pageErrors: readonly string[];
  readonly dialogs: readonly HtmlArtifactBrowserDialogRecord[];
  readonly responseFailures: readonly HtmlArtifactBrowserResponseFailureRecord[];
  readonly findings: readonly HtmlArtifactBrowserSmokeFinding[];
}

/** Test seams for proving response integrity and transactional cleanup. */
export interface HtmlArtifactBrowserSmokeDependencies {
  readonly startServer?: (bytes: Uint8Array) => Promise<ExactArtifactServer>;
  readonly launchBrowser?: (options: {
    readonly channel: "chrome" | "chromium";
    readonly headless: boolean;
    readonly browserLaunchArgs: readonly string[];
  }) => Promise<Browser>;
  readonly settleMs?: number;
}

function normalizedRuntimeUrls(values: readonly string[] | undefined): readonly string[] {
  return Object.freeze([...new Set(values ?? [])].sort((left, right) => left.localeCompare(right)));
}

function sortFindings(
  findings: readonly HtmlArtifactBrowserSmokeFinding[]
): readonly HtmlArtifactBrowserSmokeFinding[] {
  return Object.freeze([...findings].sort((left, right) => {
    const byCode = left.code.localeCompare(right.code);
    if (byCode !== 0) return byCode;
    const bySeverity = left.severity.localeCompare(right.severity);
    return bySeverity === 0
      ? (left.detail ?? "").localeCompare(right.detail ?? "")
      : bySeverity;
  }));
}

function addFinding(
  findings: HtmlArtifactBrowserSmokeFinding[],
  code: HtmlArtifactBrowserSmokeFindingCode,
  severity: "error" | "warning",
  message: string,
  detail?: string
): void {
  const candidate = Object.freeze({
    code,
    severity,
    message,
    ...(detail === undefined ? {} : { detail })
  });
  if (!findings.some((existing) =>
    existing.code === candidate.code &&
    existing.severity === candidate.severity &&
    existing.detail === candidate.detail
  )) {
    findings.push(candidate);
  }
}

function isAllowedUrl(url: string, documentUrl: string, allowedRuntimeUrls: ReadonlySet<string>): boolean {
  return url === documentUrl ||
    allowedRuntimeUrls.has(url) ||
    /^(?:about:blank|blob:|data:)/iu.test(url);
}

function reportUrl(url: string, documentUrl: string): string {
  return url === documentUrl ? "sfhs://html-artifact" : url;
}

async function closeQuietly(
  page: Page | undefined,
  context: BrowserContext | undefined,
  browser: Browser | undefined,
  server: ExactArtifactServer | undefined
): Promise<void> {
  await page?.close().catch(() => undefined);
  await context?.close().catch(() => undefined);
  await browser?.close().catch(() => undefined);
  await server?.close().catch(() => undefined);
}

function unavailableReport(
  bytes: Uint8Array,
  allowedRuntimeUrls: readonly string[],
  channel: "chrome" | "chromium",
  readySelector: string | undefined,
  findings: readonly HtmlArtifactBrowserSmokeFinding[]
): HtmlArtifactBrowserSmokeReport {
  return Object.freeze({
    schema: "sfhs.html-artifact-browser-smoke@1",
    valid: false,
    htmlArtifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: sha256Bytes(bytes),
      allowedRuntimeUrls,
      responseSha256: null,
      responseBytesMatch: false
    }),
    browser: Object.freeze({
      channel,
      version: "unavailable",
      userAgent: "unavailable",
      title: "",
      readyState: "unavailable",
      readySelectorRequested: readySelector ?? null,
      readySelectorMatched: false
    }),
    requests: Object.freeze([]),
    console: Object.freeze([]),
    pageErrors: Object.freeze([]),
    dialogs: Object.freeze([]),
    responseFailures: Object.freeze([]),
    findings: sortFindings(findings)
  });
}

export async function runHtmlArtifactBrowserSmoke(
  bytes: Uint8Array,
  options: HtmlArtifactBrowserSmokeOptions = {},
  dependencies: HtmlArtifactBrowserSmokeDependencies = {}
): Promise<HtmlArtifactBrowserSmokeReport> {
  const allowedRuntimeUrls = normalizedRuntimeUrls(options.allowedRuntimeUrls);
  const allowedRuntimeUrlSet = new Set(allowedRuntimeUrls);
  const channel = options.browserChannel ?? "chromium";
  const timeoutMs = options.timeoutMs ?? 20_000;
  const findings: HtmlArtifactBrowserSmokeFinding[] = [];
  const staticVerification = verifyHtmlArtifactBytes(bytes, { allowedRuntimeUrls });
  if (!staticVerification.valid) {
    addFinding(
      findings,
      "SFHS_HTML_ARTIFACT_BROWSER_STATIC_VERIFICATION_FAILED",
      "error",
      "HTML artifact failed producer-neutral static verification before browser launch.",
      staticVerification.findings.map((finding) => finding.code).join(",")
    );
    return unavailableReport(bytes, allowedRuntimeUrls, channel, options.readySelector, findings);
  }

  let server: ExactArtifactServer | undefined;
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  let page: Page | undefined;
  const requests: HtmlArtifactBrowserRequestRecord[] = [];
  const consoleRecords: HtmlArtifactBrowserConsoleRecord[] = [];
  const pageErrors: string[] = [];
  const dialogs: HtmlArtifactBrowserDialogRecord[] = [];
  const responseFailures: HtmlArtifactBrowserResponseFailureRecord[] = [];
  let browserVersion = "unavailable";
  let userAgent = "unavailable";
  let title = "";
  let readyState = "unavailable";
  let readySelectorMatched = options.readySelector === undefined;
  let responseSha256: string | null = null;
  let responseBytesMatch = false;
  let documentUrl = "";
  let auditActive = true;

  try {
    try {
      server = await (dependencies.startServer ?? startExactArtifactServer)(bytes);
      documentUrl = server.url;
    } catch (error) {
      addFinding(
        findings,
        "SFHS_HTML_ARTIFACT_BROWSER_SERVER_FAILED",
        "error",
        "The exact-byte loopback server could not start.",
        error instanceof Error ? error.message : "Unknown server failure."
      );
      return unavailableReport(bytes, allowedRuntimeUrls, channel, options.readySelector, findings);
    }

    try {
      browser = dependencies.launchBrowser === undefined
        ? await chromium.launch({
            headless: options.headless ?? true,
            ...(options.browserLaunchArgs === undefined ? {} : { args: [...options.browserLaunchArgs] }),
            ...(channel === "chrome" ? { channel: "chrome" as const } : {})
          })
        : await dependencies.launchBrowser({
            channel,
            headless: options.headless ?? true,
            browserLaunchArgs: options.browserLaunchArgs ?? []
          });
      browserVersion = browser.version();
    } catch (error) {
      addFinding(
        findings,
        "SFHS_HTML_ARTIFACT_BROWSER_LAUNCH_FAILED",
        "error",
        "Chromium could not be launched.",
        error instanceof Error ? error.message : "Unknown launch failure."
      );
    }

    if (browser !== undefined) {
      context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        serviceWorkers: "block"
      });
      page = await context.newPage();
      page.setDefaultTimeout(timeoutMs);

      page.on("request", (request) => {
        const url = request.url();
        requests.push(Object.freeze({
          method: request.method(),
          resourceType: request.resourceType(),
          url: reportUrl(url, documentUrl),
          allowed: isAllowedUrl(url, documentUrl, allowedRuntimeUrlSet)
        }));
      });
      page.on("console", (message) => {
        if (!auditActive) return;
        const severity = message.type() === "error"
          ? "error" as const
          : message.type() === "warning"
            ? "warning" as const
            : "info" as const;
        consoleRecords.push(Object.freeze({ type: message.type(), text: message.text(), severity }));
        if (severity === "error") {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_ERROR",
            "error",
            "Browser console error.",
            message.text()
          );
        } else if (severity === "warning") {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_WARNING",
            "warning",
            "Browser console warning.",
            message.text()
          );
        }
      });
      page.on("pageerror", (error) => {
        if (!auditActive) return;
        pageErrors.push(error.message);
        addFinding(
          findings,
          "SFHS_HTML_ARTIFACT_BROWSER_PAGE_ERROR",
          "error",
          "Uncaught page error.",
          error.message
        );
      });
      page.on("dialog", (dialog) => {
        if (auditActive) {
          dialogs.push(Object.freeze({ type: dialog.type(), message: dialog.message() }));
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_DIALOG",
            "error",
            "Unexpected browser dialog.",
            dialog.message()
          );
        }
        void dialog.dismiss();
      });
      page.on("requestfailed", (request) => {
        if (!auditActive) return;
        const url = request.url();
        const required = isAllowedUrl(url, documentUrl, allowedRuntimeUrlSet);
        const errorText = request.failure()?.errorText;
        responseFailures.push(Object.freeze({
          url: reportUrl(url, documentUrl),
          required,
          ...(errorText === undefined ? {} : { errorText })
        }));
        if (required) {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_RESPONSE_FAILED",
            "error",
            "A permitted runtime response failed.",
            reportUrl(url, documentUrl)
          );
        }
      });
      page.on("response", (response) => {
        if (!auditActive || response.status() < 400) return;
        const url = response.url();
        responseFailures.push(Object.freeze({
          url: reportUrl(url, documentUrl),
          required: true,
          status: response.status()
        }));
        addFinding(
          findings,
          "SFHS_HTML_ARTIFACT_BROWSER_RESPONSE_FAILED",
          "error",
          `A permitted runtime response returned HTTP ${response.status()}.`,
          reportUrl(url, documentUrl)
        );
      });
      page.on("websocket", (socket) => {
        if (!allowedRuntimeUrlSet.has(socket.url())) {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST",
            "error",
            "Unexpected WebSocket connection.",
            socket.url()
          );
        }
      });
      context.on("serviceworker", (worker) => {
        addFinding(
          findings,
          "SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST",
          "error",
          "Unexpected service worker.",
          worker.url()
        );
      });
      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (isAllowedUrl(url, documentUrl, allowedRuntimeUrlSet)) {
          await route.continue();
          return;
        }
        addFinding(
          findings,
          "SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST",
          "error",
          "Unexpected runtime request was blocked.",
          reportUrl(url, documentUrl)
        );
        await route.abort("blockedbyclient");
      });

      let navigationResponse;
      try {
        navigationResponse = await page.goto(documentUrl, { waitUntil: "load", timeout: timeoutMs });
      } catch (error) {
        addFinding(
          findings,
          "SFHS_HTML_ARTIFACT_BROWSER_NAVIGATION_FAILED",
          "error",
          "HTML artifact navigation failed.",
          error instanceof Error ? error.message : "Unknown navigation failure."
        );
      }

      if (navigationResponse !== null && navigationResponse !== undefined) {
        try {
          const responseBytes = new Uint8Array(await navigationResponse.body());
          responseSha256 = sha256Bytes(responseBytes);
          responseBytesMatch = responseSha256 === staticVerification.htmlArtifact.sha256;
          if (!responseBytesMatch) {
            addFinding(
              findings,
              "SFHS_HTML_ARTIFACT_BROWSER_EXACT_BYTES_MISMATCH",
              "error",
              "Browser response bytes do not match the input HTML artifact SHA-256."
            );
          }
        } catch (error) {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_RESPONSE_FAILED",
            "error",
            "The document response body could not be read.",
            error instanceof Error ? error.message : "Unknown response read failure."
          );
        }
      }

      if (navigationResponse !== null && navigationResponse !== undefined) {
        await page.waitForTimeout(Math.max(0, Math.min(dependencies.settleMs ?? 100, 1_000)));
        userAgent = await page.evaluate(() => navigator.userAgent);
        title = await page.title();
        readyState = await page.evaluate(() => document.readyState);
        if (readyState !== "complete") {
          addFinding(
            findings,
            "SFHS_HTML_ARTIFACT_BROWSER_READY_STATE_INCOMPLETE",
            "error",
            "The HTML artifact did not reach document.readyState complete.",
            readyState
          );
        }
        if (options.readySelector !== undefined) {
          try {
            await page.locator(options.readySelector).waitFor({ state: "attached", timeout: timeoutMs });
            readySelectorMatched = true;
          } catch {
            readySelectorMatched = false;
            addFinding(
              findings,
              "SFHS_HTML_ARTIFACT_BROWSER_READY_SELECTOR_MISSING",
              "error",
              "The requested readiness selector did not become attached before timeout.",
              options.readySelector
            );
          }
        }
        if (options.screenshotPath !== undefined) {
          await mkdir(dirname(options.screenshotPath), { recursive: true });
          await page.screenshot({ path: options.screenshotPath, fullPage: true });
        }
      }
    }
  } catch (error) {
    addFinding(
      findings,
      "SFHS_HTML_ARTIFACT_BROWSER_NAVIGATION_FAILED",
      "error",
      "HTML artifact browser verification did not complete.",
      error instanceof Error ? error.message : "Unknown browser failure."
    );
  } finally {
    auditActive = false;
    await closeQuietly(page, context, browser, server);
  }

  if (server !== undefined && server.servedRequestCount() !== 1) {
    addFinding(
      findings,
      "SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST",
      "error",
      "The exact-byte server did not serve exactly one document request.",
      String(server.servedRequestCount())
    );
  }

  const sortedFindings = sortFindings(findings);
  const valid = sortedFindings.every((finding) => finding.severity !== "error") &&
    responseBytesMatch &&
    readyState === "complete" &&
    readySelectorMatched;
  return Object.freeze({
    schema: "sfhs.html-artifact-browser-smoke@1",
    valid,
    htmlArtifact: Object.freeze({
      bytes: bytes.byteLength,
      sha256: staticVerification.htmlArtifact.sha256,
      allowedRuntimeUrls,
      responseSha256,
      responseBytesMatch
    }),
    browser: Object.freeze({
      channel,
      version: browserVersion,
      userAgent,
      title,
      readyState,
      readySelectorRequested: options.readySelector ?? null,
      readySelectorMatched
    }),
    requests: Object.freeze(requests),
    console: Object.freeze(consoleRecords),
    pageErrors: Object.freeze(pageErrors),
    dialogs: Object.freeze(dialogs),
    responseFailures: Object.freeze(responseFailures),
    findings: sortedFindings
  });
}
