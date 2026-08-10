import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { chromium, type Browser } from "playwright";
import { describe, expect, it } from "vitest";

import { startExactArtifactServer } from "./exact-artifact-server.ts";
import {
  runHtmlArtifactBrowserSmoke,
  type HtmlArtifactBrowserSmokeDependencies,
  type HtmlArtifactBrowserSmokeOptions
} from "./html-artifact-smoke.ts";

const fixturePath = fileURLToPath(new URL("../../../fixtures/html-artifact/producer-neutral.html", import.meta.url));
const encode = (source: string): Uint8Array => new TextEncoder().encode(source);

async function smoke(
  source: string,
  options: HtmlArtifactBrowserSmokeOptions = {},
  dependencies: HtmlArtifactBrowserSmokeDependencies = {}
) {
  return runHtmlArtifactBrowserSmoke(encode(source), { timeoutMs: 2_000, ...options }, dependencies);
}

async function startRuntimeServer(
  source: string,
  contentType = "text/javascript; charset=utf-8",
  status = 200
) {
  let closed = false;
  const server = createServer((_request, response) => {
    response.writeHead(status, { "content-type": contentType });
    response.end(source);
  });
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolvePromise());
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("Missing runtime server address.");
  return {
    url: `http://127.0.0.1:${address.port}/runtime.js`,
    get closed() { return closed; },
    close: () => new Promise<void>((resolvePromise, reject) => {
      server.close((error) => {
        if (error === undefined) {
          closed = true;
          resolvePromise();
        } else {
          reject(error);
        }
      });
    })
  };
}

