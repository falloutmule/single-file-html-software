import { fileURLToPath } from "node:url";

import { buildProject } from "@sfhs/builder";
import { packIntermediate } from "@sfhs/packer";
import { describe, expect, it } from "vitest";

import {
  packageIdentity,
  runExactArtifactBrowserSmoke,
  startExactArtifactServer
} from "./index.ts";

const fixtureRoot = fileURLToPath(new URL("../../../examples/pixi-minimal/", import.meta.url));

describe("@sfhs/browser-runner", () => {
  it("exposes its workspace boundary", () => {
    expect(packageIdentity).toBe("@sfhs/browser-runner");
  });

  it("serves only the exact artifact path and bytes", async () => {
    const bytes = new Uint8Array(Buffer.from("<!doctype html><title>exact</title>", "utf8"));
    const server = await startExactArtifactServer(bytes);
    try {
      const response = await fetch(server.url);
      const missing = await fetch(new URL("/sidecar.js", server.url));

      expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(missing.status).toBe(404);
      expect(server.servedRequestCount()).toBe(1);
    } finally {
      await server.close();
    }
  });

  it("refuses browser launch when exact static verification fails", async () => {
    const artifact = packIntermediate(await buildProject(fixtureRoot));
    const descriptor = {
      ...artifact.descriptor,
      artifact: { ...artifact.descriptor.artifact, sha256: "0".repeat(64) }
    };

    const report = await runExactArtifactBrowserSmoke(artifact.bytes, descriptor);

    expect(report.valid).toBe(false);
    expect(report.browser.version).toBe("unavailable");
    expect(report.findings.map((finding) => finding.code)).toEqual([
      "SFHS_BROWSER_STATIC_VERIFICATION_FAILED"
    ]);
  });

  it.skipIf(process.env.SFHS_RUN_BROWSER_TESTS !== "1")(
    "executes the exact Pixi artifact in Chromium with a clean audit",
    async () => {
      const artifact = packIntermediate(await buildProject(fixtureRoot));

      const report = await runExactArtifactBrowserSmoke(artifact.bytes, artifact.descriptor, {
        browserChannel: process.env.SFHS_BROWSER_CHANNEL === "chrome" ? "chrome" : "chromium"
      });

      expect(report.valid, JSON.stringify(report.findings)).toBe(true);
      expect(report.artifact.sha256).toBe(artifact.descriptor.artifact.sha256);
      expect(report.runtime.phase).toBe("running");
      expect(report.requests).toHaveLength(1);
    },
    30_000
  );
});