describe("producer-neutral HTML artifact browser smoke", () => {
  it("loads the neutral fixture without fixture protocol or product globals and executes both scripts", async () => {
    const bytes = new Uint8Array(await readFile(fixturePath));
    const source = new TextDecoder().decode(bytes);
    expect(source).not.toContain("#fixture-shell");
    expect(source).not.toContain("window.CR");

    const report = await runHtmlArtifactBrowserSmoke(bytes, { readySelector: "#artifact-ready" });

    expect(report.valid, JSON.stringify(report.findings)).toBe(true);
    expect(report.browser.readyState).toBe("complete");
    expect(report.browser.readySelectorMatched).toBe(true);
    expect(report.pageErrors).toEqual([]);
    expect(report.requests).toEqual([
      expect.objectContaining({ url: "sfhs://html-artifact", allowed: true, resourceType: "document" })
    ]);
  }, 15_000);

  it("passes without a readiness selector", async () => {
    const report = await smoke("<!doctype html><title>plain</title><p>loaded</p>");
    expect(report.valid, JSON.stringify(report.findings)).toBe(true);
    expect(report.browser.readySelectorRequested).toBeNull();
    expect(report.browser.readySelectorMatched).toBe(true);
  }, 15_000);

  it("fails a missing readiness selector with a stable finding", async () => {
    const report = await smoke("<!doctype html><title>missing</title>", {
      readySelector: "#never-ready",
      timeoutMs: 150
    });
    expect(report.valid).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "SFHS_HTML_ARTIFACT_BROWSER_READY_SELECTOR_MISSING"
    );
  }, 15_000);

  it("fails an uncaught page error", async () => {
    const report = await smoke('<!doctype html><script>setTimeout(() => { throw new Error("boom"); }, 0)</script>');
    expect(report.valid).toBe(false);
    expect(report.pageErrors).toEqual(["boom"]);
    expect(report.findings.map((finding) => finding.code)).toContain("SFHS_HTML_ARTIFACT_BROWSER_PAGE_ERROR");
  }, 15_000);

  it("fails console.error", async () => {
    const report = await smoke('<!doctype html><script>console.error("bad news")</script>');
    expect(report.valid).toBe(false);
    expect(report.console).toContainEqual({ type: "error", text: "bad news", severity: "error" });
    expect(report.findings.map((finding) => finding.code)).toContain("SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_ERROR");
  }, 15_000);

  it("records console.warn without failing solely for the warning", async () => {
    const report = await smoke('<!doctype html><script>console.warn("heads up")</script>');
    expect(report.valid, JSON.stringify(report.findings)).toBe(true);
    expect(report.console).toContainEqual({ type: "warning", text: "heads up", severity: "warning" });
    expect(report.findings).toContainEqual(expect.objectContaining({
      code: "SFHS_HTML_ARTIFACT_BROWSER_CONSOLE_WARNING",
      severity: "warning"
    }));
  }, 15_000);

  it("records and rejects an unexpected dialog", async () => {
    const report = await smoke('<!doctype html><script>alert("stop")</script>');
    expect(report.valid).toBe(false);
    expect(report.dialogs).toEqual([{ type: "alert", message: "stop" }]);
    expect(report.findings.map((finding) => finding.code)).toContain("SFHS_HTML_ARTIFACT_BROWSER_DIALOG");
  }, 15_000);

  it("blocks an unexpected local resource request missed by literal static analysis", async () => {
    const report = await smoke('<!doctype html><script>const image = new Image(); image.src = [".", "missing.png"].join("/");</script>');
    expect(report.valid).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain("SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST");
    expect(report.requests).toContainEqual(expect.objectContaining({ allowed: false, resourceType: "image" }));
  }, 15_000);

  it("blocks an undeclared external request", async () => {
    const report = await smoke('<!doctype html><script>fetch(["https://undeclared.example", "data"].join("/"));</script>');
    expect(report.valid).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain("SFHS_HTML_ARTIFACT_BROWSER_UNEXPECTED_REQUEST");
    expect(report.requests).toContainEqual(expect.objectContaining({
      url: "https://undeclared.example/data",
      allowed: false
    }));
  }, 15_000);

  it("permits an exact declared runtime URL", async () => {
    const runtime = await startRuntimeServer('document.body.dataset.runtime = "loaded";');
    try {
      const report = await smoke(`<!doctype html><body><script src="${runtime.url}"></script></body>`, {
        allowedRuntimeUrls: [runtime.url]
      });
      expect(report.valid, JSON.stringify(report.findings)).toBe(true);
      expect(report.requests).toContainEqual(expect.objectContaining({ url: runtime.url, allowed: true }));
      expect(report.responseFailures).toEqual([]);
    } finally {
      await runtime.close();
    }
    expect(runtime.closed).toBe(true);
  }, 15_000);

  it("records and rejects a failing permitted response", async () => {
    const runtime = await startRuntimeServer("failure", "text/plain; charset=utf-8", 503);
    try {
      const report = await smoke(`<!doctype html><img alt="required" src="${runtime.url}">`, {
        allowedRuntimeUrls: [runtime.url]
      });
      expect(report.valid).toBe(false);
      expect(report.responseFailures).toContainEqual(expect.objectContaining({
        url: runtime.url,
        required: true,
        status: 503
      }));
      expect(report.findings.map((finding) => finding.code)).toContain(
        "SFHS_HTML_ARTIFACT_BROWSER_RESPONSE_FAILED"
      );
    } finally {
      await runtime.close();
    }
  }, 15_000);

  it("permits data and blob resources", async () => {
    const report = await smoke(`<!doctype html><body>
      <img alt="data" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
      <script>
        const image = new Image();
        image.onload = () => { const ready = document.createElement("p"); ready.id = "blob-ready"; document.body.append(ready); };
        image.src = URL.createObjectURL(new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"] , { type: "image/svg+xml" }));
      </script>
    </body>`, { readySelector: "#blob-ready" });
    expect(report.valid, JSON.stringify(report.findings)).toBe(true);
    expect(report.requests.every((request) => request.allowed)).toBe(true);
  }, 15_000);

  it("detects a browser response-byte SHA mismatch", async () => {
    const original = "<!doctype html><title>original</title>";
    const changed = encode("<!doctype html><title>changed</title>");
    const report = await smoke(original, {}, {
      startServer: async () => startExactArtifactServer(changed)
    });
    expect(report.valid).toBe(false);
    expect(report.htmlArtifact.responseBytesMatch).toBe(false);
    expect(report.findings.map((finding) => finding.code)).toContain(
      "SFHS_HTML_ARTIFACT_BROWSER_EXACT_BYTES_MISMATCH"
    );
  }, 15_000);

  it("closes browser and server resources after failure", async () => {
    let capturedBrowser: Browser | undefined;
    let serverClosed = false;
    const report = await smoke("<!doctype html><title>cleanup</title>", {
      readySelector: "#missing",
      timeoutMs: 150
    }, {
      startServer: async (bytes) => {
        const server = await startExactArtifactServer(bytes);
        return {
          ...server,
          close: async () => {
            await server.close();
            serverClosed = true;
          }
        };
      },
      launchBrowser: async (options) => {
        capturedBrowser = await chromium.launch({
          headless: options.headless,
          ...(options.channel === "chrome" ? { channel: "chrome" as const } : {}),
          ...(options.browserLaunchArgs.length === 0 ? {} : { args: [...options.browserLaunchArgs] })
        });
        return capturedBrowser;
      }
    });

    expect(report.valid).toBe(false);
    expect(serverClosed).toBe(true);
    expect(capturedBrowser?.isConnected()).toBe(false);
  }, 15_000);
});
